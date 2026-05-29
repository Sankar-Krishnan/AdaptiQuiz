import json
from openai import OpenAI, RateLimitError
from tenacity import retry, wait_exponential, stop_after_attempt, retry_if_exception_type
from app.config import settings
from app.agent.state import GraphState
from app.agent.prompts import (
    QUESTION_GENERATOR_SYSTEM,
    ANSWER_EVALUATOR_SYSTEM,
    FEEDBACK_GENERATOR_SYSTEM,
)

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
def _chat(system: str, user: str, json_mode: bool = False) -> str:
    kwargs = {
        "model": settings.llm_model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
    }
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}
    response = _client.chat.completions.create(**kwargs)
    return response.choices[0].message.content.strip()


def generate_question(state: GraphState) -> dict:
    seen = [h["question"] for h in state.get("history", [])]
    user_prompt = (
        f"Topic: {state['topic']}\n"
        f"Difficulty: {state['difficulty']} / 5\n"
        f"Previous questions asked (do not repeat): {seen or 'none'}\n"
        "Generate the next question."
    )
    question = _chat(QUESTION_GENERATOR_SYSTEM, user_prompt)
    return {"current_question": question, "student_answer": ""}


def evaluate_answer(state: GraphState) -> dict:
    user_prompt = (
        f"Question: {state['current_question']}\n"
        f"Student's answer: {state['student_answer']}"
    )
    raw = _chat(ANSWER_EVALUATOR_SYSTEM, user_prompt, json_mode=True)
    try:
        evaluation = json.loads(raw)
    except json.JSONDecodeError:
        evaluation = {"correct": False, "explanation": raw, "key_concept": "unknown"}
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
    feedback = _chat(FEEDBACK_GENERATOR_SYSTEM, user_prompt)

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
