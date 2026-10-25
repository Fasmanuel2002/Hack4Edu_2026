from pathlib import Path
import pandas as pd
from langchain_core.runnables import Runnable
from src.modules.rag.storage.qdrant_manager import (get_qdrant_client, get_embedding_model, get_sparse_model, probe_vector_size, ensure_collection)
from src.modules.rag.loaders.robust_text_loader import add_documents_vector_store
from src.modules.rag.retriever.retrieval import get_hybrid_retriever
from src.modules.rag.prompts.rag_prompt import build_rag_chain

REPO_PATH = Path(__file__).resolve().parents[3]
RAG_DATA_PATH = REPO_PATH / "dataset_rag.csv"
COLLECTION_NAME = "hack4edu_collection"


def build_rag_runtime() -> Runnable:
    qdrant_client = get_qdrant_client()
    embedding_model = get_embedding_model()
    sparse_embeddings = get_sparse_model()
    ensure_collection(qdrant_client, COLLECTION_NAME, probe_vector_size(embedding_model))

  
    df_african = pd.read_csv(RAG_DATA_PATH)
    vector_store = add_documents_vector_store(
        df_african, qdrant_client, COLLECTION_NAME, embedding_model, sparse_embeddings)

    return build_rag_chain(get_hybrid_retriever(vector_store))
