import json
import logging
from openai import OpenAI, RateLimitError, BadRequestError
from tenacity import retry, wait_exponential, stop_after_attempt, retry_if_exception_type
from app.config import settings
from app.agent.state import GraphState
from app.agent.prompts import (
    get_question_prompt,
    get_evaluator_prompt,
    get_feedback_prompt,
    get_hint_prompt,
    get_insights_prompt,
)

logger = logging.getLogger(__name__)


class ContentFilteredError(Exception):
    """Raised when the Azure content filter blocks a prompt (e.g. jailbreak detection)."""

_client = OpenAI(
    base_url="https://models.inference.ai.azure.com",
    api_key=settings.github_token,
)


@retry(
    retry=retry_if_exception_type(RateLimitError),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    stop=stop_after_attempt(3),
    reraise=True,
)
def _chat(system: str, user: str, json_mode: bool = False, temperature: float = 0.7) -> str:
    kwargs = {
        "model": settings.llm_model,
        "temperature": temperature,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
    }
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}
    try:
        response = _client.chat.completions.create(**kwargs)
    except BadRequestError as e:
        if "content_filter" in str(e):
            logger.warning(
                "Content filter triggered.\n"
                "--- SYSTEM ---\n%s\n"
                "--- USER ---\n%s",
                system,
                user,
            )
            raise ContentFilteredError("Prompt blocked by content filter") from e
        raise
    return response.choices[0].message.content.strip()


def generate_question(state: GraphState) -> dict:
    seen = [h["question"] for h in state.get("history", [])]

    prior = state.get("prior_insights") or {}
    prior_block = ""
    if prior:
        weak = prior.get("weak_areas", [])
        focus = prior.get("recommended_focus", [])
        if weak or focus:
            prior_block = (
                f"\nPrior insights for this student on this topic:"
                f"\n  Weak areas: {weak or 'none'}"
                f"\n  Recommended focus: {focus or 'none'}"
            )

    user_prompt = (
        f"Topic: {state['topic']}\n"
        f"Difficulty: {state['difficulty']} / 5\n"
        f"Previous questions asked (do not repeat): {seen or 'none'}"
        f"{prior_block}\n"
        "Generate the next question."
    )
    question = _chat(
        get_question_prompt(state.get("grade_level", "5"), has_prior_insights=bool(prior_block)),
        user_prompt,
    )
    return {"current_question": question, "student_answer": "", "retry_count": 0, "hint": ""}


def evaluate_answer(state: GraphState) -> dict:
    user_prompt = (
        f"Question: {state['current_question']}\n"
        f"Student's answer: {state['student_answer']}"
    )
    try:
        raw = _chat(get_evaluator_prompt(state.get("grade_level", "5")), user_prompt, json_mode=True, temperature=0)
        try:
            evaluation = json.loads(raw)
        except json.JSONDecodeError:
            evaluation = {"correct": False, "explanation": raw, "key_concept": "unknown"}
    except ContentFilteredError:
        evaluation = {
            "correct": False,
            "explanation": "That answer couldn't be checked. Please try rephrasing your response.",
            "key_concept": "unknown",
            "reasoning": "Content filter triggered on student input.",
        }
    return {"evaluation": evaluation}


def generate_feedback(state: GraphState) -> dict:
    evaluation = state.get("evaluation", {})
    correct = evaluation.get("correct", False)
    streak = state.get("streak", 0)
    difficulty = state.get("difficulty", 1)
    weak_areas = list(state.get("weak_areas", []))

    # Update streak
    new_streak = (streak + 1) if correct else 0

    # Determine next_action deterministically — no LLM involvement
    if correct and new_streak >= 3:
        next_action = "escalate"
    elif not correct:
        next_action = "scaffold"
    else:
        next_action = "same"

    # Adjust difficulty
    if next_action == "escalate":
        new_difficulty = min(difficulty + 1, 5)
        new_streak = 0  # reset streak after level-up
    elif next_action == "scaffold":
        new_difficulty = max(difficulty - 1, 1)
    else:
        new_difficulty = difficulty

    # Track weak areas on wrong answers
    key_concept = evaluation.get("key_concept", "")
    if not correct and key_concept and key_concept not in weak_areas:
        weak_areas.append(key_concept)

    # LLM generates only the human-readable feedback text
    user_prompt = (
        f"Topic: {state['topic']}\n"
        f"Question: {state['current_question']}\n"
        f"Student's answer: {state['student_answer']}\n"
        f"Correct: {correct}\n"
        f"Explanation: {evaluation.get('explanation', '')}\n"
        "Write encouraging feedback for the student."
    )
    try:
        feedback = _chat(get_feedback_prompt(state.get("grade_level", "5")), user_prompt)
    except ContentFilteredError:
        feedback = "Let's keep going — every question is a chance to learn something new!"

    # Append completed round to history
    history = list(state.get("history", []))
    history.append({
        "question": state["current_question"],
        "answer": state["student_answer"],
        "correct": correct,
        "difficulty": difficulty,
    })

    return {
        "feedback": feedback,
        "next_action": next_action,
        "streak": new_streak,
        "difficulty": new_difficulty,
        "weak_areas": weak_areas,
        "history": history,
    }


