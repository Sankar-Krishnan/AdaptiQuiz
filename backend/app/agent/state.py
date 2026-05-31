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
    next_action: str         # "escalate" | "scaffold" | "same" | "retry"
    grade_level: str         # "4"–"12" or "professional"
    retry_count: int         # retries used on current question; reset to 0 by generate_question
    hint: str                # hint text; empty until give_hint runs
    needs_hint: bool         # routing flag set by check_retry each invocation
    prior_insights: dict     # loaded at /quiz/start from insights container; {} for first session
    insights: dict           # written after extract_insights; not used by the quiz graph
