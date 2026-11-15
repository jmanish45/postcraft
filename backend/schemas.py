from pydantic import BaseModel, Field
from typing import List, Optional


class Campaign(BaseModel):
    name: str = ""
    hashtags: List[str] = Field(default_factory=list)


class Sample(BaseModel):
    id: int
    content: str = Field(min_length=1)


class GenerateRequest(BaseModel):
    hashtags: List[str] = Field(default_factory=list)
    campaign: Optional[Campaign] = None
    opening_tag: Optional[str] = Field(default="", description="Hashtag or tag placed at the start of the post.")
    closing_tag: Optional[str] = Field(default="", description="Optional sign-off, channel name, or footer line placed at end space-permitting.")
    samples: List[Sample] = Field(min_length=1, max_length=15)
    output_count: int = Field(default=5, ge=1, le=10)
    language: str = "English"
    provider: str = Field(default="groq", description="AI Provider: 'groq', 'gemini', or 'auto'")
    api_key: Optional[str] = Field(default=None, description="Optional user-provided API key from their mobile browser.")


class GeneratedPost(BaseModel):
    content: str = Field(description="Complete post content including required hashtags, strictly under 280 characters.")
    based_on: List[str] = Field(default_factory=list, description="List of source sample identifiers (e.g. ['Sample 1', 'Sample 2']).")
    verification_status: str = Field(default="needs_review", description="'verified' or 'needs_review'")


class GenerateResponse(BaseModel):
    generated_posts: List[GeneratedPost] = Field(default_factory=list, description="List of distinct generated post drafts.")


class PushKeys(BaseModel):
    p256dh: str
    auth: str


class PushSubscriptionModel(BaseModel):
    endpoint: str
    keys: PushKeys


class ScheduleReminderRequest(BaseModel):
    subscription: PushSubscriptionModel
    delay_seconds: int = Field(default=900, ge=1, le=86400)
    title: str = "⏰ Time for your next X post!"
    body: str = "Your 15-minute safety interval has passed. Tap to open Postcraft and post your next draft."
    reminder_id: Optional[str] = "default"


class CancelReminderRequest(BaseModel):
    reminder_id: str = "default"


class TestPushRequest(BaseModel):
    subscription: PushSubscriptionModel
    title: str = "⏰ Postcraft Test Alert!"
    body: str = "Server push delivered! Your phone can ring even when the app is closed."
