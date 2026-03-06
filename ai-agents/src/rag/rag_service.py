#!/usr/bin/env python3
"""
RAG Service for Montgomery Guardian
Provides retrieval-augmented generation capabilities
"""

import os
import json
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime

from .knowledge_base import get_knowledge_base, MontgomeryKnowledgeBase

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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
            
            # Add actionability score
            actionability = self._calculate_actionability(result)
            
            # Add freshness score
            freshness = self._calculate_freshness(result)
            
            enhanced_result = {
                **result,
                'relevance_explanation': relevance_explanation,
                'actionability_score': actionability,
                'freshness_score': freshness,
                'combined_score': self._calculate_combined_score(result, query)
            }
            
            enhanced.append(enhanced_result)
        
        # Sort by combined score
        enhanced.sort(key=lambda x: x['combined_score'], reverse=True)
        
        return enhanced
    
    def _explain_relevance(self, result: Dict[str, Any], query: str) -> str:
        """Explain why a result is relevant to the query"""
        content = result.get('content', '').lower()
        query_lower = query.lower()
        
        # Check for direct keyword matches
        query_words = query_lower.split()
        matches = [word for word in query_words if word in content]
        
        if matches:
            return f"Contains {len(matches)} matching keywords: {', '.join(matches[:3])}"
        
        # Check for semantic relevance based on category
        category = result.get('metadata', {}).get('category', '')
        if category == 'emergency' and any(word in query_lower for word in ['emergency', '911', 'help', 'urgent']):
            return "Emergency information relevant to urgent queries"
        elif category == 'services' and any(word in query_lower for word in ['service', 'report', 'request', '311']):
            return "City service information for municipal requests"
        elif category == 'safety' and any(word in query_lower for word in ['safe', 'danger', 'crime', 'security']):
            return "Safety information relevant to security concerns"
        
        return f"Semantically relevant (similarity: {result.get('similarity_score', 0):.2f})"
    
    def _calculate_actionability(self, result: Dict[str, Any]) -> float:
        """Calculate how actionable the information is"""
        content = result.get('content', '').lower()
        category = result.get('metadata', {}).get('category', '')
        
        actionability = 0.5  # Base score
        
        # Boost for actionable content
        if any(word in content for word in ['call', 'contact', 'report', 'visit', 'go to', 'use']):
            actionability += 0.2
        
        # Boost for service information
        if category == 'services':
            actionability += 0.2
        
        # Boost for emergency procedures
        if category == 'emergency' and any(word in content for word in ['should', 'do', 'steps', 'procedure']):
            actionability += 0.1
        
        return min(actionability, 1.0)
    
    def _calculate_freshness(self, result: Dict[str, Any]) -> float:
        """Calculate freshness score based on creation time"""
        created_at = result.get('metadata', {}).get('created_at', '')
        if not created_at:
            return 0.5
        
        try:
            created_date = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
            now = datetime.now()
            days_old = (now - created_date).days
            
            # Newer content gets higher score
            if days_old <= 7:
                return 1.0
            elif days_old <= 30:
                return 0.8
            elif days_old <= 90:
                return 0.6
            else:
                return 0.4
        except:
            return 0.5
    
    def _calculate_combined_score(self, result: Dict[str, Any], query: str) -> float:
        """Calculate combined relevance score"""
        similarity = result.get('similarity_score', 0)
        actionability = result.get('actionability_score', 0.5)
        freshness = result.get('freshness_score', 0.5)
        priority = result.get('metadata', {}).get('priority', 'medium')
        
        # Priority weights
        priority_weights = {'high': 1.2, 'medium': 1.0, 'low': 0.8}
        priority_weight = priority_weights.get(priority, 1.0)
        
        # Combined score with weighted components
        combined = (
            similarity * 0.5 +           # 50% semantic similarity
            actionability * 0.3 +         # 30% actionability
            freshness * 0.2                # 20% freshness
        ) * priority_weight                 # Priority multiplier
        
        return min(combined, 1.0)
    
    def get_context_for_query(self, query: str, max_context_length: int = 2000) -> str:
        """Get formatted context for a query"""
        try:
            # Search for relevant documents
            search_results = self.search_knowledge(query, max_results=3)
            
            if not search_results.get('results'):
                return "No specific information found in the knowledge base."
            
            # Format context
            context_parts = []
            current_length = 0
            
            for result in search_results['results']:
                content = result.get('content', '')
                metadata = result.get('metadata', {})
                title = metadata.get('title', 'Unknown')
                source = metadata.get('source', 'Unknown')
                
                # Format document
                formatted_doc = f"""
Document: {title}
Source: {source}
Content: {content}
Relevance: {result.get('relevance_explanation', 'N/A')}
---
"""
                
                # Check length limit
                if current_length + len(formatted_doc) > max_context_length:
                    break
                
                context_parts.append(formatted_doc)
                current_length += len(formatted_doc)
            
            return ''.join(context_parts)
            
        except Exception as e:
            logger.error(f"Failed to get context: {e}")
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


