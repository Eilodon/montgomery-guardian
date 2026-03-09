import os
import json
import logging
import threading
import time
import uuid
from typing import List, Dict, Any, Optional
from datetime import datetime

import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global singleton state
_knowledge_base: Optional['MontgomeryKnowledgeBase'] = None
_kb_lock = threading.Lock()

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
        
        # Stats cache
        self._stats_cache: Dict[str, Any] = {}
        self._stats_cache_timestamp: float = 0.0
        self.stats_cache_ttl = 60.0 # 60 seconds
        
    def _initialize_chroma(self):
        """Initialize ChromaDB client and collection with environment gating."""
        try:
            # allow_reset chỉ được phép trong môi trường development
            environment = os.getenv('ENVIRONMENT', 'production').lower()
            allow_reset = environment == 'development'

            if allow_reset:
                logger.warning(
                    "ChromaDB initialized with allow_reset=True. "
                    "This is a DEVELOPMENT-ONLY setting. "
                    "Set ENVIRONMENT=production to disable."
                )

            self.client = chromadb.PersistentClient(
                path=self.persist_directory,
                settings=Settings(allow_reset=allow_reset)
            )
            
            self.collection = self.client.get_or_create_collection(
                name="montgomery_knowledge",
                metadata={"description": "Montgomery city knowledge base"}
            )
            
            logger.info(
                f"ChromaDB initialized | env={environment} | "
                f"allow_reset={allow_reset} | "
                f"docs={self.collection.count()}"
            )
            
        except Exception as e:
            logger.error(f"Failed to initialize ChromaDB: {e}")
            raise
    
    def _initialize_embedding_model(self):
        """Initialize sentence transformer model"""
        try:
            # Use a lightweight but effective model
            self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2', device='cpu')
            logger.info("Sentence transformer model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to initialize embedding model: {e}")
            raise
    
    def add_documents(self, documents: List[Dict[str, Any]]):
        """Add documents to the knowledge base with defensive content resolution."""
        if not documents:
            logger.warning("add_documents called with empty list")
            return

        ids, texts, metadatas = [], [], []
        skipped = 0

        for i, doc in enumerate(documents):
            # --- Defensive content resolution ---
            content = (
                doc.get('content')
                or doc.get('text')
                or doc.get('body')
            )
            if not content or not isinstance(content, str) or not content.strip():
                logger.warning(
                    f"Skipping document at index {i}: missing/empty content. "
                    f"Available keys: {list(doc.keys())}"
                )
                skipped += 1
                continue

            # --- Safe ID generation ---
            doc_id = str(doc.get('id') or f"doc_{i}_{uuid.uuid4().hex[:12]}")

            ids.append(doc_id)
            texts.append(content.strip())
            
            # ChromaDB accepts str | int | float | bool. Cast for safety.
            metadatas.append({
                'source':     str(doc.get('source', 'unknown'))[:100],
                'category':   str(doc.get('category', 'general'))[:50],
                'priority':   str(doc.get('priority', 'medium'))[:20],
                'created_at': str(doc.get('created_at', datetime.now().isoformat())),
                'title':      str(doc.get('title', ''))[:200],
                'url':        str(doc.get('url', ''))[:500],
            })

        if not ids:
            logger.error(f"All {len(documents)} documents were skipped. Nothing added.")
            return

        try:
            embeddings = self.embedding_model.encode(texts).tolist()
            self.collection.add(
                ids=ids,
                documents=texts,
                metadatas=metadatas,
                embeddings=embeddings
            )
            logger.info(
                f"Added {len(ids)} documents. "
                f"Skipped {skipped}. Total in KB: {self.collection.count()}"
            )
            # Invalidate cache
            self._stats_cache_timestamp = 0
        except Exception as e:
            logger.error(f"ChromaDB batch insert failed: {e}")
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
                        'document': results['documents'][0][i],
                        'metadata': results['metadatas'][0][i],
                        'similarity_score': 1 - results['distances'][0][i],
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
                    'document': results['documents'][0][0],
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
            # Invalidate cache
            self._stats_cache_timestamp = 0
            return True
        except Exception as e:
            logger.error(f"Failed to delete document {doc_id}: {e}")
            return False
    
    def get_stats(self) -> Dict[str, Any]:
        """Get knowledge base statistics with TTL cache."""
        now = time.monotonic()
        if self._stats_cache and (now - self._stats_cache_timestamp) < self.stats_cache_ttl:
            return {**self._stats_cache, 'cached': True}

        try:
            total_docs = self.collection.count()
            
            # Fetch only metadatas to save RAM and time
            all_meta = self.collection.get(include=['metadatas'])
            categories = {}
            priorities = {}
            
            for metadata in (all_meta.get('metadatas') or []):
                category = metadata.get('category', 'unknown')
                priority = metadata.get('priority', 'medium')
                categories[category] = categories.get(category, 0) + 1
                priorities[priority] = priorities.get(priority, 0) + 1
            
            result = {
                'total_documents': total_docs,
                'categories': categories,
                'priorities': priorities,
                'last_updated': datetime.now().isoformat(),
                'cached': False
            }
            
            self._stats_cache = result
            self._stats_cache_timestamp = now
            return result
            
        except Exception as e:
            logger.error(f"Failed to get stats: {e}")
            return {
                'total_documents': 0,
                'categories': {},
                'priorities': {},
                'error': str(e)
            }
    
    def reset(self, confirm: bool = False):
        """Reset (xóa và tạo lại) collection montgomery_knowledge."""
        if not confirm:
            raise ValueError(
                "reset() requires confirm=True to prevent accidental data loss."
            )
        try:
            self.client.delete_collection("montgomery_knowledge")
            logger.warning("Collection 'montgomery_knowledge' deleted.")
            self._initialize_chroma()
            logger.info("Collection 'montgomery_knowledge' recreated empty.")
        except Exception as e:
            logger.error(f"Failed to reset collection: {e}")
            raise


