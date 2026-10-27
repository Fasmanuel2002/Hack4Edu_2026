from pydantic import BaseModel

class AskRequest(BaseModel):
    question : str

class AskResponse(BaseModel):
    answer : str

class Source(BaseModel):
    source_dataset : str
    search_context : str
    pedagogical_answer : str

class AskRagResponse(AskResponse):
    # The retrieved documents, best first (rank 1..3). No scores: RRF scores are not probabilities.
    sources : list[Source]
