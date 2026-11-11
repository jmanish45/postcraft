import logging
import os
from urllib.parse import urljoin, urlparse
import requests
from bs4 import BeautifulSoup
from google.genai.errors import ServerError
from fastapi import FastAPI, HTTPException, Response, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from starlette.concurrency import run_in_threadpool

from schemas import GenerateRequest, GenerateResponse
from ai_service import (
    generate_drafts,
    AIConfigurationError,
    AIRateLimitError,
)


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


app = FastAPI(
    title="Postcraft API",
    description="AI-powered content drafting service",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "Postcraft API"
    }


@app.post(
    "/api/generate-posts",
    response_model=GenerateResponse
)
@app.post(
    "/generate-posts",
    response_model=GenerateResponse
)
@app.post(
    "/api/api/generate-posts",
    response_model=GenerateResponse
)
async def generate_posts(request: GenerateRequest):

    valid_samples = [
        sample for sample in request.samples
        if sample.content.strip()
    ]

    if not valid_samples:
        raise HTTPException(
            status_code=400,
            detail="Please provide at least one non-empty sample."
        )

    request.samples = valid_samples

    try:
        result = await run_in_threadpool(
            generate_drafts,
            request
        )

        return result

    except AIConfigurationError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error)
        )

    except AIRateLimitError as error:
        raise HTTPException(
            status_code=429,
            detail=str(error)
        )

    except ServerError:
        logger.exception("Underlying AI service is temporarily unavailable")
        raise HTTPException(
            status_code=503,
            detail="AI service is temporarily unavailable. Please try again later."
        )

    except ValueError as error:
        logger.exception("Validation or parsing error in generation")
        raise HTTPException(
            status_code=422,
            detail=str(error)
        )

    except Exception as error:
        logger.exception("Post generation failed")
        raise HTTPException(
            status_code=502,
            detail=f"AI generation failed: {str(error)}"
        )


class ExtractImagesRequest(BaseModel):
    url: str


@app.post("/api/extract-images")
@app.post("/extract-images")
@app.post("/api/api/extract-images")
def extract_images(request: ExtractImagesRequest):
    target_url = request.url.strip()
    if not target_url.startswith(("http://", "https://")):
        raise HTTPException(
            status_code=400,
            detail="Please provide a valid URL starting with http:// or https://"
        )

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,hi;q=0.8",
    }

    try:
        resp = requests.get(target_url, headers=headers, timeout=12)
        resp.raise_for_status()
    except Exception as e:
        logger.warning(f"Failed to fetch webpage for images: {e}")
        raise HTTPException(
            status_code=502,
            detail=f"Could not load webpage for images: {str(e)}"
        )

    soup = BeautifulSoup(resp.text, "html.parser")
    found = []

    for tag in soup.find_all(["img", "a"]):
        src = (
            tag.get("src")
            or tag.get("data-src")
            or tag.get("data-lazy-src")
            or tag.get("href")
        )
        if not src:
            continue

        full_url = urljoin(target_url, src.strip())
        path = urlparse(full_url).path.lower()

        is_img_ext = any(
            path.endswith(ext)
            for ext in [".jpg", ".jpeg", ".png", ".webp", ".jfif"]
        )
        if is_img_ext:
            lower = full_url.lower()
            if any(
                skip in lower
                for skip in [
                    "avatar", "icon", "logo", "favicon", "emoji", "gravatar", "wp-includes"
                ]
            ):
                continue
            if full_url not in found:
                found.append(full_url)

    return {"images": found, "count": len(found)}


@app.get("/api/proxy-image")
@app.get("/proxy-image")
@app.get("/api/api/proxy-image")
def proxy_image(url: str = Query(..., description="External image URL to proxy for CORS")):
    target_url = url.strip()
    if not target_url.startswith(("http://", "https://")):
        raise HTTPException(status_code=400, detail="Invalid image URL")

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": target_url,
    }

    try:
        resp = requests.get(target_url, headers=headers, timeout=10)
        resp.raise_for_status()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to proxy image: {str(e)}")

    media_type = resp.headers.get("content-type", "image/jpeg")
    return Response(
        content=resp.content,
        media_type=media_type,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "public, max-age=86400",
        },
    )


dist_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../frontend/dist"))
if os.path.exists(dist_dir):
    app.mount("/", StaticFiles(directory=dist_dir, html=True), name="frontend")
else:
    @app.get("/")
    def home():
        return {
            "message": "Postcraft API is running. Build frontend/dist to serve the UI."
        }
