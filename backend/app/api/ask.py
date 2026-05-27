from fastapi import APIRouter, HTTPException
from app.models.request import AskRequest
from app.models.response import AskResponse
from app.agent.graph import runnable

router = APIRouter()


@router.post("/ask", response_model=AskResponse)
def ask(request: AskRequest):
    try:
        # Invoke the LangGraph graph with the initial state.
        # The graph runs all nodes and returns the final state.
        result = runnable.invoke({"question": request.question})
        return AskResponse(answer=result["answer"])

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
