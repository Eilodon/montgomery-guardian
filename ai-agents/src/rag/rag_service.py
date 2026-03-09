#!/usr/bin/env python3
"""
RAG Service for Montgomery Guardian
Provides retrieval-augmented generation capabilities
"""

import os
import sys
import json
import logging
import threading
from typing import List, Dict, Any, Optional
from datetime import datetime

# Guard: allow direct execution for debug
if __name__ == "__main__":
    _pkg_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if _pkg_root not in sys.path:
        sys.path.insert(0, _pkg_root)
    from rag.knowledge_base import get_knowledge_base, MontgomeryKnowledgeBase
else:
    from .knowledge_base import get_knowledge_base, MontgomeryKnowledgeBase

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global singleton state
_rag_service: Optional['RAGService'] = None
_rag_lock = threading.Lock()

_STOP_WORDS = frozenset({
    'how', 'do', 'i', 'a', 'an', 'the', 'is', 'are', 'was', 'were',
    'what', 'where', 'when', 'why', 'can', 'to', 'in', 'of', 'for',
    'me', 'my', 'on', 'at', 'by', 'be', 'it', 'or', 'and', 'if',
    'about', 'this', 'that', 'with', 'from', 'will', 'should', 'could'
})

class RAGService:
    """RAG service for intelligent document retrieval and response generation"""
    
    def __init__(self):
        """Initialize RAG service"""
        self.kb = get_knowledge_base()
        logger.info("RAG service initialized")
    
    def search_knowledge(self, query: str, category_filter: Optional[str] = None, max_results: int = 5) -> Dict[str, Any]:
        """Search knowledge base for relevant information"""
        try:
            # Query the knowledge base
            results = self.kb.query(
                query_text=query,
                n_results=max_results,
                category_filter=category_filter
            )
            
            # Enhance results with context
            enhanced_results = self._enhance_search_results(results, query)
            
            return {
                'query': query,
                'results': enhanced_results,
                'total_found': len(enhanced_results),
                'timestamp': datetime.now().isoformat(),
                'search_strategy': 'semantic_vector_search'
            }
            
        except Exception as e:
            logger.error(f"Knowledge search failed: {e}")
            return {
                'query': query,
                'results': [],
                'total_found': 0,
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }
    
    def _enhance_search_results(self, results: Dict[str, Any], query: str) -> List[Dict[str, Any]]:
        """Enhance search results with additional context"""
        enhanced = []
        
        if not results.get('results'):
            return enhanced
        
        for result in results['results']:
            # Add relevance explanation
            relevance_explanation = self._explain_relevance(result, query)
            
            # Tính trước, lưu vào biến cục bộ
            actionability = self._calculate_actionability(result)
            freshness = self._calculate_freshness(result)
            
            # Truyền các giá trị đã tính — không để _calculate_combined_score tự lookup
            combined = self._calculate_combined_score(
                similarity=result.get('similarity_score', 0),
                actionability=actionability,
                freshness=freshness,
                priority=result.get('metadata', {}).get('priority', 'medium')
            )
            
            enhanced_result = {
                'id': result.get('id', ''),
                'document': result.get('document', result.get('content', '')),
                'metadata': result.get('metadata', {}),
                'similarity_score': result.get('similarity_score', 0),
                'relevance_explanation': relevance_explanation,
                'actionability_score': actionability,
                'freshness_score': freshness,
                'combined_score': combined
            }
            
            enhanced.append(enhanced_result)
        
        # Sort by combined score
        enhanced.sort(key=lambda x: x['combined_score'], reverse=True)
        
        return enhanced

    def _calculate_combined_score(self, similarity: float, actionability: float, freshness: float, priority: str) -> float:
        """Tính combined score từ pre-calculated values."""
        priority_weights = {'high': 1.2, 'medium': 1.0, 'low': 0.8}
        weight = priority_weights.get(priority, 1.0)

        combined = (
            similarity    * 0.5 +
            actionability * 0.3 +
            freshness     * 0.2
        ) * weight

        return min(combined, 1.0)
    
    def get_context_for_query(self, query: str, max_context_length: int = 2000) -> str:
        """Get formatted context string for injection into LLM prompt."""
        try:
            search_results = self.search_knowledge(query, max_results=3)

            if not search_results.get('results'):
                return "No specific information found in the knowledge base."

            context_parts = []
            current_length = 0

            for result in search_results['results']:
                # Đọc đúng field — 'document' là canonical key sau enhancement
                content = result.get('document') or result.get('content', '')
                if not content:
                    continue

                metadata  = result.get('metadata', {})
                title     = metadata.get('title',  'City Information')
                source    = metadata.get('source', 'Official Source')
                relevance = result.get('relevance_explanation', '')
                score     = result.get('combined_score', 0)

                formatted_doc = (
                    f"[Source: {source} | Title: {title} | Score: {score:.2f}]\n"
                    f"{content}\n"
                    + (f"Relevance: {relevance}\n" if relevance else "")
                    + "---\n"
                )

                if current_length + len(formatted_doc) > max_context_length:
                    break

                context_parts.append(formatted_doc)
                current_length += len(formatted_doc)

            return '\n'.join(context_parts) if context_parts else "No relevant context found."

        except Exception as e:
            logger.error(f"get_context_for_query failed: {e}")
            return "Error retrieving context from knowledge base."
    
    def add_knowledge(self, documents: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Add new knowledge to the base"""
        try:
            self.kb.add_documents(documents)
            
            return {
                'success': True,
                'documents_added': len(documents),
                'timestamp': datetime.now().isoformat(),
                'message': f"Successfully added {len(documents)} documents to knowledge base"
            }
        except Exception as e:
            logger.error(f"Failed to add knowledge: {e}")
            return {
                'success': False,
                'documents_added': 0,
                'timestamp': datetime.now().isoformat(),
                'error': str(e),
                'message': "Failed to add documents to knowledge base"
            }
    
    def get_knowledge_stats(self) -> Dict[str, Any]:
        """Get knowledge base statistics"""
        try:
            return self.kb.get_stats()
        except Exception as e:
            logger.error(f"Failed to get stats: {e}")
            return {
                'total_documents': 0,
                'categories': {},
                'priorities': {},
                'error': str(e)
            }

    def _calculate_actionability(self, result: Dict[str, Any]) -> float:
        """Calculate how actionable the information is."""
        category = result.get('metadata', {}).get('category', 'general')
        actionable_categories = {'emergency': 1.0, 'services': 0.8, 'safety': 0.6}
        return actionable_categories.get(category, 0.4)

    def _calculate_freshness(self, result: Dict[str, Any]) -> float:
        """Calculate data freshness."""
        try:
            created_at = result.get('metadata', {}).get('created_at', '')
            if not created_at: return 0.5
            dt = datetime.fromisoformat(created_at)
            days_old = (datetime.now() - dt).days
            return max(0.0, 1.0 - (days_old / 365.0))
        except (ValueError, TypeError, AttributeError, OverflowError):
            logger.debug(f"Could not parse created_at for freshness calculation")
            return 0.5

    def _explain_relevance(self, result: Dict[str, Any], query: str) -> str:
        content     = result.get('document', result.get('content', '')).lower()
        query_lower = query.lower()

        meaningful_words = [
            w for w in query_lower.split()
            if w not in _STOP_WORDS and len(w) > 2
        ]

        matches = [word for word in meaningful_words if word in content]
        if matches:
            return f"Matches {len(matches)} key terms: {', '.join(matches[:4])}"

        category = result.get('metadata', {}).get('category', '')
        category_hints = {
            'emergency': (['emergency', '911', 'urgent', 'help', 'immediate'], 'Emergency procedure match'),
            'services':  (['service', 'report', 'request', '311', 'submit'],   'City service match'),
            'safety':    (['safe', 'danger', 'crime', 'security', 'risk'],      'Safety information match'),
        }

        for cat, (keywords, label) in category_hints.items():
            if category == cat and any(kw in query_lower for kw in keywords):
                return label

        score = result.get('similarity_score', 0)
        return f"Semantic match (score: {score:.2f})"


def get_rag_service() -> RAGService:
    """Thread-safe singleton getter with double-checked locking."""
    global _rag_service
    if _rag_service is None:
        with _rag_lock:
            if _rag_service is None:
                _rag_service = RAGService()
    return _rag_service


# API endpoints (simplified proxy to singleton)
def handle_search_request(request_data: Dict[str, Any]) -> Dict[str, Any]:
    return get_rag_service().search_knowledge(
        request_data.get('query', ''),
        request_data.get('category_filter'),
        request_data.get('max_results', 5)
    )

def handle_context_request(request_data: Dict[str, Any]) -> Dict[str, Any]:
    return {
        'query': request_data.get('query', ''),
        'context': get_rag_service().get_context_for_query(
            request_data.get('query', ''),
            request_data.get('max_length', 2000)
        ),
        'timestamp': datetime.now().isoformat()
    }

def handle_add_knowledge_request(request_data: Dict[str, Any]) -> Dict[str, Any]:
    return get_rag_service().add_knowledge(request_data.get('documents', []))

def handle_stats_request() -> Dict[str, Any]:
    return get_rag_service().get_knowledge_stats()


if __name__ == "__main__":
    service = get_rag_service()
    test_query = "How do I report a pothole?"
    print(f"Testing Query: {test_query}")
    results = service.search_knowledge(test_query)
    print(f"Top Result Relevance: {results['results'][0]['relevance_explanation']}")
    context = service.get_context_for_query(test_query)
    print(f"Context Sample: {context[:200]}...")
