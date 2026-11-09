import logging
import os
from google.genai.errors import ServerError
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
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


dist_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../frontend/dist"))
if os.path.exists(dist_dir):
    app.mount("/", StaticFiles(directory=dist_dir, html=True), name="frontend")
else:
    @app.get("/")
    def home():
        return {
            "message": "Postcraft API is running. Build frontend/dist to serve the UI."
        }
