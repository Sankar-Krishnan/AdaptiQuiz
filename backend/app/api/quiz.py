import uuid
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from app.agent.graph import quiz_runnable
from app.db.repositories import SessionRepository
from app.models.student import Session

router = APIRouter(prefix="/quiz", tags=["quiz"])


# --- Request / response models ---

class StartRequest(BaseModel):
    student_id: str
    topic: str
    difficulty: int = Field(default=1, ge=1, le=5)


class StartResponse(BaseModel):
    session_id: str
    question: str
    difficulty: int


class AnswerRequest(BaseModel):
    session_id: str
    student_id: str
    answer: str


class AnswerResponse(BaseModel):
    correct: bool
    explanation: str
    feedback: str
    next_question: str
    difficulty: int
    streak: int
    next_action: str


# --- Routes ---

@router.post("/start", response_model=StartResponse)
def start_quiz(request: StartRequest):
    session_id = str(uuid.uuid4())

    initial_state = {
        "student_id": request.student_id,
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
    }

    try:
        result = quiz_runnable.invoke(initial_state)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent error: {e}")

    session = Session(
        id=session_id,
        student_id=request.student_id,
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
def answer_quiz(request: AnswerRequest):
    repo = SessionRepository()
    session_data = repo.get(request.session_id, request.student_id)
    if not session_data:
        raise HTTPException(status_code=404, detail="Session not found")

    state = {
        "student_id": request.student_id,
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
    }

    try:
        result = quiz_runnable.invoke(state)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent error: {e}")

    updated_session = Session(
        id=request.session_id,
        student_id=request.student_id,
        topic=session_data["topic"],
        difficulty=result["difficulty"],
        streak=result["streak"],
        weak_areas=result["weak_areas"],
        history=result["history"],
        current_question=result["current_question"],
    )

    try:
        repo.upsert(updated_session.model_dump())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB error: {e}")

    evaluation = result.get("evaluation", {})
    return AnswerResponse(
        correct=evaluation.get("correct", False),
        explanation=evaluation.get("explanation", ""),
        feedback=result["feedback"],
        next_question=result["current_question"],
        difficulty=result["difficulty"],
        streak=result["streak"],
        next_action=result["next_action"],
    )