# Global RAG service instance
rag_service = None

def get_rag_service() -> RAGService:
    """Get or create the global RAG service instance"""
    global rag_service
    if rag_service is None:
        rag_service = RAGService()
    return rag_service


# API endpoints
def handle_search_request(request_data: Dict[str, Any]) -> Dict[str, Any]:
    """Handle search requests from the API"""
    try:
        query = request_data.get('query', '')
        category_filter = request_data.get('category_filter')
        max_results = request_data.get('max_results', 5)
        
        if not query:
            return {
                'error': 'Query is required',
                'timestamp': datetime.now().isoformat()
            }
        
        service = get_rag_service()
        return service.search_knowledge(query, category_filter, max_results)
        
    except Exception as e:
        logger.error(f"Search request failed: {e}")
        return {
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }


def handle_context_request(request_data: Dict[str, Any]) -> Dict[str, Any]:
    """Handle context requests for AI generation"""
    try:
        query = request_data.get('query', '')
        max_length = request_data.get('max_length', 2000)
        
        if not query:
            return {
                'error': 'Query is required',
                'timestamp': datetime.now().isoformat()
            }
        
        service = get_rag_service()
        context = service.get_context_for_query(query, max_length)
        
        return {
            'query': query,
            'context': context,
            'timestamp': datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Context request failed: {e}")
        return {
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }


def handle_add_knowledge_request(request_data: Dict[str, Any]) -> Dict[str, Any]:
    """Handle add knowledge requests"""
    try:
        documents = request_data.get('documents', [])
        
        if not documents:
            return {
                'error': 'Documents are required',
                'timestamp': datetime.now().isoformat()
            }
        
        service = get_rag_service()
        return service.add_knowledge(documents)
        
    except Exception as e:
        logger.error(f"Add knowledge request failed: {e}")
        return {
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }


def handle_stats_request() -> Dict[str, Any]:
    """Handle statistics requests"""
    try:
        service = get_rag_service()
        return service.get_knowledge_stats()
    except Exception as e:
        logger.error(f"Stats request failed: {e}")
        return {
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }


if __name__ == "__main__":
    # Test the RAG service
    service = RAGService()
    
    # Test search
    test_queries = [
        "How do I report a pothole?",
        "What should I do in an emergency?",
        "Is downtown safe at night?"
    ]
    
    for query in test_queries:
        print(f"\n=== Testing Query: {query} ===")
        results = service.search_knowledge(query)
        print(f"Results: {json.dumps(results, indent=2)}")
        
        # Test context generation
        context = service.get_context_for_query(query)
        print(f"Context: {context[:500]}...")
    
    # Test stats
    stats = service.get_knowledge_stats()
    print(f"\nKnowledge Base Stats: {json.dumps(stats, indent=2)}")