def load_initial_knowledge(kb: MontgomeryKnowledgeBase):
    """Load initial knowledge into the knowledge base"""
    
    city_docs = [
        {
            'id': 'city_info_1',
            'content': 'Montgomery is the capital city of Alabama... serves as the political and economic center of the state.',
            'source': 'city_official',
            'category': 'city_info',
            'priority': 'high',
            'title': 'Montgomery City Overview'
        },
        {
            'id': 'city_info_2',
            'content': 'Montgomery Police Department provides 24/7 emergency services. For emergencies, call 911.',
            'source': 'police_dept',
            'category': 'emergency',
            'priority': 'high',
            'title': 'Police Emergency Contacts'
        },
        {
            'id': 'city_info_3',
            'content': 'Montgomery 311 service allows residents to report non-emergency issues like potholes.',
            'source': 'city_services',
            'category': 'services',
            'priority': 'high',
            'title': '311 Service Information'
        }
    ]
    
    try:
        kb.add_documents(city_docs)
    except Exception as e:
        logger.error(f"Failed to load initial knowledge: {e}")


def get_knowledge_base() -> MontgomeryKnowledgeBase:
    """Thread-safe singleton getter with double-checked locking."""
    global _knowledge_base
    if _knowledge_base is None:
        with _kb_lock:
            if _knowledge_base is None:
                _knowledge_base = MontgomeryKnowledgeBase()
                if _knowledge_base.collection.count() == 0:
                    logger.info("Empty KB detected, loading initial knowledge...")
                    load_initial_knowledge(_knowledge_base)
    return _knowledge_base


if __name__ == "__main__":
    # Test the knowledge base
    kb = get_knowledge_base()
    print(f"KB initialized with {kb.collection.count()} docs.")
    stats = kb.get_stats()
    print(f"Stats: {json.dumps(stats, indent=2)}")
