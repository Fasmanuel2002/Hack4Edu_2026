from fastapi import APIRouter, Request
from .models.ask_models import AskRequest, AskResponse
from langchain_core.output_parsers import StrOutputParser
from src.modules.rag.prompts.rag_prompt import llm

ask_route = APIRouter(prefix="/ask", tags=["Ask the tutor"])


@ask_route.post("/rag", response_model=AskResponse)
async def ask_rag(body : AskRequest, request : Request):
    answer = await request.app.state.rag_chain.ainvoke(body.question)
    return AskResponse(answer=answer)

@ask_route.post("/plain", response_model=AskResponse)
async def ask_plain(body : AskRequest):
    "BaseLine Model for A/B testing"
    answer = await (llm | StrOutputParser()).ainvoke(body.question)
    return AskResponse(answer=answer)