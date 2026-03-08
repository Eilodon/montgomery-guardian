# backend/etl/chroma_setup.py
import chromadb
from chromadb.utils.embedding_functions import SentenceTransformerEmbeddingFunction
import pandas as pd
from pathlib import Path
import json
from datetime import datetime

class ChromaSetup:
    def __init__(self):
        # Initialize ChromaDB client
        self.client = chromadb.PersistentClient(
            path="./chroma_db"
        )
        # Add embedding function
        self.embedding_fn = SentenceTransformerEmbeddingFunction(model_name="all-MiniLM-L6-v2")
        
    def create_collections(self):
        """Create collections for RAG knowledge base"""
        try:
            # Create crime incidents collection
            crime_collection = self.client.get_or_create_collection(
                name="crime_incidents",
                embedding_function=self.embedding_fn,
                metadata={"description": "Crime incident data for RAG"}
            )
            
            # Create 311 requests collection
            requests_collection = self.client.get_or_create_collection(
                name="service_requests_311", 
                embedding_function=self.embedding_fn,
                metadata={"description": "311 service request data for RAG"}
            )
            
            # Create city policies collection
            policies_collection = self.client.get_or_create_collection(
                name="city_policies",
                embedding_function=self.embedding_fn,
                metadata={"description": "City policies and procedures"}
            )
            
            print("✅ ChromaDB collections created successfully")
            return crime_collection, requests_collection, policies_collection
            
        except Exception as e:
            print(f"❌ Failed to create collections: {e}")
            raise
    
    def populate_with_fallback_data(self):
        """Populate collections with fallback data"""
        try:
            # Get collections
            crime_collection, requests_collection, policies_collection = self.create_collections()
            
            # Load fallback data
            data_dir = Path("etl/data")
            crime_df = pd.read_csv(data_dir / "crime_mapping_fallback.csv")
            requests_df = pd.read_csv(data_dir / "requests_311_fallback.csv")
            
            # Prepare crime documents for embedding
            crime_documents = []
            crime_ids = []
            crime_metadatas = []
            
            for _, row in crime_df.iterrows():
                doc = f"""
                Crime Incident: {row.get('crimetype', 'Unknown')}
                Location: {row.get('neighborhood', 'Unknown')}
                Date: {row.get('incidentdate', 'Unknown')}
                Status: {row.get('status', 'Unknown')}
                Description: {row.get('description', 'No description available')}
                """
                crime_documents.append(doc.strip())
                crime_ids.append(f"crime_{row.get('objectid', _)}")
                crime_metadatas.append({
                    "type": "crime",
                    "crimetype": row.get('crimetype', 'Unknown'),
                    "neighborhood": row.get('neighborhood', 'Unknown'),
                    "latitude": row.get('latitude', 0),
                    "longitude": row.get('longitude', 0),
                    "date": row.get('incidentdate', 'Unknown')
                })
            
            # Add crime documents to collection
            if crime_documents:
                crime_collection.add(
                    documents=crime_documents,
                    ids=crime_ids,
                    metadatas=crime_metadatas
                )
                print(f"✅ Added {len(crime_documents)} crime documents to ChromaDB")
            
            # Prepare 311 request documents
            requests_documents = []
            requests_ids = []
            requests_metadatas = []
            
            for _, row in requests_df.iterrows():
                doc = f"""
                311 Service Request: {row.get('servicetype', 'Unknown')}
                Address: {row.get('address', 'Unknown')}
                Date Created: {row.get('datecreated', 'Unknown')}
                Status: {row.get('status', 'Unknown')}
                Description: {row.get('description', 'No description available')}
                """
                requests_documents.append(doc.strip())
                requests_ids.append(f"request_{row.get('objectid', _)}")
                requests_metadatas.append({
                    "type": "service_request",
                    "servicetype": row.get('servicetype', 'Unknown'),
                    "address": row.get('address', 'Unknown'),
                    "latitude": row.get('latitude', 0),
                    "longitude": row.get('longitude', 0),
                    "date": row.get('datecreated', 'Unknown')
                })
            
            # Add 311 request documents to collection
            if requests_documents:
                requests_collection.add(
                    documents=requests_documents,
                    ids=requests_ids,
                    metadatas=requests_metadatas
                )
                print(f"✅ Added {len(requests_documents)} 311 request documents to ChromaDB")
            
            # Add sample city policies
            sample_policies = [
                {
                    "id": "policy_001",
                    "text": "Montgomery 311 Service Request Guidelines: Residents can report non-emergency issues such as potholes, graffiti, trash collection, and flooding through the 311 system. Most requests are resolved within 3-7 business days.",
                    "metadata": {"type": "policy", "category": "311_guidelines"}
                },
                {
                    "id": "policy_002", 
                    "text": "Crime Reporting: For emergencies, call 911 immediately. For non-emergency crime reports, contact Montgomery Police Department non-emergency line. Always provide accurate location and time information.",
                    "metadata": {"type": "policy", "category": "crime_reporting"}
                },
                {
                    "id": "policy_003",
                    "text": "Pothole Repair Process: Pothole reports are typically addressed within 48-72 hours based on severity. Major road hazards are prioritized over minor cosmetic damage.",
                    "metadata": {"type": "policy", "category": "pothole_repair"}
                }
            ]
            
            policies_collection.add(
                documents=[p["text"] for p in sample_policies],
                ids=[p["id"] for p in sample_policies],
                metadatas=[p["metadata"] for p in sample_policies]
            )
            print(f"✅ Added {len(sample_policies)} policy documents to ChromaDB")
            
            print("✅ ChromaDB populated successfully with fallback data")
            
        except Exception as e:
            print(f"❌ Failed to populate ChromaDB: {e}")
            raise
    
    def test_chroma_connection(self):
        """Test ChromaDB connection and data"""
        try:
            collections = self.client.list_collections()
            print(f"✅ ChromaDB connection successful. Found {len(collections)} collections:")
            
            for collection in collections:
                count = collection.count()
                print(f"  - {collection.name}: {count} documents")
                
            return True
        except Exception as e:
            print(f"❌ ChromaDB connection failed: {e}")
            return False

def setup_chroma():
    """Setup ChromaDB with fallback data"""
    chroma = ChromaSetup()
    
    # Test connection
    collections = chroma.client.list_collections()
    if len(collections) > 0:
        print(f"ChromaDB already initialized with {len(collections)} collections")
    else:
        # Populate with data
        print("Populating ChromaDB...")
        chroma.populate_with_fallback_data()
        chroma.test_chroma_connection()

if __name__ == "__main__":
    setup_chroma()
