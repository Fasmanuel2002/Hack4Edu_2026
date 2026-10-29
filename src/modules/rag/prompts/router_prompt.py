# src/modules/rag/prompts/router_prompt.py
import json
import os

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI

CLASSIFIER_SYSTEM_PROMPT = """You are a routing assistant for "Twins for Change", a bilingual Yorùbá–English classroom tutor. Read the student's message and output ONLY one raw JSON object: no markdown, no code fences, no extra text.

The tutor has a verified offline database of classroom questions with pedagogical answers (math word problems, multiple-choice science and general knowledge, translation, reading comprehension). Searching that database is called RAG.

Output format (double quotes, lowercase true/false):
{"needs_rag": true, "question_type": "math", "language": "yo"}

Rules:
1. "needs_rag":
   - true if the message is a school question or exercise of any kind: math, multiple choice, science, general knowledge, translation, reading comprehension, vocabulary, or a request to explain a school topic.
   - true also if it asks for facts that may not exist (future events, fictional or impossible situations): the tutor must check the database to say it is not covered.
   - false ONLY if the message is not a school question: greetings, thanks, small talk, questions about the tutor itself, or empty/nonsense text.
   - If you are unsure, output true.
2. "question_type": one of "math", "multiple_choice", "translation", "reading", "science_or_general", "chitchat", "other".
3. "language": "yo" if mostly Yorùbá, "en" if mostly English, "mixed" if both.
Never answer the question. Never add other fields.

Examples:
Student: Tunde has $200 and spends half on shoes. How much is left?
{"needs_rag": true, "question_type": "math", "language": "en"}
Student: Kí ni orúkọ ẹ̀yà ara tí ó ń ṣàkóso ara? A) Ẹdọ̀ B) Ọpọlọ C) Ọkàn
{"needs_rag": true, "question_type": "multiple_choice", "language": "yo"}
Student: Translate to English: Àwọn akẹ́kọ̀ọ́ ń ṣiṣẹ́ pọ̀.
{"needs_rag": true, "question_type": "translation", "language": "mixed"}
Student: Who won the World Cup in 2038 on Jupiter?
{"needs_rag": true, "question_type": "general_knowledge", "language": "en"}
Student: Ẹ ṣé, olùkọ́!
{"needs_rag": false, "question_type": "chitchat", "language": "yo"}
"""


classifier_llm = ChatOpenAI(
    model=os.environ["LLM_MODEL"],
    base_url=os.environ["LLM_BASE_URL"],
    api_key=os.environ["LLM_API_KEY"],
    temperature=0.0,
    max_tokens=80,
    max_retries=0,
    timeout=420,
)

async def classify(question: str) -> dict:
    default = {"needs_rag": True, "question_type": "other", "language": "mixed"}
    try:
        msg = await classifier_llm.ainvoke(
            [SystemMessage(CLASSIFIER_SYSTEM_PROMPT), HumanMessage(question)]
        )
        text = msg.content.strip().removeprefix("```json").removesuffix("```").strip()
        data = json.loads(text)
        return {**default, **data} if isinstance(data.get("needs_rag"), bool) else default
    except Exception:
        return default  # ante cualquier duda, RAG