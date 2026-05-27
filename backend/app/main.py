from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.api import health, ask
from app.api import quiz
from app.db.cosmos import setup_cosmos


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_cosmos()   # creates DB + containers if not present; logs warning if emulator is down
    yield


app = FastAPI(
    title="Adaptive Quiz Agent",
    description="AI-powered adaptive quiz backend",
    version="0.2.0",
    lifespan=lifespan,
)

# CORS — allows the React frontend to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(health.router, tags=["health"])
app.include_router(ask.router, tags=["ask"])
app.include_router(quiz.router)
