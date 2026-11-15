import asyncio
import base64
import json
import logging
import os
from typing import Dict, Any, Optional

from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat
from py_vapid import Vapid
import pywebpush

logger = logging.getLogger(__name__)

VAPID_FILE = os.path.abspath(os.path.join(os.path.dirname(__file__), ".vapid_keys.json"))
VAPID_CLAIMS_EMAIL = os.environ.get("VAPID_CLAIMS_EMAIL", "mailto:admin@postcraft.app")

_vapid_instance: Optional[Vapid] = None
_public_key_b64: Optional[str] = None
_active_reminders: Dict[str, asyncio.Task] = {}


def _load_or_create_vapid() -> tuple[Vapid, str]:
    global _vapid_instance, _public_key_b64
    if _vapid_instance is not None and _public_key_b64 is not None:
        return _vapid_instance, _public_key_b64

    # 1. Check environment variables
    env_priv = os.environ.get("VAPID_PRIVATE_KEY", "").strip()
    env_pub = os.environ.get("VAPID_PUBLIC_KEY", "").strip()

    if env_priv and env_pub:
        v = Vapid.from_pem(env_priv.encode("utf-8"))
        _vapid_instance = v
        _public_key_b64 = env_pub
        return _vapid_instance, _public_key_b64

    # 2. Check local key file
    if os.path.exists(VAPID_FILE):
        try:
            with open(VAPID_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                v = Vapid.from_pem(data["private_key"].encode("utf-8"))
                _vapid_instance = v
                _public_key_b64 = data["public_key"]
                logger.info("Loaded persistent VAPID keys from %s", VAPID_FILE)
                return _vapid_instance, _public_key_b64
        except Exception as e:
            logger.warning("Failed to load %s, regenerating keys: %s", VAPID_FILE, e)

    # 3. Generate new keypair and persist
    v = Vapid()
    v.generate_keys()
    raw_pub = v.public_key.public_bytes(Encoding.X962, PublicFormat.UncompressedPoint)
    b64_pub = base64.urlsafe_b64encode(raw_pub).rstrip(b"=").decode("utf-8")
    priv_pem = v.private_pem().decode("utf-8")

    try:
        with open(VAPID_FILE, "w", encoding="utf-8") as f:
            json.dump({"public_key": b64_pub, "private_key": priv_pem}, f, indent=2)
        logger.info("Saved new persistent VAPID keys to %s", VAPID_FILE)
    except Exception as e:
        logger.warning("Could not persist VAPID keys to disk: %s", e)

    _vapid_instance = v
    _public_key_b64 = b64_pub
    return _vapid_instance, _public_key_b64


def get_vapid_public_key() -> str:
    """Returns the base64url uncompressed public key (87 chars) for client pushManager.subscribe."""
    _, pub_key = _load_or_create_vapid()
    return pub_key


def send_web_push(subscription_info: Dict[str, Any], payload: Dict[str, Any]) -> bool:
    """
    Sends a Web Push notification to the browser subscription endpoint.
    Wakes up the mobile device (Android / iOS) even when app is closed or screen is off.
    """
    vapid, _ = _load_or_create_vapid()
    payload_json = json.dumps(payload)

    try:
        response = pywebpush.webpush(
            subscription_info=subscription_info,
            data=payload_json,
            vapid_private_key=vapid,
            vapid_claims={"sub": VAPID_CLAIMS_EMAIL},
            ttl=300,  # 5 minutes TTL
        )
        status_code = getattr(response, "status_code", 200)
        logger.info("Web push sent to endpoint, status: %s", status_code)
        return True
    except pywebpush.WebPushException as e:
        logger.error("WebPushException while delivering push: %s", e)
        # 410 Gone / 404 means subscription expired or user revoked permission
        return False
    except Exception as e:
        logger.exception("Unexpected error sending web push: %s", e)
        return False


async def schedule_delayed_push(
    reminder_id: str,
    subscription_info: Dict[str, Any],
    delay_seconds: int,
    payload: Dict[str, Any],
):
    """
    Background worker task that waits delay_seconds (e.g. 900s for 15 minutes)
    and then dispatches the push notification to wake up the sleeping mobile device.
    """
    # Cancel previous task for same reminder_id if still waiting
    if reminder_id in _active_reminders:
        old_task = _active_reminders[reminder_id]
        if not old_task.done():
            old_task.cancel()

    async def _runner():
        try:
            logger.info("Reminder %s armed: will wake device in %s seconds", reminder_id, delay_seconds)
            await asyncio.sleep(delay_seconds)
            logger.info("Reminder %s timer fired: sending push notification to device", reminder_id)
            # Run the synchronous pywebpush in a threadpool so event loop remains free
            loop = asyncio.get_running_loop()
            await loop.run_in_executor(None, send_web_push, subscription_info, payload)
        except asyncio.CancelledError:
            logger.info("Reminder %s was cancelled before firing", reminder_id)
        except Exception as e:
            logger.exception("Error in reminder runner %s: %s", reminder_id, e)
        finally:
            _active_reminders.pop(reminder_id, None)

    task = asyncio.create_task(_runner())
    _active_reminders[reminder_id] = task
    return task


def cancel_reminder(reminder_id: str):
    """Cancels a pending reminder task."""
    task = _active_reminders.pop(reminder_id, None)
    if task and not task.done():
        task.cancel()
        return True
    return False
