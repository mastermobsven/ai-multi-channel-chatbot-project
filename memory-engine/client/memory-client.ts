/**
 * Memory Engine TypeScript Client Library
 * 
 * This library provides a strongly-typed client for interacting with the Memory Engine Service.
 */

// Type definitions
export type MemoryType = 'short_term' | 'long_term';

export interface MemoryEngineClientOptions {
  baseUrl?: string;
  apiKey?: string;
  timeout?: number;
}

export interface Memory {
  id?: string;
  userId: string;
  type: MemoryType;
  key: string;
  value: any;
  metadata?: Record<string, any>;
  ttl?: number;
  created_at?: string;
  last_accessed?: string;
}

export interface CreateMemoryResponse {
  status: string;
  id: string;
  userId: string;
  type: MemoryType;
  key: string;
}

export interface GetMemoriesResponse {
  userId: string;
  memories: Memory[];
}

export interface KnowledgeSearchParams {
  query: string;
  organizationId: string;
  limit?: number;
  threshold?: number;
}

export interface KnowledgeSearchResult {
  id: string;
  content: string;
  title?: string;
  url?: string;
  source?: string;
  relevance: number;
  metadata: Record<string, any>;
}

export interface KnowledgeSearchResponse {
  query: string;
  results: KnowledgeSearchResult[];
}

export interface VectorEmbeddingParams {
  text: string;
  metadata: Record<string, any>;
}

export interface VectorEmbeddingResponse {
  id: string;
  status: string;
}

export interface SessionContextResponse {
  sessionId: string;
  context: Record<string, any>;
}

export interface UpdateSessionContextResponse {
  sessionId: string;
  status: string;
}

export interface OptimizeContextParams {
  conversationHistory: Array<{role: string, content: string}>;
  userQuery: string;
  userId?: string;
  sessionId?: string;
  maxTokens?: number;
}

export interface OptimizedContext {
  conversation_history: Array<{role: string, content: string}>;
  relevant_memories?: Memory[];
  session_context?: Record<string, any>;
  knowledge_results?: KnowledgeSearchResult[];
}

export interface OptimizeContextResponse {
  optimized_context: OptimizedContext;
  token_count: number;
}

export interface HealthCheckResponse {
  status: string;
  version?: string;
  dependencies: {
    redis: string;
    chroma: string;
    openai: string;
  };
}

/**
 * Memory Engine Client for TypeScript applications
 */
export class MemoryEngineClient {
  private baseUrl: string;
  private apiKey?: string;
  private timeout: number;
  private headers: Record<string, string>;

