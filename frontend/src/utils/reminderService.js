// Postcraft 15-Minute Reminder & Notification Service
// Combines Client-Side Service Worker + Server-Side Web Push (FCM).
// Wakes up mobile devices even when the PWA is closed or screen is off!

import {
  getLastPostTime,
  getRemainingCooldownMs,
  isReminderArmed,
  disarmReminder,
  isReminderNotified,
  setReminderNotified,
  areNotificationsEnabled,
  COOLDOWN_DURATION_MS,
} from "./storage";

function getApiBaseUrl() {
  return (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Trigger physical phone vibration pattern if supported
 */
export function triggerVibration(pattern = [500, 200, 500, 200, 500]) {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(pattern);
    }
  } catch {
    // ignore
  }
}

/**
 * Check if Notifications API and Push API are supported
 */
export function isNotificationSupported() {
  return typeof window !== "undefined" && "Notification" in window;
}

export function isPushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

/**
 * Get current browser notification permission
 */
export function getNotificationPermission() {
  if (!isNotificationSupported()) return "unsupported";
  return Notification.permission; // 'granted', 'denied', or 'default'
}

/**
 * Request notification permission from user and automatically subscribe to Web Push
 */
export async function requestNotificationPermission() {
  if (!isNotificationSupported()) return "unsupported";
  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      // Pre-warm push subscription so server can wake up sleeping phone
      getOrRegisterPushSubscription().catch((e) =>
        console.warn("Background push pre-warm error:", e)
      );
    }
    return permission;
  } catch (err) {
    console.error("Error requesting notification permission:", err);
    return Notification.permission;
  }
}

/**
 * Gets or registers the browser's Web Push subscription with Google FCM
 */
export async function getOrRegisterPushSubscription() {
  if (!isPushSupported()) return null;

  try {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (sub) {
      return sub.toJSON();
    }

    // Fetch VAPID public key from backend
    const apiBase = getApiBaseUrl();
    const res = await fetch(`${apiBase}/api/notifications/vapid-public-key`);
    if (!res.ok) {
      throw new Error(`Failed to fetch VAPID key: ${res.status}`);
    }
    const data = await res.json();
    const publicKey = data.public_key;

    if (!publicKey) return null;

    const convertedKey = urlBase64ToUint8Array(publicKey);
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedKey,
    });

    return sub.toJSON();
  } catch (err) {
    console.warn("Could not register Web Push subscription:", err);
    return null;
  }
}

/**
 * Schedules server-side push notification for 15 minutes.
 * When the app is closed or phone screen is off, the backend sends a push to FCM,
 * which wakes up Android OS and rings the phone!
 */
export async function scheduleServerPushReminder({
  delaySeconds = 15 * 60,
  title = "⏰ Time for your next X post!",
  body = "Your 15-minute safety interval has passed. Tap to open Postcraft and post your next draft.",
  reminderId = "active_post_reminder",
} = {}) {
  try {
    const sub = await getOrRegisterPushSubscription();
    if (!sub || !sub.endpoint) {
      console.log("No push subscription available; relying on client-side timer.");
      return false;
    }

    const apiBase = getApiBaseUrl();
    const res = await fetch(`${apiBase}/api/reminders/schedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subscription: sub,
        delay_seconds: delaySeconds,
        title,
        body,
        reminder_id: reminderId,
      }),
    });

    if (res.ok) {
      console.log(
        `Server push scheduled in ${delaySeconds}s. Phone will wake and ring even if app is closed!`
      );
      return true;
    }
  } catch (err) {
    console.warn("Failed to schedule server push reminder:", err);
  }
  return false;
}

/**
 * Cancels pending server push reminder (e.g. if user clears drafts or posts earlier)
 */
export async function cancelServerPushReminder(reminderId = "active_post_reminder") {
  try {
    const apiBase = getApiBaseUrl();
    await fetch(`${apiBase}/api/reminders/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reminder_id: reminderId }),
    });
  } catch {
    // ignore
  }
}

/**
 * Sends an immediate server-side test push to verify the sleeping phone can be woken up
 */
