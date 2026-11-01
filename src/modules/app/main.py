from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from ..rag.build_rag_runtime import build_rag_runtime
from .src.ask_rag import ask_route
from .src.health import health_route
from .src.upload_files import upload_route


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
app.include_router(upload_route)

# Built Angular app (copied in by the Dockerfile). Absent when running the API alone.
SITE_DIR = Path(__file__).resolve().parents[3] / "site_dist"

if SITE_DIR.is_dir():
    @app.get("/{path:path}", include_in_schema=False)
    def site(path: str):
        file = (SITE_DIR / path).resolve()
        if file.is_file() and SITE_DIR in file.parents:
            return FileResponse(file)
        prerendered = SITE_DIR / path.strip("/") / "index.html"
        if path.strip("/") == "architecture" and prerendered.is_file():
            return FileResponse(prerendered)
        return FileResponse(SITE_DIR / "index.csr.html")
