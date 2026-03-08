// ai-agents/src/rag/index.ts
import axios from 'axios';
import { z } from 'genkit';

// ... interfaces giữ nguyên ...

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
  private backendUrl: string;

  constructor() {
    // THỢ RÈN: Gọi tới Python RAG Service API, không gọi thẳng ChromaDB
    this.backendUrl = process.env.BACKEND_API_URL || 'http://localhost:8000'; 
  }

  async searchKnowledge(query: string, categoryFilter?: string, maxResults: number = 5): Promise<RAGResponse> {
    try {
      // Delegating heavy lifting to Python RAG service
      const response = await axios.post(`${this.backendUrl}/api/v1/rag/search`, {
        query: query,
        category_filter: categoryFilter,
        max_results: maxResults
      });

      // Backend Python đã trả về enhanced results (actionability, freshness)
      return {
        query,
        results: response.data.results || [],
        total_found: response.data.total_found || 0,
        timestamp: new Date().toISOString(),
        search_strategy: 'python_rag_service'
      };

    } catch (error) {
      console.error('[RAG ERROR] Backend search failed:', error);
      return { query, results: [], total_found: 0, timestamp: new Date().toISOString(), search_strategy: 'fallback' };
    }
  }
  // BỎ TOÀN BỘ CÁC HÀM: enhanceSearchResults, calculateKeywordRelevance (Vì Python đã lo)
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
