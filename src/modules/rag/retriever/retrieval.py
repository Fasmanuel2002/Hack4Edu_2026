from langchain_qdrant import QdrantVectorStore
from langchain_core.vectorstores import VectorStoreRetriever
from langchain_core.documents import Document


def format_documents(docs: list[Document]) -> str:
    return "\n---\n".join(
        f"[Source: {doc.metadata['source_dataset']}]\n"
        f"[Question]: {doc.page_content}\n"
        f"{doc.metadata['pedagogical_answer']}"
        for doc in docs
    )

def get_hybrid_retriever(
    vector_store : QdrantVectorStore,
    k_children : int = 3) -> VectorStoreRetriever:
    
    vector_store_retriever = vector_store.as_retriever(
        search_type="similarity",
        search_kwargs={"k": k_children})
    
    return vector_store_retriever


