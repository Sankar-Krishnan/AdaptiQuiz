import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from openai import RateLimitError
from jose import JWTError
from app.agent.graph import quiz_runnable
from app.agent.nodes import extract_insights
from app.core.security import decode_token
from app.db.repositories import SessionRepository, StudentRepository, InsightsRepository
from app.models.student import Session, Insights, make_topic_slug

router = APIRouter(prefix="/quiz", tags=["quiz"])
_bearer = HTTPBearer()


# --- JWT dependency ---

def get_current_student_id(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
) -> str:
    try:
        return decode_token(credentials.credentials)
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")


def _get_student_grade(student_id: str) -> str:
    student_data = StudentRepository().get(student_id)
    if not student_data:
        raise HTTPException(status_code=404, detail="Student profile not found.")
    return student_data.get("grade_level", "5")


# --- Request / response models ---

class StartRequest(BaseModel):
    topic: str
    difficulty: int = Field(default=1, ge=1, le=5)


class StartResponse(BaseModel):
    session_id: str
    question: str
    difficulty: int


class AnswerRequest(BaseModel):
    session_id: str
    answer: str


class AnswerResponse(BaseModel):
    correct: bool
    explanation: str
    feedback: str
    next_question: str
    difficulty: int
    streak: int
    next_action: str   # "retry" | "escalate" | "scaffold" | "same"
    hint: str = ""     # non-empty when next_action == "retry"


class InsightsData(BaseModel):
    topic: str
    mastery_level: int
    strengths: list[str]
    weak_areas: list[str]
    recommended_focus: list[str]
    overall_summary: str
    sessions_analyzed: int


class FinishRequest(BaseModel):
    session_id: str


class FinishResponse(BaseModel):
    insights: InsightsData


# --- Routes ---

@router.post("/start", response_model=StartResponse)
def start_quiz(
    request: StartRequest,
    student_id: str = Depends(get_current_student_id),
):
    grade_level = _get_student_grade(student_id)
    session_id = str(uuid.uuid4())

    topic_slug = make_topic_slug(request.topic)
    insights_id = f"{student_id}::{topic_slug}"
    prior_insights = InsightsRepository().get(insights_id, student_id) or {}

    initial_state = {
        "student_id": student_id,
        "topic": request.topic,
        "difficulty": request.difficulty,
        "streak": 0,
        "weak_areas": [],
        "history": [],
        "current_question": "",
        "student_answer": "",   # empty → graph routes to generate_question
        "evaluation": {},
        "feedback": "",
        "next_action": "",
        "grade_level": grade_level,
        "retry_count": 0,
        "hint": "",
        "needs_hint": False,
        "prior_insights": prior_insights,
        "insights": {},
    }

    try:
        result = quiz_runnable.invoke(initial_state)
    except RateLimitError:
        raise HTTPException(status_code=429, detail="AI service rate limit exceeded. Please wait a moment and try again.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent error: {e}")

    session = Session(
        id=session_id,
        student_id=student_id,
        topic=request.topic,
        difficulty=result["difficulty"],
        streak=result["streak"],
        weak_areas=result["weak_areas"],
        history=result["history"],
        current_question=result["current_question"],
    )

    try:
        SessionRepository().upsert(session.model_dump())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB error: {e}")

    return StartResponse(
        session_id=session_id,
        question=result["current_question"],
        difficulty=result["difficulty"],
    )


