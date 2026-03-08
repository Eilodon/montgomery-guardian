import axios from 'axios';
import { z } from 'genkit';
import { logger } from '../utils/logger';

export interface SearchResult {
  id: string;
  document: string;
  metadata: Record<string, any>;
  similarity_score: number;
  combined_score?: number;
  actionability_score?: number;
  freshness_score?: number;
  relevance_explanation?: string;
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
    this.backendUrl = process.env.BACKEND_API_URL || 'http://localhost:8000';
  }

  async searchKnowledge(
    query: string,
    categoryFilter?: string,
    maxResults: number = 5
  ): Promise<RAGResponse> {
    try {
      const response = await axios.post(
        `${this.backendUrl}/api/v1/rag/search`,
        {
          query,
          category_filter: categoryFilter,
          max_results: maxResults,
        },
        {
          timeout: 4000, // 4s — fail BEFORE tool timeout
          headers: { 'Content-Type': 'application/json' },
          validateStatus: (status) => status < 500,
        }
      );

      if (response.status >= 400) {
        logger.error('RAGService', `Backend returned ${response.status}: ${JSON.stringify(response.data)}`);
        return this._emptyResponse(query, `http_${response.status}`);
      }

      return {
        query,
        results: response.data.results || [],
        total_found: response.data.total_found || 0,
        timestamp: new Date().toISOString(),
        search_strategy: response.data.search_strategy || 'python_rag_service',
      };

    } catch (error) {
      if (axios.isAxiosError(error)) {
        const reason = error.code === 'ECONNABORTED' ? 'timeout' : 'connection_error';
        logger.error('RAGService', `Backend unreachable (${reason}): ${error.message}`);
        return this._emptyResponse(query, reason);
      }
      logger.error('RAGService', `Unexpected error: ${error}`);
      return this._emptyResponse(query, 'unknown_error');
    }
  }

  private _emptyResponse(query: string, strategy: string): RAGResponse {
    return {
      query,
      results: [],
      total_found: 0,
      timestamp: new Date().toISOString(),
      search_strategy: `fallback_${strategy}`,
    };
  }
}

export const ragService = new RAGService();

export const ragSearchTool = {
  name: 'searchKnowledge',
  description: 'Search the Montgomery city knowledge base for policies, 311 procedures, and safety information.',

  inputSchema: z.object({
    query: z.string().min(1).max(500).describe('Search query'),
    category: z.enum(['crime_incidents', 'service_requests', 'city_policies', 'general'])
      .optional()
      .describe('Category filter'),
    maxResults: z.number().int().min(1).max(10).optional().default(5),
  }),

  outputSchema: z.object({
    results: z.array(z.object({
      id: z.string(),
      document: z.string(),
      metadata: z.record(z.any()),
      similarity_score: z.number(),
      combined_score: z.number().optional(),
      actionability_score: z.number().optional(),
      freshness_score: z.number().optional(),
      relevance_explanation: z.string().optional(),
    })),
    total_found: z.number(),
    search_strategy: z.string(),
    timestamp: z.string().optional(),
  }),

  execute: async (input: {
    query: string;
    category?: 'crime_incidents' | 'service_requests' | 'city_policies' | 'general';
    maxResults?: number;
  }) => {
    const result = await ragService.searchKnowledge(
      input.query,
      input.category,
      input.maxResults
    );
    return result;
  }
};
