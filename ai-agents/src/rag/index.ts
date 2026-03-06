// ai-agents/src/rag/index.ts
import axios from 'axios';
import { z } from 'genkit';

// ChromaDB connection configuration
const CHROMA_URL = process.env.CHROMA_URL || 'http://localhost:8000';
const CHROMA_COLLECTIONS = {
  CRIME_INCIDENTS: 'crime_incidents',
  SERVICE_REQUESTS: 'service_requests_311',
  CITY_POLICIES: 'city_policies'
};

export interface SearchResult {
  id: string;
  document: string;
  metadata: Record<string, any>;
  distance: number;
}

export interface RAGResponse {
  query: string;
  results: SearchResult[];
  total_found: number;
  timestamp: string;
  search_strategy: string;
}

export class RAGService {
  private chromaUrl: string;

  constructor() {
    this.chromaUrl = CHROMA_URL;
  }

  /**
   * Search ChromaDB for relevant documents
   */
  async searchKnowledge(
    query: string,
    categoryFilter?: string,
    maxResults: number = 5
  ): Promise<RAGResponse> {
    try {
      console.log('Searching ChromaDB:', { query, categoryFilter, maxResults });

      // Determine which collection to search
      let collection = CHROMA_COLLECTIONS.CITY_POLICIES; // Default
      
      if (categoryFilter) {
        const filter = categoryFilter.toLowerCase();
        if (filter.includes('crime') || filter.includes('safety')) {
          collection = CHROMA_COLLECTIONS.CRIME_INCIDENTS;
        } else if (filter.includes('311') || filter.includes('service')) {
          collection = CHROMA_COLLECTIONS.SERVICE_REQUESTS;
        }
      }

      // Query ChromaDB
      const response = await axios.post(`${this.chromaUrl}/api/v1/collections/${collection}/query`, {
        query_texts: [query],
        n_results: maxResults,
        include: ['documents', 'metadatas', 'distances']
      });

      const data = response.data;
      const results: SearchResult[] = [];

      if (data.ids && data.ids[0] && data.documents && data.documents[0]) {
        for (let i = 0; i < data.ids[0].length; i++) {
          results.push({
            id: data.ids[0][i],
            document: data.documents[0][i],
            metadata: data.metadatas[0][i] || {},
            distance: data.distances[0][i]
          });
        }
      }

      // Enhance results with relevance scoring
      const enhancedResults = this.enhanceSearchResults(results, query);

      return {
        query,
        results: enhancedResults,
        total_found: enhancedResults.length,
        timestamp: new Date().toISOString(),
        search_strategy: 'semantic_vector_search'
      };

    } catch (error) {
      console.error('ChromaDB search failed:', error);
      
      // Return fallback response
      return {
        query,
        results: [],
        total_found: 0,
        timestamp: new Date().toISOString(),
        search_strategy: 'fallback'
      };
    }
  }

  /**
   * Enhance search results with relevance scoring and context
   */
  private enhanceSearchResults(results: SearchResult[], query: string): SearchResult[] {
    return results.map(result => {
      // Calculate relevance score based on distance and keyword matching
      const distanceScore = 1 - result.distance; // Convert distance to similarity
      const keywordScore = this.calculateKeywordRelevance(result.document, query);
      const relevanceScore = (distanceScore * 0.7) + (keywordScore * 0.3);

      return {
        ...result,
        metadata: {
          ...result.metadata,
          relevanceScore: Math.round(relevanceScore * 100) / 100,
          searchMethod: 'hybrid'
        }
      };
    }).sort((a, b) => (b.metadata.relevanceScore || 0) - (a.metadata.relevanceScore || 0));
  }

  /**
   * Calculate keyword relevance score
   */
  private calculateKeywordRelevance(document: string, query: string): number {
    const docWords = document.toLowerCase().split(/\s+/);
    const queryWords = query.toLowerCase().split(/\s+/);
    
    let matches = 0;
    for (const queryWord of queryWords) {
      if (docWords.includes(queryWord)) {
        matches++;
      }
    }
    
    return matches / queryWords.length;
  }

  /**
   * Get 311 service catalog information
   */
  async getServiceCatalog(serviceType?: string): Promise<any> {
    try {
      const query = serviceType 
        ? `311 service request ${serviceType} procedures requirements`
        : '311 service catalog all types procedures';
      
      return await this.searchKnowledge(query, 'service_requests', 10);
    } catch (error) {
      console.error('Service catalog search failed:', error);
      return null;
    }
  }

  /**
   * Get city policies and regulations
   */
  async getCityPolicies(topic?: string): Promise<any> {
    try {
      const query = topic 
        ? `Montgomery Alabama ${topic} policy regulation ordinance`
        : 'Montgomery Alabama city policies regulations ordinances';
      
      return await this.searchKnowledge(query, 'city_policies', 10);
    } catch (error) {
      console.error('City policies search failed:', error);
      return null;
    }
  }

  /**
   * Get crime statistics and patterns
   */
  async getCrimeStats(location?: string): Promise<any> {
    try {
      const query = location 
        ? `crime statistics patterns ${location} Montgomery Alabama`
        : 'crime statistics patterns Montgomery Alabama trends';
      
      return await this.searchKnowledge(query, 'crime_incidents', 10);
    } catch (error) {
      console.error('Crime stats search failed:', error);
      return null;
    }
  }
}

// Singleton instance
export const ragService = new RAGService();

// Genkit tool for RAG integration
export const ragSearchTool = {
  name: 'searchKnowledge',
  description: 'Search knowledge base for city policies, 311 services, and crime information',
  inputSchema: z.object({
    query: z.string().describe('Search query'),
    category: z.enum(['crime_incidents', 'service_requests', 'city_policies', 'general']).optional().describe('Category to search'),
    maxResults: z.number().optional().default(5).describe('Maximum number of results')
  }),
  outputSchema: z.object({
    results: z.array(z.object({
      id: z.string(),
      document: z.string(),
      metadata: z.record(z.any()),
      relevanceScore: z.number()
    })),
    total_found: z.number(),
    search_strategy: z.string()
  }),
  execute: async (input: { query: string; category?: string; maxResults?: number }) => {
    const result = await ragService.searchKnowledge(
      input.query,
      input.category,
      input.maxResults
    );
    
    return {
      results: result.results,
      total_found: result.total_found,
      search_strategy: result.search_strategy
    };
  }
};
