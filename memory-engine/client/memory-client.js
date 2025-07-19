/**
 * Memory Engine Client Library
 * 
 * This library provides a simple client for interacting with the Memory Engine Service.
 */

class MemoryEngineClient {
  /**
   * Initialize the Memory Engine Client
   * 
   * @param {Object} options - Client options
   * @param {string} options.baseUrl - Base URL of the Memory Engine Service
   * @param {string} options.apiKey - API key for authentication
   * @param {number} options.timeout - Request timeout in milliseconds
   */
  constructor(options = {}) {
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
   * @param {Object} params - Memory parameters
   * @param {string} params.userId - User ID
   * @param {string} params.type - Memory type ('short_term' or 'long_term')
   * @param {string} params.key - Unique identifier for this memory type
   * @param {Object} params.value - Memory content
   * @param {Object} [params.metadata] - Additional metadata
   * @param {number} [params.ttl] - Time to live in seconds (for short_term only)
   * @returns {Promise<Object>} - Response from the Memory Engine Service
   */
  async createMemory({ userId, type, key, value, metadata = {}, ttl = null }) {
    const url = `${this.baseUrl}/memories`;
    const payload = {
      userId,
      type,
      key,
      value,
      metadata,
    };

    if (ttl !== null) {
      payload.ttl = ttl;
    }

    try {
      const response = await this._fetchWithTimeout(url, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(payload),
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
   * @param {string} userId - User ID
   * @param {string} [type] - Optional memory type filter
   * @param {string} [key] - Optional key filter
   * @returns {Promise<Object>} - Response from the Memory Engine Service
   */
  async getMemories(userId, type = null, key = null) {
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
      const response = await this._fetchWithTimeout(url, {
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
   * @param {Object} params - Search parameters
   * @param {string} params.query - Search query
   * @param {string} params.organizationId - Organization ID
   * @param {number} [params.limit=5] - Maximum number of results
   * @param {number} [params.threshold=0.7] - Minimum relevance threshold
   * @returns {Promise<Object>} - Response from the Memory Engine Service
   */
  async searchKnowledge({ query, organizationId, limit = 5, threshold = 0.7 }) {
    const url = `${this.baseUrl}/knowledge/search`;
    const payload = {
      query,
      organizationId,
      limit,
      threshold,
    };

    try {
      const response = await this._fetchWithTimeout(url, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(payload),
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
   * @param {Object} params - Vector parameters
   * @param {string} params.text - Text to embed
   * @param {Object} params.metadata - Metadata for the embedding
   * @returns {Promise<Object>} - Response from the Memory Engine Service
   */
  async createVectorEmbedding({ text, metadata }) {
    const url = `${this.baseUrl}/vectors`;
    const payload = {
      text,
      metadata,
    };

    try {
      const response = await this._fetchWithTimeout(url, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(payload),
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
   * @param {string} sessionId - Session ID
   * @returns {Promise<Object>} - Response from the Memory Engine Service
   */
  async getSessionContext(sessionId) {
    const url = `${this.baseUrl}/context/${sessionId}`;

    try {
      const response = await this._fetchWithTimeout(url, {
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
   * @param {string} sessionId - Session ID
   * @param {Object} context - Session context
   * @returns {Promise<Object>} - Response from the Memory Engine Service
   */
  async updateSessionContext(sessionId, context) {
    const url = `${this.baseUrl}/context/${sessionId}`;

    try {
      const response = await this._fetchWithTimeout(url, {
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
   * @param {Object} params - Context parameters
   * @param {Array<Object>} params.conversationHistory - Conversation history
   * @param {string} params.userQuery - User query
   * @param {string} [params.userId] - Optional user ID
   * @param {string} [params.sessionId] - Optional session ID
   * @param {number} [params.maxTokens=4000] - Maximum tokens
   * @returns {Promise<Object>} - Response from the Memory Engine Service
   */
  async optimizeContext({ conversationHistory, userQuery, userId = null, sessionId = null, maxTokens = 4000 }) {
    const url = `${this.baseUrl}/optimize-context`;
    const payload = {
      conversation_history: conversationHistory,
      user_query: userQuery,
      max_tokens: maxTokens,
    };

    if (userId) {
      payload.userId = userId;
    }

    if (sessionId) {
      payload.sessionId = sessionId;
    }

    try {
      const response = await this._fetchWithTimeout(url, {
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
   * @returns {Promise<Object>} - Response from the Memory Engine Service
   */
  async healthCheck() {
    const url = `${this.baseUrl}/health`;

    try {
      const response = await this._fetchWithTimeout(url, {
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
   * @param {string} url - URL to fetch
   * @param {Object} options - Fetch options
   * @returns {Promise<Response>} - Fetch response
   */
  async _fetchWithTimeout(url, options = {}) {
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
      
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.timeout}ms`);
      }
      
      throw error;
    }
  }
}

// Export for CommonJS and ES modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MemoryEngineClient;
} else if (typeof exports !== 'undefined') {
  exports.MemoryEngineClient = MemoryEngineClient;
} else if (typeof window !== 'undefined') {
  window.MemoryEngineClient = MemoryEngineClient;
}
