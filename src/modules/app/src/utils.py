import unicodedata, pymupdf, docx
from fastapi import HTTPException
import io

def extract_text(file_bytes: bytes, filename: str) -> str:
    name = filename.lower()
    if name.endswith(".pdf"):
        text = "".join(p.get_text() for p in pymupdf.open(stream=file_bytes, filetype="pdf"))
    elif name.endswith(".docx"):
        text = "\n".join(p.text for p in docx.Document(io.BytesIO(file_bytes)).paragraphs)
    elif name.endswith(".txt"):
        text = file_bytes.decode("utf-8", errors="replace")
    else:
        raise HTTPException(400, "the format is not supported. Only support PDF, DOCX and TXT")
    text = unicodedata.normalize("NFC", text).strip()
    if len(text) < 50:
        raise HTTPException(422, "No se pudo leer texto (¿PDF escaneado?)")
    return text