@router.post("/answer", response_model=AnswerResponse)
def answer_quiz(
    request: AnswerRequest,
    student_id: str = Depends(get_current_student_id),
):
    repo = SessionRepository()
    session_data = repo.get(request.session_id, student_id)
    if not session_data:
        raise HTTPException(status_code=404, detail="Session not found")

    grade_level = _get_student_grade(student_id)   # load fresh — grade changes apply immediately

    topic_slug = make_topic_slug(session_data["topic"])
    insights_id = f"{student_id}::{topic_slug}"
    prior_insights = InsightsRepository().get(insights_id, student_id) or {}

    state = {
        "student_id": student_id,
        "topic": session_data["topic"],
        "difficulty": session_data["difficulty"],
        "streak": session_data["streak"],
        "weak_areas": session_data.get("weak_areas", []),
        "history": session_data.get("history", []),
        "current_question": session_data["current_question"],
        "student_answer": request.answer,  # non-empty → routes to evaluate_answer
        "evaluation": {},
        "feedback": "",
        "next_action": "",
        "grade_level": grade_level,
        "retry_count": session_data.get("retry_count", 0),
        "hint": "",
        "needs_hint": False,
        "prior_insights": prior_insights,
        "insights": {},
    }

    try:
        result = quiz_runnable.invoke(state)
    except RateLimitError:
        raise HTTPException(status_code=429, detail="AI service rate limit exceeded. Please wait a moment and try again.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent error: {e}")

    updated_session = Session(
        id=request.session_id,
        student_id=student_id,
        topic=session_data["topic"],
        difficulty=result["difficulty"],
        streak=result["streak"],
        weak_areas=result["weak_areas"],
        history=result["history"],
        current_question=result["current_question"],
        retry_count=result.get("retry_count", 0),
    )

    try:
        repo.upsert(updated_session.model_dump())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB error: {e}")

    evaluation = result.get("evaluation", {})
    return AnswerResponse(
        correct=evaluation.get("correct", False),
        explanation=evaluation.get("explanation", ""),
        feedback=result.get("feedback", ""),
        next_question=result.get("current_question", ""),
        difficulty=result["difficulty"],
        streak=result.get("streak", 0),
        next_action=result.get("next_action", ""),
        hint=result.get("hint", ""),
    )


@router.post("/finish", response_model=FinishResponse)
def finish_quiz(
    request: FinishRequest,
    student_id: str = Depends(get_current_student_id),
):
    repo = SessionRepository()
    session_data = repo.get(request.session_id, student_id)
    if not session_data:
        raise HTTPException(status_code=404, detail="Session not found")

    grade_level = _get_student_grade(student_id)
    history = session_data.get("history", [])
    topic = session_data["topic"]
    topic_slug = make_topic_slug(topic)
    insights_id = f"{student_id}::{topic_slug}"

    insights_repo = InsightsRepository()
    prior_doc = insights_repo.get(insights_id, student_id)

    raw_insights = extract_insights(
        student_id=student_id,
        topic=topic,
        history=history,
        grade_level=grade_level,
        prior_insights=prior_doc or None,
    )

    sessions_analyzed = (prior_doc.get("sessions_analyzed", 0) + 1) if prior_doc else 1

    doc = Insights(
        id=insights_id,
        student_id=student_id,
        topic=topic,
        topic_slug=topic_slug,
        mastery_level=raw_insights.get("mastery_level", 1),
        strengths=raw_insights.get("strengths", []),
        weak_areas=raw_insights.get("weak_areas", []),
        recommended_focus=raw_insights.get("recommended_focus", []),
        overall_summary=raw_insights.get("overall_summary", ""),
        sessions_analyzed=sessions_analyzed,
    )
    try:
        insights_repo.upsert(doc.model_dump())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB error saving insights: {e}")

    # Mark session completed — non-fatal if this fails
    session_data["status"] = "completed"
    session_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    try:
        repo.upsert(session_data)
    except Exception:
        pass

    return FinishResponse(
        insights=InsightsData(
            topic=doc.topic,
            mastery_level=doc.mastery_level,
            strengths=doc.strengths,
            weak_areas=doc.weak_areas,
            recommended_focus=doc.recommended_focus,
            overall_summary=doc.overall_summary,
            sessions_analyzed=doc.sessions_analyzed,
        )
    )


@router.get("/insights", response_model=list[InsightsData])
def get_insights(student_id: str = Depends(get_current_student_id)):
    docs = InsightsRepository().get_all_for_student(student_id)
    return [
        InsightsData(
            topic=d.get("topic", ""),
            mastery_level=d.get("mastery_level", 1),
            strengths=d.get("strengths", []),
            weak_areas=d.get("weak_areas", []),
            recommended_focus=d.get("recommended_focus", []),
            overall_summary=d.get("overall_summary", ""),
            sessions_analyzed=d.get("sessions_analyzed", 0),
        )
        for d in docs
    ]
