# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the project

**Backend** (Python 3.11, from repo root):
```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

**Frontend** (from repo root):
```bash
cd frontend
npm run dev          # starts on port 3000
npm run build        # production build
npx tsc -p tsconfig.app.json --noEmit   # type-check only
```

**Install/reinstall dependencies:**
```bash
# Backend
cd backend && pip install -r requirements.txt

# Frontend
cd frontend && npm install
```

**Cosmos DB emulator** (required for `/quiz/*` endpoints):
```bash
docker run --detach --publish 8081:8081 --publish 1234:1234 \
  --name cosmosdb-emulator \
  mcr.microsoft.com/cosmosdb/linux/azure-cosmos-emulator:vnext-preview
```
The emulator auto-provisions the `adaptive-quiz` database and `students`/`sessions` containers on first backend startup via `setup_cosmos()` in `app/db/cosmos.py`. If the emulator is down, the backend still starts — it logs a warning and the quiz endpoints return 500.

**Interactive API docs:** `http://localhost:8000/docs`

## Architecture

### Backend — LangGraph quiz agent

The core logic is a single compiled LangGraph graph (`quiz_runnable` in `app/agent/graph.py`) that handles both API calls using a **conditional entry point**:

```
student_answer == ""  →  generate_question  →  END          (POST /quiz/start)
student_answer set    →  evaluate_answer  →  generate_feedback  →  generate_question  →  END  (POST /quiz/answer)
```

The routing function is `_route_entry`. The `student_answer` field in `GraphState` is the signal — empty means "start flow", non-empty means "answer flow". This means both endpoints invoke the same `quiz_runnable.invoke(state)` call; the graph self-routes based on what's in state.

**Nodes** (`app/agent/nodes.py`):
- `generate_question` — calls Groq with topic + difficulty + seen questions (prevents repeats); resets `student_answer` to `""`
- `evaluate_answer` — calls Groq with JSON mode; returns `{correct, explanation, key_concept}`
- `generate_feedback` — **all difficulty/streak logic is pure Python here, not delegated to the LLM**. The LLM only writes the human-readable feedback text. Escalates (difficulty +1, streak reset to 0) when `streak >= 3` correct; scaffolds (difficulty -1) on wrong; resets streak to 0 on wrong.

**State** (`app/agent/state.py`): `GraphState` is a `TypedDict` with 11 fields. The API layer builds a full state dict from the persisted session before each `invoke()` call, then writes updated fields back to Cosmos after.

**Prompts** (`app/agent/prompts.py`): Three module-level string constants. The evaluator prompt enforces a strict JSON structure. The feedback prompt intentionally does NOT include `NEXT_ACTION` — that logic was moved to Python.

### Backend — API layer

`POST /quiz/start` → builds an empty initial state → invokes graph → persists `Session` to Cosmos → returns `{session_id, question, difficulty}`.

`POST /quiz/answer` → loads session from Cosmos by `(session_id, student_id)` → injects `student_answer` → invokes graph → upserts updated session → returns `{correct, explanation, feedback, next_question, difficulty, streak, next_action}`.

Route/request/response models are defined inline in `app/api/quiz.py` (not in `app/models/`). The `app/models/student.py` models (`Student`, `Session`) are the Cosmos document shapes. The `Session.id` field must equal `session_id` — Cosmos uses `id` as the document key.

**Legacy `/ask` endpoint** (`app/api/ask.py`) uses a separate simple graph (`runnable`) also exported from `graph.py`. Do not remove it.

### Backend — Cosmos DB

Partition key is `/student_id` on both containers. All reads are point-reads (`read_item(item=id, partition_key=student_id)`) — no queries. The `CosmosClient` is a module-level singleton in `cosmos.py` initialized lazily. `DISABLE_SSL_VERIFY=true` and `connection_verify=False` are required for the local emulator.

### Frontend — state and routing

`QuizSession` (defined in `src/types/quiz.ts`) is the single source of truth for all quiz state. It lives in `App.tsx` and is passed down as props — no context, no external store.

Route `/quiz` redirects to `/` if `session` is null, preventing direct URL access mid-session.

`src/api/client.ts` generates `student_id` client-side as `student_${Date.now()}` when none is provided. The backend does not echo `student_id` back in `StartResponse`, so `client.ts` re-attaches it from the request body.

**QuizPage** manages a `phase` state (`'answering' | 'loading' | 'feedback'`) to control which UI elements render. Score is accumulated in `App.tsx` state, not returned by the backend (`AnswerResponse.score` in the type is a client-side field).

### Frontend — styling rules

PrimeReact components only. PrimeFlex utility classes for layout (`flex`, `justify-content-*`, `align-items-*`, `gap-*`, `p-*`, `m-*`, `w-full`, `surface-*`, `text-*`). No Tailwind, no custom CSS files. The `index.html` `<style>` tag contains only `:root { color-scheme: light }` and a body reset — this is intentional to force PrimeFlex 4's `light-dark()` CSS function into light mode.

## Key configuration

All backend config is in `app/config.py` via `pydantic-settings`. The `.env` file lives at the repo root (two levels above `app/`). Settings are imported as the singleton `settings` everywhere.

```
GROQ_API_KEY=...
GROQ_MODEL=llama-3.1-8b-instant
ENV=local
FRONTEND_URL=http://localhost:3000
COSMOS_ENDPOINT=https://localhost:8081
COSMOS_KEY=C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b5n=
COSMOS_DATABASE=adaptive-quiz
DISABLE_SSL_VERIFY=true
```

Frontend env: `frontend/.env` with `VITE_API_URL=http://localhost:8000`.

## Hosting target

Azure Container Apps (backend, min replicas=0) + Azure Static Web Apps (frontend), Central India region. CI/CD: GitHub Actions → ghcr.io → Azure. When `ENV=azure` and `DISABLE_SSL_VERIFY=false`, the Cosmos client connects to the real Azure Cosmos DB endpoint without SSL bypass.
