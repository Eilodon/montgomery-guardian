import chromadb
from chromadb.utils.embedding_functions import SentenceTransformerEmbeddingFunction
import json

def test_rag_routing():
    client = chromadb.PersistentClient(path="./chroma_db")
    embedding_fn = SentenceTransformerEmbeddingFunction(model_name="all-MiniLM-L6-v2")
    
    collection = client.get_collection(name="montgomery_knowledge", embedding_function=embedding_fn)
    
    print(f"Total documents in collection: {collection.count()}")
    
    categories = ["crime", "service_request", "city_policy"]
    
    for cat in categories:
        results = collection.query(
            query_texts=["test query"],
            n_results=3,
            where={"category": cat}
        )
        print(f"\nCategory: {cat}")
        print(f"Found {len(results['ids'][0])} results")
        if len(results['ids'][0]) > 0:
            print(f"Sample Metadata: {results['metadatas'][0][0]}")

if __name__ == "__main__":
    test_rag_routing()
