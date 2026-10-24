import os
from dotenv import load_dotenv
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, SparseVectorParams, Modifier
from langchain_ollama import OllamaEmbeddings
from langchain_qdrant import QdrantVectorStore, FastEmbedSparse, RetrievalMode

load_dotenv()


def get_embedding_model(model_name : str = "bge-m3")  -> OllamaEmbeddings:
    return OllamaEmbeddings(model=model_name, base_url = os.getenv("OLLAMA_BASE_URL"))

def get_sparse_model(model_name : str = "Qdrant/bm25") -> FastEmbedSparse:
    return FastEmbedSparse(model_name=model_name)

def get_qdrant_client(url: str | None = None) -> QdrantClient:
    """
    Qdrant client from the environment unless a url is given.
    """
    return QdrantClient(url=url or os.getenv("QDRANT_CLIENT_URL", "http://127.0.0.1:6333"), timeout=180)

def probe_vector_size(embedding_model : OllamaEmbeddings) -> int:
    return len(embedding_model.embed_query("Query for validate the dimensionality of the embeddings"))


def ensure_collection(client : QdrantClient, 
                      collection_name : str, 
                      vector_size : int,
                      dense_vector_name : str = "dense",
                      sparse_vector_name : str = "sparse") -> bool:
    "Create Hybrid collection with (cosine distance and BM25) if doesnt not exist"
    if client.collection_exists(collection_name=collection_name):
        return False
    client.create_collection(
        collection_name=collection_name,
        vectors_config={dense_vector_name : VectorParams(size=vector_size, distance=Distance.COSINE)}, #Cosine Distance
        sparse_vectors_config={sparse_vector_name : SparseVectorParams(modifier=Modifier.IDF)} #BM25
    )
    print(f"Colección '{collection_name}' creada (dense='{dense_vector_name}' [{vector_size} dims], sparse='{sparse_vector_name}' [BM25]).")
    return True


def create_vector_qdrant(
    qdrant_client : QdrantClient,
    collection_name : str,
    embedding_model : OllamaEmbeddings,
    sparse_embeddings: FastEmbedSparse ,
    retrieval_mode : RetrievalMode = RetrievalMode.HYBRID,
    vector_name : str = "dense",
    sparse_vector_name : str = "sparse",
    
    ) -> QdrantVectorStore:
    
    return QdrantVectorStore(
        client=qdrant_client,
        collection_name=collection_name,
        embedding=embedding_model,
        sparse_embedding=sparse_embeddings,
        retrieval_mode=retrieval_mode,
        vector_name=vector_name,
        sparse_vector_name=sparse_vector_name)