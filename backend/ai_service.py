import json
import logging
import os
import re
from typing import Optional
import requests

from dotenv import load_dotenv
from google import genai
from google.genai import types

from prompts import SYSTEM_PROMPT, build_user_prompt
from schemas import GenerateRequest, GenerateResponse

logger = logging.getLogger(__name__)


class AIConfigurationError(RuntimeError):
    """Raised when an AI provider is missing its API key."""


class AIRateLimitError(RuntimeError):
    """Raised when an AI provider rate limit or quota is exceeded."""


def _load_env():
    env_path = os.path.join(os.path.dirname(__file__), ".env")
    if os.path.exists(env_path):
        load_dotenv(dotenv_path=env_path)
    else:
        load_dotenv()


def _get_gemini_client(custom_api_key: Optional[str] = None) -> genai.Client:
    _load_env()
    api_key = (custom_api_key or os.getenv("GEMINI_API_KEY", "")).strip()

    if not api_key:
        raise AIConfigurationError(
            "No Gemini API key provided. Please enter your Gemini API key in the app Settings."
        )

    return genai.Client(
        api_key=api_key,
        http_options=types.HttpOptions(
            api_version="v1beta"
        )
    )


def _parse_response(response_text: str, provider_name: str = "AI") -> GenerateResponse:
    clean_text = response_text.strip()
    # Robustly strip potential markdown fences if present
    match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", clean_text)
    if match:
        clean_text = match.group(1).strip()

    try:
        response_data = json.loads(clean_text)
    except json.JSONDecodeError as error:
        raise ValueError(f"{provider_name} returned invalid JSON: {clean_text[:120]}") from error

    # In case the model returns an array directly: wrap into generated_posts dict
    if isinstance(response_data, list):
        response_data = {"generated_posts": response_data}
    elif isinstance(response_data, dict) and "generated_posts" not in response_data:
        # Check if keys like "posts" or "drafts" were used
        for alt_key in ["posts", "drafts", "items", "results"]:
            if alt_key in response_data and isinstance(response_data[alt_key], list):
                response_data = {"generated_posts": response_data[alt_key]}
                break

    return GenerateResponse.model_validate(response_data)


def _generate_with_groq(request: GenerateRequest) -> GenerateResponse:
    """Generate drafts using Groq API (supports user-supplied key or server key)."""
    _load_env()
    api_key = (request.api_key or os.getenv("GROQ_API_KEY", "")).strip()

    if not api_key:
        raise AIConfigurationError(
            "No Groq API key found. Please insert your free Groq API key in the 'API Key' tab on the website (get one in 30 seconds at https://console.groq.com/keys)."
        )

    model = os.getenv("GROQ_MODEL", "qwen/qwen3.8-27b")
    url = "https://api.groq.com/openai/v1/chat/completions"

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    groq_system_prompt = (
        SYSTEM_PROMPT
        + '\nCRITICAL JSON FORMAT & LENGTH: Return strictly a valid JSON object with the root key "generated_posts". '
        'Every post content MUST be between 250 and 279 characters in total (including spaces and hashtags): '
        '{"generated_posts": [{"content": "richly detailed post with required hashtags (strictly 250 to 279 chars)", "based_on": ["Sample 1"], "verification_status": "verified"|"needs_review"}]}'
    )

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": groq_system_prompt},
            {"role": "user", "content": build_user_prompt(request)},
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.7,
        "max_tokens": 2048,
    }

    try:
        response = requests.post(url, headers=headers, json=payload, timeout=45)
    except requests.RequestException as e:
        raise RuntimeError(f"Could not connect to Groq API: {str(e)}") from e

    if response.status_code == 429:
        raise AIRateLimitError("Groq rate limit exceeded (429). Please wait a moment or try another key.")

    if response.status_code == 401:
        raise AIConfigurationError("Invalid Groq API key. Please check your key in the app Settings.")

    if response.status_code != 200:
        error_msg = response.text
        try:
            error_data = response.json()
            error_msg = error_data.get("error", {}).get("message", response.text)
        except Exception:
            pass
        raise RuntimeError(f"Groq API error ({response.status_code}): {error_msg}")

    try:
        data = response.json()
        content_text = data["choices"][0]["message"]["content"]
    except (KeyError, IndexError, json.JSONDecodeError) as e:
        raise ValueError(f"Malformed response from Groq: {response.text[:150]}") from e

    return _parse_response(content_text, provider_name="Groq")


def _generate_with_gemini(request: GenerateRequest) -> GenerateResponse:
    """Generate drafts using Google Gemini SDK (supports user-supplied key or server key)."""
    _load_env()
    client = _get_gemini_client(request.api_key)
    model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

    config = types.GenerateContentConfig(
        system_instruction=SYSTEM_PROMPT,
        response_mime_type="application/json",
        response_schema=GenerateResponse,
    )

    try:
        response = client.models.generate_content(
            model=model,
            contents=build_user_prompt(request),
            config=config,
        )
    except Exception as e:
        error_str = str(e).lower()
        if "429" in error_str or "quota" in error_str or "resource_exhausted" in error_str:
            raise AIRateLimitError(f"Gemini quota/rate limit exceeded: {str(e)}") from e
        raise

    if not response.text:
        raise ValueError("Gemini returned an empty response.")

    return _parse_response(response.text, provider_name="Gemini")


def generate_drafts(request: GenerateRequest) -> GenerateResponse:
    """
    Main drafting orchestrator:
    Supports user-provided API key from frontend (BYOK) or fallback to server .env.
    - 'groq': Directly uses Groq API
    - 'gemini': Directly uses Google Gemini
    - 'auto': Tries Groq first; falls back to Gemini on rate-limit / failure
    """
    _load_env()
    selected_provider = (
        request.provider or os.getenv("AI_PROVIDER", "groq")
    ).strip().lower()

    # 1. DIRECT GROQ GENERATION
    if selected_provider == "groq":
        logger.info("Generating drafts via Groq API...")
        return _generate_with_groq(request)

    # 2. DIRECT GEMINI GENERATION
    if selected_provider == "gemini":
        logger.info("Generating drafts via Google Gemini...")
        return _generate_with_gemini(request)

    # 3. AUTO / FALLBACK MODE
    logger.info("Running in AUTO fallback mode...")
    try:
        logger.info("Attempting primary generation with Groq...")
        return _generate_with_groq(request)
    except (AIRateLimitError, AIConfigurationError, RuntimeError) as groq_err:
        logger.warning(
            "Primary provider Groq failed or hit limit: %s. Falling back to Gemini...",
            str(groq_err)
        )
        try:
            return _generate_with_gemini(request)
        except Exception as gemini_err:
            raise RuntimeError(
                f"Both Groq and Gemini failed. Groq: {str(groq_err)}; Gemini: {str(gemini_err)}"
            ) from gemini_err
