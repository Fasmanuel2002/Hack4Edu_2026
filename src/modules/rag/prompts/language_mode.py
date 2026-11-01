# src/modules/rag/prompts/language_mode.py
import os
import re


YO_CHARS = re.compile("[ẹọṣẸỌṢ\u0323]")


ASK_YORUBA = re.compile(
    r"\b(responde|contesta|resp[oó]ndeme|expl[ií]came|expl[ií]calo|h[aá]blame|habla|"
    r"answer|reply|respond|explain|speak|talk)\b.{0,25}?\b(in|en|ní)\s+(èdè\s+)?yor[uùú]b[aá]",
    re.IGNORECASE,
)


ASK_ENGLISH = re.compile(
    r"\b(in|into|to)\s+english\b|\b(en|al)\s+ingl[eé]s\b", re.IGNORECASE
)


def wants_yoruba(question: str) -> bool:
    """True si hay que responder en yorùbá (formato bilingüe)."""
    if os.getenv("BILINGUAL_ALWAYS", "0") == "1":  # interruptor para volver al comportamiento anterior
        return True
    if ASK_ENGLISH.search(question):
        return False
    return bool(ASK_YORUBA.search(question) or YO_CHARS.search(question))