export async function sendServerTestPush({
  title = "⏰ Postcraft Server Push Test!",
  body = "Server push verified! This will wake your phone and ring after 15 minutes even with screen off.",
} = {}) {
  try {
    const sub = await getOrRegisterPushSubscription();
    if (!sub || !sub.endpoint) {
      return false;
    }

    const apiBase = getApiBaseUrl();
    const res = await fetch(`${apiBase}/api/notifications/test`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subscription: sub,
        title,
        body,
      }),
    });

    return res.ok;
  } catch (err) {
    console.warn("Test push failed:", err);
    return false;
  }
}

/**
 * Delivers native system notification via Service Worker (Client-Side).
 * Rings native notification ringtone stream.
 */
export async function showPostReminderNotification({
  title = "⏰ Time for your next X post!",
  body = "Your 15-minute safety interval has passed. Tap to open Postcraft and post your next draft.",
  isTest = false,
} = {}) {
  triggerVibration([500, 200, 500, 200, 500]);

  if (!isNotificationSupported() || Notification.permission !== "granted") {
    return false;
  }

  const uniqueTag = isTest
    ? `postcraft-test-${Date.now()}`
    : `postcraft-reminder-${Date.now()}`;

  try {
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.ready;
      if (reg && reg.showNotification) {
        await reg.showNotification(title, {
          body,
          icon: "/favicon.png",
          badge: "/favicon-32x32.png",
          vibrate: [500, 200, 500, 200, 500],
          silent: false, // Forces native phone notification ringtone
          tag: uniqueTag,
          renotify: true,
          requireInteraction: true,
          data: { url: "/" },
        });
        return true;
      }
    }

    new Notification(title, {
      body,
      icon: "/favicon.png",
      badge: "/favicon-32x32.png",
      silent: false,
      tag: uniqueTag,
    });
    return true;
  } catch (err) {
    console.warn("Failed to display system notification:", err);
    return false;
  }
}

/**
 * STRICT CLIENT-SIDE REMINDER CHECK:
 * Fallback watcher that checks if 15 minutes elapsed while the app was kept in foreground.
 */
export async function checkAndTriggerReminder() {
  if (!isReminderArmed()) {
    return false;
  }

  const lastTime = getLastPostTime();
  if (!lastTime) {
    disarmReminder();
    return false;
  }

  const now = Date.now();
  const elapsed = now - lastTime;
  const remaining = COOLDOWN_DURATION_MS - elapsed;

  if (remaining > 0) {
    return false;
  }

  const maxLeniencyWindowMs = 3 * 60 * 1000;
  const isStale = elapsed - COOLDOWN_DURATION_MS > maxLeniencyWindowMs;

  disarmReminder();
  setReminderNotified(true);

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("postcraft:cooldown-complete", {
        detail: { lastPostTime: lastTime, isStale },
      })
    );
  }

  if (isStale) {
    return false;
  }

  if (areNotificationsEnabled()) {
    await showPostReminderNotification({
      title: "⏰ Time for your next X post!",
      body: "Your 15-minute safety interval has passed. Tap to open Postcraft and post your next draft.",
    });
  } else {
    triggerVibration([500, 200, 500, 200, 500]);
  }

  return true;
}

// Global background watcher initialization
let workerInstance = null;
let fallbackInterval = null;
let isInitialized = false;

export function initReminderService() {
  if (isInitialized || typeof window === "undefined") return;
  isInitialized = true;

  // Pre-subscribe push if permission is already granted
  if (isNotificationSupported() && Notification.permission === "granted") {
    getOrRegisterPushSubscription().catch((e) =>
      console.log("Push pre-registration:", e)
    );
  }

  try {
    if (window.Worker) {
      workerInstance = new Worker("/timerWorker.js");
      workerInstance.onmessage = () => {
        checkAndTriggerReminder();
      };
      workerInstance.postMessage("start");
    }
  } catch (err) {
    console.log("Dedicated timer worker not available, falling back to interval:", err);
  }

  fallbackInterval = setInterval(() => {
    checkAndTriggerReminder();
  }, 1000);

  if (typeof document !== "undefined") {
    const handleWake = () => {
      checkAndTriggerReminder();
    };

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        handleWake();
      }
    });

    window.addEventListener("focus", handleWake);
  }
}
