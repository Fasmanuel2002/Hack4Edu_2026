from fastapi import APIRouter, Request
from .models.ask_models import AskRequest, AskResponse, AskRagResponse, Source
from langchain_core.output_parsers import StrOutputParser
from fastapi.concurrency import run_in_threadpool
from src.modules.rag.prompts.rag_prompt import llm
from .upload_files import user_docs

ask_route = APIRouter(prefix="/ask", tags=["Ask the tutor"])


@ask_route.post("/rag", response_model=AskRagResponse)
async def ask_rag(body : AskRequest, request : Request):
    extra_docs = await run_in_threadpool(user_docs, body.session_id, body.question)
    result = await request.app.state.rag_chain.ainvoke({"question": body.question, "extra_docs": extra_docs})
    sources = [
        Source(
            source_dataset=doc.metadata["source_dataset"],
            search_context=doc.page_content,
            pedagogical_answer=doc.metadata["pedagogical_answer"])
        for doc in result["docs"]
    ]
    return AskRagResponse(answer=result["answer"], sources=sources)

@ask_route.post("/plain", response_model=AskResponse)
async def ask_plain(body : AskRequest):
    "BaseLine Model for A/B testing"
    answer = await (llm | StrOutputParser()).ainvoke(body.question)
    return AskResponse(answer=answer)

