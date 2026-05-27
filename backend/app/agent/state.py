from typing import TypedDict


class GraphState(TypedDict):
    student_id: str
    topic: str
    difficulty: int          # 1–5; current difficulty level
    streak: int              # consecutive correct answers at this difficulty
    weak_areas: list[str]    # concepts the student struggles with
    history: list[dict]      # [{question, answer, correct, difficulty}] — grows each round
    current_question: str    # question to show the student
    student_answer: str      # empty string = no answer yet (start flow)
    evaluation: dict         # {correct: bool, explanation: str, key_concept: str}
    feedback: str            # human-readable tutor feedback
    next_action: str         # "escalate" | "scaffold" | "same"
