const Redis = require('ioredis');
const axios = require('axios');
const { logger } = require('../utils/logger');

// Initialize Redis client for short-term memory
const redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Vector DB service URL for long-term memory
const VECTOR_DB_URL = process.env.VECTOR_DB_URL || 'http://memory-engine:3001/api';

// Maximum number of conversation turns to keep in short-term memory
const MAX_MEMORY_TURNS = parseInt(process.env.MAX_MEMORY_TURNS || '10');

// TTL for Redis keys (in seconds) - default 24 hours
const MEMORY_TTL = parseInt(process.env.MEMORY_TTL || (24 * 60 * 60));

/**
 * Get conversation memory for a user session
 * @param {string} userId - User identifier
 * @param {string} sessionId - Session identifier
 * @returns {Object} - Memory object with conversation history and context
 */
async function getMemory(userId, sessionId) {
  try {
    // Create a key for Redis
    const shortTermKey = `memory:${userId}:${sessionId}`;
    
    // Try to get short-term memory from Redis
    const shortTermMemory = await redisClient.get(shortTermKey);
    
    if (shortTermMemory) {
      logger.info(`Retrieved short-term memory for user ${userId}, session ${sessionId}`);
      return JSON.parse(shortTermMemory);
    }
    
    // If no short-term memory, try to get from long-term memory
    try {
      const response = await axios.get(`${VECTOR_DB_URL}/memory`, {
        params: { userId, sessionId }
      });
      
      if (response.data && response.data.success) {
        logger.info(`Retrieved long-term memory for user ${userId}`);
        
        // Store in Redis for faster access next time
        await redisClient.set(
          shortTermKey, 
          JSON.stringify(response.data.memory), 
          'EX', 
          MEMORY_TTL
        );
        
        return response.data.memory;
      }
    } catch (vectorDbError) {
      logger.warn(`Could not retrieve from vector DB: ${vectorDbError.message}`);
    }
    
    // If no memory found, return empty structure
    return {
      userId,
      sessionId,
      history: [],
      context: {},
      firstInteraction: new Date().toISOString()
    };
  } catch (error) {
    logger.error(`Error in getMemory: ${error.message}`);
    // Return empty memory structure on error
    return {
      userId,
      sessionId,
      history: [],
      context: {},
      firstInteraction: new Date().toISOString()
    };
  }
}

/**
 * Store conversation in memory
 * @param {Object} params - Memory parameters
 * @param {string} params.userId - User identifier
 * @param {string} params.sessionId - Session identifier
 * @param {string} params.message - User message
 * @param {string} params.response - AI response
 * @param {string} params.messageId - Message identifier
 * @param {string} params.timestamp - Timestamp
 * @param {string} params.channel - Communication channel
 * @param {Object} params.metadata - Additional metadata
 * @returns {boolean} - Success status
 */
async function storeMemory({ userId, sessionId, message, response, messageId, timestamp, channel, metadata = {} }) {
  try {
    // Get existing memory
    const memory = await getMemory(userId, sessionId);
    
    // Add new conversation turn
    const conversationTurn = {
      messageId,
      message,
      response,
      timestamp,
      channel,
      metadata
    };
    
    // Update memory
    memory.history.push(conversationTurn);
    
    // Keep only the most recent conversations
    if (memory.history.length > MAX_MEMORY_TURNS) {
      memory.history = memory.history.slice(-MAX_MEMORY_TURNS);
    }
    
    // Update last interaction time
    memory.lastInteraction = timestamp;
    
    // Create a key for Redis
    const shortTermKey = `memory:${userId}:${sessionId}`;
    
    // Store in Redis
    await redisClient.set(
      shortTermKey, 
      JSON.stringify(memory), 
      'EX', 
      MEMORY_TTL
    );
    
    // Store in long-term memory asynchronously
    try {
      await axios.post(`${VECTOR_DB_URL}/memory`, {
        userId,
        sessionId,
        conversationTurn,
        memory
      });
      logger.info(`Stored memory in vector DB for user ${userId}`);
    } catch (vectorDbError) {
      logger.warn(`Could not store in vector DB: ${vectorDbError.message}`);
    }
    
    return true;
  } catch (error) {
    logger.error(`Error in storeMemory: ${error.message}`);
    return false;
  }
}

/**
 * Search for relevant memories based on a query
 * @param {string} userId - User identifier
 * @param {string} query - Search query
 * @param {number} limit - Maximum number of results
 * @returns {Array} - Relevant memories
 */
async function searchMemory(userId, query, limit = 5) {
  try {
    // Search in vector DB
    const response = await axios.get(`${VECTOR_DB_URL}/memory/search`, {
      params: { userId, query, limit }
    });
    
    if (response.data && response.data.success) {
      logger.info(`Found ${response.data.memories.length} relevant memories for user ${userId}`);
      return response.data.memories;
    }
    
    return [];
  } catch (error) {
    logger.error(`Error in searchMemory: ${error.message}`);
    return [];
  }
}

module.exports = {
  getMemory,
  storeMemory,
  searchMemory
};