  /**
   * Initialize the Memory Engine Client
   * 
   * @param options - Client options
   */
  constructor(options: MemoryEngineClientOptions = {}) {
    this.baseUrl = options.baseUrl || 'http://localhost:8000';
    this.apiKey = options.apiKey;
    this.timeout = options.timeout || 10000;
    this.headers = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      this.headers['X-API-Key'] = this.apiKey;
    }
  }

  /**
   * Create a new memory or update an existing one
   * 
   * @param memory - Memory object
   * @returns Response from the Memory Engine Service
   */
  async createMemory(memory: Memory): Promise<CreateMemoryResponse> {
    const url = `${this.baseUrl}/memories`;
    
    try {
      const response = await this.fetchWithTimeout(url, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(memory),
      });

      return await response.json();
    } catch (error) {
      console.error('Error creating memory:', error);
      throw error;
    }
  }

  /**
   * Retrieve memories for a user
   * 
   * @param userId - User ID
   * @param type - Optional memory type filter
   * @param key - Optional key filter
   * @returns Response from the Memory Engine Service
   */
  async getMemories(userId: string, type?: MemoryType, key?: string): Promise<GetMemoriesResponse> {
    let url = `${this.baseUrl}/memories/${userId}`;
    const params = new URLSearchParams();

    if (type) {
      params.append('type', type);
    }

    if (key) {
      params.append('key', key);
    }

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    try {
      const response = await this.fetchWithTimeout(url, {
        method: 'GET',
        headers: this.headers,
      });

      return await response.json();
    } catch (error) {
      console.error('Error retrieving memories:', error);
      throw error;
    }
  }

  /**
   * Search the knowledge base for relevant information
   * 
   * @param params - Search parameters
   * @returns Response from the Memory Engine Service
   */
  async searchKnowledge(params: KnowledgeSearchParams): Promise<KnowledgeSearchResponse> {
    const url = `${this.baseUrl}/knowledge/search`;
    
    try {
      const response = await this.fetchWithTimeout(url, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(params),
      });

      return await response.json();
    } catch (error) {
      console.error('Error searching knowledge base:', error);
      throw error;
    }
  }

  /**
   * Store a vector embedding for future similarity search
   * 
   * @param params - Vector parameters
   * @returns Response from the Memory Engine Service
   */
  async createVectorEmbedding(params: VectorEmbeddingParams): Promise<VectorEmbeddingResponse> {
    const url = `${this.baseUrl}/vectors`;
    
    try {
      const response = await this.fetchWithTimeout(url, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(params),
      });

      return await response.json();
    } catch (error) {
      console.error('Error creating vector embedding:', error);
      throw error;
    }
  }

  /**
   * Get the context for a specific session
   * 
   * @param sessionId - Session ID
   * @returns Response from the Memory Engine Service
   */
  async getSessionContext(sessionId: string): Promise<SessionContextResponse> {
    const url = `${this.baseUrl}/context/${sessionId}`;

    try {
      const response = await this.fetchWithTimeout(url, {
        method: 'GET',
        headers: this.headers,
      });

      return await response.json();
    } catch (error) {
      console.error('Error retrieving session context:', error);
      throw error;
    }
  }

  /**
   * Update the context for a specific session
   * 
   * @param sessionId - Session ID
   * @param context - Session context
   * @returns Response from the Memory Engine Service
   */
  async updateSessionContext(sessionId: string, context: Record<string, any>): Promise<UpdateSessionContextResponse> {
    const url = `${this.baseUrl}/context/${sessionId}`;

    try {
      const response = await this.fetchWithTimeout(url, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(context),
      });

      return await response.json();
    } catch (error) {
      console.error('Error updating session context:', error);
      throw error;
    }
  }

  /**
   * Optimize the context window for token efficiency
   * 
   * @param params - Context parameters
   * @returns Response from the Memory Engine Service
   */
  async optimizeContext(params: OptimizeContextParams): Promise<OptimizeContextResponse> {
    const url = `${this.baseUrl}/optimize-context`;
    const payload = {
      conversation_history: params.conversationHistory,
      user_query: params.userQuery,
      max_tokens: params.maxTokens || 4000,
    } as Record<string, any>;

    if (params.userId) {
      payload.userId = params.userId;
    }

    if (params.sessionId) {
      payload.sessionId = params.sessionId;
    }

    try {
      const response = await this.fetchWithTimeout(url, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(payload),
      });

      return await response.json();
    } catch (error) {
      console.error('Error optimizing context:', error);
      throw error;
    }
  }

  /**
   * Check the health status of the Memory Engine Service
   * 
   * @returns Response from the Memory Engine Service
   */
  async healthCheck(): Promise<HealthCheckResponse> {
    const url = `${this.baseUrl}/health`;

    try {
      const response = await this.fetchWithTimeout(url, {
        method: 'GET',
      });

      return await response.json();
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  }

  /**
   * Fetch with timeout
   * 
   * @private
   * @param url - URL to fetch
   * @param options - Fetch options
   * @returns Fetch response
   */
  private async fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), this.timeout);
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      
      clearTimeout(id);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error ${response.status}: ${errorText}`);
      }
      
      return response;
    } catch (error) {
      clearTimeout(id);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.timeout}ms`);
      }
      
      throw error;
    }
  }
}

// Export for CommonJS and ES modules
export default MemoryEngineClient;
