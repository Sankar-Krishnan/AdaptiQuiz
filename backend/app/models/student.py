import re
from pydantic import BaseModel, Field
from datetime import datetime, timezone
import uuid


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


VALID_GRADES = {str(g) for g in range(4, 13)} | {"professional"}


class Student(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    student_id: str          # same as id; used as partition key
    name: str
    email: str               # lowercase-normalised before storage
    password_hash: str
    grade_level: str         # "4"–"12" or "professional"
    total_sessions: int = 0
    created_at: str = Field(default_factory=_now)


class Session(BaseModel):
    id: str                  # session_id — set explicitly by the caller
    student_id: str          # partition key
    topic: str
    difficulty: int = 1
    streak: int = 0
    weak_areas: list[str] = Field(default_factory=list)
    history: list[dict] = Field(default_factory=list)
    current_question: str = ""
    retry_count: int = 0     # retries used on current question; reset to 0 on new question
    status: str = "active"   # "active" | "completed"
    created_at: str = Field(default_factory=_now)
    updated_at: str = Field(default_factory=_now)


def make_topic_slug(topic: str) -> str:
    return re.sub(r'[^a-z0-9]+', '_', topic.strip().lower()).strip('_')


class Insights(BaseModel):
    id: str                  # "{student_id}::{topic_slug}"
    student_id: str          # partition key
    topic: str               # raw topic string
    topic_slug: str
    mastery_level: int = 1   # 1–5
    strengths: list[str] = Field(default_factory=list)
    weak_areas: list[str] = Field(default_factory=list)
    recommended_focus: list[str] = Field(default_factory=list)
    overall_summary: str = ""
    sessions_analyzed: int = 0
    last_updated: str = Field(default_factory=_now)
