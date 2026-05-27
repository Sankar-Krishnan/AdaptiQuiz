from pydantic import BaseModel, Field
from datetime import datetime, timezone
import uuid


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class Student(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    student_id: str          # same as id; used as partition key
    name: str
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
    status: str = "active"   # "active" | "completed"
    created_at: str = Field(default_factory=_now)
    updated_at: str = Field(default_factory=_now)
