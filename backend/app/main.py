import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.api import health, ask, quiz, auth
from app.db.cosmos import setup_cosmos

logging.basicConfig(level=logging.INFO)


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
    allow_origins=[o.strip() for o in settings.frontend_url.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(health.router, tags=["health"])
app.include_router(ask.router, tags=["ask"])
app.include_router(quiz.router)
app.include_router(auth.router)
