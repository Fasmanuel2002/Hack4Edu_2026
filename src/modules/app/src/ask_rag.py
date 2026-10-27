from fastapi import APIRouter, Request
from .models.ask_models import AskRequest, AskResponse, AskRagResponse, Source
from langchain_core.output_parsers import StrOutputParser
from src.modules.rag.prompts.rag_prompt import llm

ask_route = APIRouter(prefix="/ask", tags=["Ask the tutor"])


@ask_route.post("/rag", response_model=AskRagResponse)
async def ask_rag(body : AskRequest, request : Request):
    result = await request.app.state.rag_chain.ainvoke(body.question)
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
