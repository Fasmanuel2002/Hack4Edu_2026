import re
from functools import cache

from fastapi import APIRouter, File, HTTPException, UploadFile
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

from src.modules.app.src.utils import extract_text
from src.modules.rag.storage.qdrant_manager import (
    create_vector_qdrant, ensure_collection, get_embedding_model,
    get_qdrant_client, get_sparse_model, probe_vector_size)

MAX_MB = 10
SESSION_ID = re.compile(r"[A-Za-z0-9_-]{1,64}")

upload_route = APIRouter(prefix="/upload", tags=["Upload files"])
splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=80)


@cache
def _models():
    return get_qdrant_client(), get_embedding_model(), get_sparse_model()


def user_store(session_id: str):
    "One Qdrant hybrid collection per session, so uploads never mix with the verified corpus."
    client, embedding, sparse = _models()
    name = f"user_{session_id}"
    ensure_collection(client, name, probe_vector_size(embedding))
    return create_vector_qdrant(client, name, embedding, sparse)


def user_docs(session_id: str | None, question: str, k: int = 3) -> list[Document]:
    "Top chunks of the session's uploads, shaped like corpus rows so the prompt and the sources drawer handle them."
    if not session_id or not SESSION_ID.fullmatch(session_id) \
            or not _models()[0].collection_exists(f"user_{session_id}"):
        return []
    return [
        Document(page_content=d.metadata["filename"],
                 metadata={"source_dataset": "user_upload", "pedagogical_answer": d.page_content})
        for d in user_store(session_id).similarity_search(question, k=k)
    ]


# Sync def on purpose: FastAPI runs it in a threadpool, so embedding doesn't block the event loop.
@upload_route.post("/file")
def upload_file(session_id: str, file: UploadFile = File(...)):
    if not SESSION_ID.fullmatch(session_id):
        raise HTTPException(422, "session_id must be 1-64 letters, digits, '_' or '-'")
    data = file.file.read(MAX_MB * 1024 * 1024 + 1)
    if len(data) > MAX_MB * 1024 * 1024:
        raise HTTPException(413, f"File too large (max {MAX_MB} MB)")

    chunks = splitter.split_text(extract_text(data, file.filename or ""))
    user_store(session_id).add_texts(
        chunks,
        metadatas=[{"source": "user_doc", "filename": file.filename}] * len(chunks),
    )
    return {"filename": file.filename, "chunks": len(chunks)}