def check_retry(state: GraphState) -> dict:
    """Pure Python node — no LLM. Decides whether to give a hint or proceed."""
    correct = state.get("evaluation", {}).get("correct", False)
    retry_count = state.get("retry_count", 0)
    if not correct and retry_count < 1:
        return {"needs_hint": True, "retry_count": retry_count + 1, "next_action": "retry"}
    return {"needs_hint": False}


def give_hint(state: GraphState) -> dict:
    """LLM call — only reached when student answered wrong on first attempt."""
    user_prompt = (
        f"Topic: {state['topic']}\n"
        f"Question: {state['current_question']}\n"
        f"Student's answer: {state['student_answer']}\n"
        "Write a short hint to help the student find the correct answer on their own."
    )
    try:
        hint = _chat(get_hint_prompt(state.get("grade_level", "5")), user_prompt)
    except ContentFilteredError:
        hint = "Think carefully about the key idea in the question — give it another try!"
    return {"hint": hint}


_INSIGHTS_FALLBACK = {
    "mastery_level": 1,
    "strengths": [],
    "weak_areas": [],
    "recommended_focus": [],
    "overall_summary": "",
}


def extract_insights(
    student_id: str,
    topic: str,
    history: list[dict],
    grade_level: str,
    prior_insights: dict | None = None,
) -> dict:
    """Analyzes a completed session and returns a structured insights dict. Never raises."""
    if not history:
        return dict(_INSIGHTS_FALLBACK)

    history_lines = []
    for i, entry in enumerate(history, 1):
        result = "Correct" if entry.get("correct") else "Incorrect"
        history_lines.append(
            f"{i}. [{result}, difficulty {entry.get('difficulty', '?')}] "
            f"Q: {entry.get('question', '')} | A: {entry.get('answer', '')}"
        )
    history_text = "\n".join(history_lines)

    prior_block = ""
    if prior_insights:
        n = prior_insights.get("sessions_analyzed", 1)
        prior_block = (
            f"\nPrior insights (from {n} previous session{'s' if n != 1 else ''}):\n"
            f"  Mastery level: {prior_insights.get('mastery_level', 1)}\n"
            f"  Strengths: {prior_insights.get('strengths', [])}\n"
            f"  Weak areas: {prior_insights.get('weak_areas', [])}\n"
            f"  Recommended focus: {prior_insights.get('recommended_focus', [])}\n"
            f"  Summary: {prior_insights.get('overall_summary', '')}"
        )

    user_prompt = (
        f"Topic: {topic}\n"
        f"Student ID: {student_id}\n\n"
        f"Session history ({len(history)} questions):\n{history_text}"
        f"{prior_block}\n\n"
        "Produce an updated holistic insights object for this student on this topic."
    )

    try:
        raw = _chat(get_insights_prompt(grade_level), user_prompt, json_mode=True, temperature=0)
        result = json.loads(raw)
        result.pop("reasoning", None)
        result.setdefault("mastery_level", 1)
        result.setdefault("strengths", [])
        result.setdefault("weak_areas", [])
        result.setdefault("recommended_focus", [])
        result.setdefault("overall_summary", "")
        return result
    except (json.JSONDecodeError, ContentFilteredError, Exception) as e:
        logger.warning("extract_insights failed: %s", e)
        return dict(_INSIGHTS_FALLBACK)
