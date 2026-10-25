from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from ..rag.build_rag_runtime import build_rag_runtime
from .src.ask_rag import ask_route
from .src.health import health_route


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.rag_chain = build_rag_runtime()
    yield


app = FastAPI(
    title="Hack4Edu",
    version="0.9.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ask_route)
app.include_router(health_route)
