#!/usr/bin/env python3
"""
RAG Knowledge Base for Montgomery Guardian
Uses ChromaDB for vector storage and retrieval
"""

import os
import json
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime

import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MontgomeryKnowledgeBase:
    """RAG knowledge base for Montgomery city information"""
    
    def __init__(self, persist_directory: str = "./chroma_db"):
        """Initialize the knowledge base"""
        self.persist_directory = persist_directory
        self.client = None
        self.collection = None
        self.embedding_model = None
        
        # Initialize components
        self._initialize_chroma()
        self._initialize_embedding_model()
        
    def _initialize_chroma(self):
        """Initialize ChromaDB client and collection"""
        try:
            # Create ChromaDB client
            self.client = chromadb.PersistentClient(
                path=self.persist_directory,
                settings=Settings(allow_reset=True)
            )
            
            # Get or create collection
            self.collection = self.client.get_or_create_collection(
                name="montgomery_knowledge",
                metadata={"description": "Montgomery city knowledge base"}
            )
            
            logger.info(f"ChromaDB initialized with {self.collection.count()} documents")
            
        except Exception as e:
            logger.error(f"Failed to initialize ChromaDB: {e}")
            raise
    
    def _initialize_embedding_model(self):
        """Initialize sentence transformer model"""
        try:
            # Use a lightweight but effective model
            self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
            logger.info("Sentence transformer model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to initialize embedding model: {e}")
            raise
    
    def add_documents(self, documents: List[Dict[str, Any]]):
        """Add documents to the knowledge base"""
        try:
            if not documents:
                return
            
            # Prepare documents for ChromaDB
            ids = []
            texts = []
            metadatas = []
            
            for i, doc in enumerate(documents):
                doc_id = doc.get('id', f"doc_{i}_{datetime.now().timestamp()}")
                ids.append(doc_id)
                texts.append(doc['content'])
                
                # Prepare metadata
                metadata = {
                    'source': doc.get('source', 'unknown'),
                    'category': doc.get('category', 'general'),
                    'priority': doc.get('priority', 'medium'),
                    'created_at': doc.get('created_at', datetime.now().isoformat()),
                    'title': doc.get('title', ''),
                    'url': doc.get('url', ''),
                }
                metadatas.append(metadata)
            
            # Generate embeddings
            embeddings = self.embedding_model.encode(texts).tolist()
            
            # Add to collection
            self.collection.add(
                ids=ids,
                documents=texts,
                metadatas=metadatas,
                embeddings=embeddings
            )
            
            logger.info(f"Added {len(documents)} documents to knowledge base")
            
        except Exception as e:
            logger.error(f"Failed to add documents: {e}")
            raise
    
    def query(self, query_text: str, n_results: int = 5, category_filter: Optional[str] = None) -> Dict[str, Any]:
        """Query the knowledge base"""
        try:
            # Generate query embedding
            query_embedding = self.embedding_model.encode([query_text]).tolist()
            
            # Prepare where clause for filtering
            where_clause = None
            if category_filter:
                where_clause = {"category": category_filter}
            
            # Query collection
            results = self.collection.query(
                query_embeddings=query_embedding,
                n_results=n_results,
                where=where_clause,
                include=['documents', 'metadatas', 'distances']
            )
            
            # Format results
            formatted_results = []
            if results['ids'] and results['ids'][0]:
                for i in range(len(results['ids'][0])):
                    formatted_results.append({
                        'id': results['ids'][0][i],
                        'content': results['documents'][0][i],
                        'metadata': results['metadatas'][0][i],
                        'similarity_score': 1 - results['distances'][0][i],  # Convert distance to similarity
                        'relevance': self._calculate_relevance(results['distances'][0][i])
                    })
            
            return {
                'query': query_text,
                'results': formatted_results,
                'total_found': len(formatted_results),
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to query knowledge base: {e}")
            return {
                'query': query_text,
                'results': [],
                'total_found': 0,
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }
    
    def _calculate_relevance(self, distance: float) -> str:
        """Calculate relevance category based on distance"""
        if distance < 0.3:
            return "high"
        elif distance < 0.6:
            return "medium"
        else:
            return "low"
    
    def get_document_by_id(self, doc_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific document by ID"""
        try:
            results = self.collection.get(
                ids=[doc_id],
                include=['documents', 'metadatas']
            )
            
            if results['ids'] and results['ids'][0]:
                return {
                    'id': results['ids'][0][0],
                    'content': results['documents'][0][0],
                    'metadata': results['metadatas'][0][0]
                }
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to get document {doc_id}: {e}")
            return None
    
    def delete_document(self, doc_id: str) -> bool:
        """Delete a document by ID"""
        try:
            self.collection.delete(ids=[doc_id])
            logger.info(f"Deleted document {doc_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete document {doc_id}: {e}")
            return False
    
    def get_stats(self) -> Dict[str, Any]:
        """Get knowledge base statistics"""
        try:
            total_docs = self.collection.count()
            
            # Get category distribution
            all_docs = self.collection.get(include=['metadatas'])
            categories = {}
            priorities = {}
            
            if all_docs['metadatas']:
                for metadata in all_docs['metadatas']:
                    category = metadata.get('category', 'unknown')
                    priority = metadata.get('priority', 'medium')
                    
                    categories[category] = categories.get(category, 0) + 1
                    priorities[priority] = priorities.get(priority, 0) + 1
            
            return {
                'total_documents': total_docs,
                'categories': categories,
                'priorities': priorities,
                'last_updated': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to get stats: {e}")
            return {
                'total_documents': 0,
                'categories': {},
                'priorities': {},
                'error': str(e)
            }
    
    def reset(self):
        """Reset the knowledge base"""
        try:
            self.client.reset()
            self._initialize_chroma()
            logger.info("Knowledge base reset successfully")
        except Exception as e:
            logger.error(f"Failed to reset knowledge base: {e}")
            raise


def load_initial_knowledge(kb: MontgomeryKnowledgeBase):
    """Load initial knowledge into the knowledge base"""
    
    # Montgomery city information
    city_docs = [
        {
            'id': 'city_info_1',
            'content': 'Montgomery is the capital city of Alabama, located in Montgomery County. The city has a population of approximately 200,000 residents and serves as the political and economic center of the state.',
            'source': 'city_official',
            'category': 'city_info',
            'priority': 'high',
            'title': 'Montgomery City Overview',
            'created_at': datetime.now().isoformat()
        },
        {
            'id': 'city_info_2',
            'content': 'Montgomery Police Department provides 24/7 emergency services. For emergencies, call 911. For non-emergency police matters, call 334-625-2532.',
            'source': 'police_dept',
            'category': 'emergency',
            'priority': 'high',
            'title': 'Police Emergency Contacts',
            'created_at': datetime.now().isoformat()
        },
        {
            'id': 'city_info_3',
            'content': 'Montgomery 311 service allows residents to report non-emergency issues like potholes, street lights, trash collection, and code violations. Services can be requested by calling 311, using the mobile app, or visiting the city website.',
            'source': 'city_services',
            'category': 'services',
            'priority': 'high',
            'title': '311 Service Information',
            'created_at': datetime.now().isoformat()
        }
    ]
    
    # Safety information
    safety_docs = [
        {
            'id': 'safety_1',
            'content': 'Downtown Montgomery generally has higher crime rates during evening hours (8 PM - 2 AM). Residents are advised to be aware of surroundings and travel in groups when possible.',
            'source': 'police_analysis',
            'category': 'safety',
            'priority': 'medium',
            'title': 'Downtown Safety Information',
            'created_at': datetime.now().isoformat()
        },
        {
            'id': 'safety_2',
            'content': 'The safest neighborhoods in Montgomery include Cloverdale, Garden District, and Old Cloverdale. These areas have lower crime rates and active neighborhood watch programs.',
            'source': 'crime_stats',
            'category': 'safety',
            'priority': 'medium',
            'title': 'Safe Neighborhoods',
            'created_at': datetime.now().isoformat()
        }
    ]
    
    # Service information
    service_docs = [
        {
            'id': 'service_1',
            'content': 'Pothole repair requests through 311 typically take 3-7 business days to address, depending on severity and weather conditions. Emergency potholes are prioritized.',
            'source': 'public_works',
            'category': 'services',
            'priority': 'medium',
            'title': 'Pothole Repair Timeline',
            'created_at': datetime.now().isoformat()
        },
        {
            'id': 'service_2',
            'content': 'Street light outages should be reported to 311 with the pole number and exact location. Alabama Power handles most street light repairs within 5-10 business days.',
            'source': 'public_works',
            'category': 'services',
            'priority': 'medium',
            'title': 'Street Light Repair Process',
            'created_at': datetime.now().isoformat()
        }
    ]
    
    # Emergency procedures
    emergency_docs = [
        {
            'id': 'emergency_1',
            'content': 'In case of severe weather, Montgomery Emergency Management Agency operates shelters throughout the city. Residents should monitor local news and sign up for emergency alerts.',
            'source': 'emergency_mgmt',
            'category': 'emergency',
            'priority': 'high',
            'title': 'Severe Weather Procedures',
            'created_at': datetime.now().isoformat()
        },
        {
            'id': 'emergency_2',
            'content': 'Active shooter situations: Run, Hide, Fight. If you can safely escape, do so immediately. If not, hide and silence your phone. Fight only as a last resort.',
            'source': 'fbi_guidelines',
            'category': 'emergency',
            'priority': 'high',
            'title': 'Active Shooter Response',
            'created_at': datetime.now().isoformat()
        }
    ]
    
    all_docs = city_docs + safety_docs + service_docs + emergency_docs
    
    try:
        kb.add_documents(all_docs)
        logger.info(f"Loaded {len(all_docs)} initial documents into knowledge base")
    except Exception as e:
        logger.error(f"Failed to load initial knowledge: {e}")


# Initialize global knowledge base instance
knowledge_base = None

def get_knowledge_base() -> MontgomeryKnowledgeBase:
    """Get or create the global knowledge base instance"""
    global knowledge_base
    if knowledge_base is None:
        knowledge_base = MontgomeryKnowledgeBase()
        
        # Load initial data if collection is empty
        if knowledge_base.collection.count() == 0:
            logger.info("Loading initial knowledge into empty database")
            load_initial_knowledge(knowledge_base)
    
    return knowledge_base


if __name__ == "__main__":
    # Test the knowledge base
    kb = MontgomeryKnowledgeBase()
    
    # Test queries
    test_queries = [
        "How do I report a pothole?",
        "Is downtown Montgomery safe at night?",
        "What should I do in an emergency?",
        "Where can I find city services?"
    ]
    
    for query in test_queries:
        print(f"\nQuery: {query}")
        results = kb.query(query, n_results=3)
        print(f"Results: {json.dumps(results, indent=2)}")
