from langchain_community.document_loaders import DataFrameLoader
from langchain_core.documents import Document
from typing import List
import pandas as pd
from qdrant_client import QdrantClient
from langchain_ollama import OllamaEmbeddings
from langchain_qdrant import QdrantVectorStore, FastEmbedSparse, RetrievalMode
from src.modules.rag.storage.qdrant_manager import create_vector_qdrant
from uuid import uuid5, NAMESPACE_URL


def add_documents_vector_store(
    df_african: pd.DataFrame, 
    qdrant_client: QdrantClient, 
    collection_name: str, 
    embedding_model: OllamaEmbeddings,
    sparse_embeddings: FastEmbedSparse, 
    retrieval_mode: RetrievalMode = RetrievalMode.HYBRID, 
    vector_name: str = "dense", 
    sparse_vector_name: str = "sparse") -> QdrantVectorStore:
    vector_store = create_vector_qdrant(qdrant_client, collection_name, embedding_model, sparse_embeddings, retrieval_mode, vector_name, sparse_vector_name)
    
    existing_count = qdrant_client.count(collection_name).count
    if existing_count == len(df_african):
        print("The collection has already all the documents")
        return vector_store
    print(f"The collection has {existing_count}/{len(df_african)} documents, adding the documents")
    documents = dataframe_to_documents(df_african)
    # Same row -> same id, so a re-run after a crash overwrites instead of duplicating
    uuids = [str(uuid5(NAMESPACE_URL, str(i))) for i in range(len(documents))]
    vector_store.add_documents(documents=documents, ids=uuids)
    return vector_store


def dataframe_to_documents(df_african : pd.DataFrame) -> List[Document]:
    """
    Transforms a dataframe to Documents
    """
    loader = DataFrameLoader(
                data_frame=df_african,
                page_content_column="search_context")
            
    return loader.load()