from typing import TypedDict
from langgraph.graph import StateGraph, END
from openai import OpenAI
from app.config import settings
from app.agent.state import GraphState
from app.agent.nodes import generate_question, evaluate_answer, generate_feedback


# --- Quiz graph ---

def _route_entry(state: GraphState) -> str:
    """Route to question generation on start, evaluation on answer."""
    if not state.get("student_answer"):
        return "generate_question"
    return "evaluate_answer"


def build_quiz_graph():
    graph = StateGraph(GraphState)

    graph.add_node("generate_question", generate_question)
    graph.add_node("evaluate_answer", evaluate_answer)
    graph.add_node("generate_feedback", generate_feedback)

    graph.set_conditional_entry_point(
        _route_entry,
        {
            "generate_question": "generate_question",
            "evaluate_answer": "evaluate_answer",
        },
    )

    graph.add_edge("evaluate_answer", "generate_feedback")
    graph.add_edge("generate_feedback", "generate_question")
    graph.add_edge("generate_question", END)

    return graph.compile()


quiz_runnable = build_quiz_graph()


# --- Legacy simple graph (keeps /ask working) ---

class _SimpleState(TypedDict):
    question: str
    answer: str


def _call_llm(state: _SimpleState) -> dict:
    client = OpenAI(
        base_url="https://models.inference.ai.azure.com",
        api_key=settings.github_token,
    )
    response = client.chat.completions.create(
        model=settings.llm_model,
        messages=[
            {"role": "system", "content": "You are a helpful assistant. Answer clearly and concisely."},
            {"role": "user", "content": state["question"]},
        ],
    )
    return {"answer": response.choices[0].message.content}


def _build_simple_graph():
    g = StateGraph(_SimpleState)
    g.add_node("call_llm", _call_llm)
    g.set_entry_point("call_llm")
    g.add_edge("call_llm", END)
    return g.compile()


runnable = _build_simple_graph()  # imported by /ask for backward compatibility
