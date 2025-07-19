const Redis = require('ioredis');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { logger } = require('../utils/logger');

// Initialize Redis clients
let publisherClient;
let subscriberClient;

// Chatbot core service URL
const CHATBOT_CORE_URL = process.env.CHATBOT_CORE_URL || 'http://chatbot-core:3000/api';

/**
 * Initialize Redis clients for pub/sub messaging
 */
async function initializeRedis() {
  try {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    // Create Redis clients
    publisherClient = new Redis(redisUrl);
    subscriberClient = new Redis(redisUrl);
    
    // Test connection
    await publisherClient.ping();
    logger.info('Redis publisher client connected');
    
    await subscriberClient.ping();
    logger.info('Redis subscriber client connected');
    
    // Subscribe to relevant channels
    await subscribeToChannels();
    
    return true;
  } catch (error) {
    logger.error(`Error initializing Redis: ${error.message}`);
    throw error;
  }
}

/**
 * Subscribe to Redis channels for cross-service communication
 */
async function subscribeToChannels() {
  try {
    // Subscribe to channels
    await subscriberClient.subscribe('channel:responses');
    await subscriberClient.subscribe('channel:handovers');
    
    // Handle messages
    subscriberClient.on('message', (channel, message) => {
      try {
        const data = JSON.parse(message);
        
        if (channel === 'channel:responses') {
          handleResponseMessage(data);
        } else if (channel === 'channel:handovers') {
          handleHandoverMessage(data);
        }
      } catch (error) {
        logger.error(`Error handling Redis message: ${error.message}`);
      }
    });
    
    logger.info('Subscribed to Redis channels');
  } catch (error) {
    logger.error(`Error subscribing to Redis channels: ${error.message}`);
    throw error;
  }
}

/**
 * Handle response messages from Redis
 * @param {Object} data - Response data
 */
function handleResponseMessage(data) {
  try {
    const { userId, sessionId, response, channel, messageId } = data;
    
    if (!userId || !response || !channel) {
      logger.warn('Received incomplete response message');
      return;
    }
    
    logger.info(`Received response for user ${userId} on channel ${channel}`);
    
    // Route response to appropriate channel
    switch (channel) {
      case 'whatsapp':
        require('./whatsappService').sendMessage(userId, response, messageId);
        break;
      case 'web':
        require('./webChatService').sendMessage(userId, sessionId, response, messageId);
        break;
      case 'email':
        require('./emailService').sendMessage(userId, response, messageId);
        break;
      default:
        logger.warn(`Unknown channel: ${channel}`);
    }
  } catch (error) {
    logger.error(`Error handling response message: ${error.message}`);
  }
}

/**
 * Handle handover messages from Redis
 * @param {Object} data - Handover data
 */
function handleHandoverMessage(data) {
  try {
    const { userId, sessionId, reason, channel } = data;
    
    if (!userId || !channel) {
      logger.warn('Received incomplete handover message');
      return;
    }
    
    logger.info(`Received handover request for user ${userId} on channel ${channel}, reason: ${reason}`);
    
    // TODO: Implement handover logic
    // This would typically involve notifying the live agent service
    // and potentially sending a message to the user
  } catch (error) {
    logger.error(`Error handling handover message: ${error.message}`);
  }
}

/**
 * Process an incoming message from any channel
 * @param {Object} params - Message parameters
 * @param {string} params.message - The user's message text
 * @param {string} params.userId - Unique identifier for the user
 * @param {string} params.sessionId - Session identifier (optional)
 * @param {string} params.channel - Communication channel (whatsapp, web, email)
 * @param {Object} params.metadata - Additional metadata about the message
 * @returns {Object} - The AI response and additional metadata
 */
async function processMessage({ message, userId, sessionId = uuidv4(), channel, metadata = {} }) {
  try {
    logger.info(`Processing message from user ${userId} on channel ${channel}`);
    
    // Call chatbot core service
    const response = await axios.post(`${CHATBOT_CORE_URL}/message`, {
      message,
      userId,
      sessionId,
      channel,
      metadata
    });
    
    if (response.data && response.data.success) {
      const responseData = response.data.data;
      
      // Publish response to Redis for potential cross-service consumption
      if (publisherClient) {
        await publisherClient.publish('channel:responses', JSON.stringify({
          userId,
          sessionId,
          response: responseData.response,
          channel,
          messageId: responseData.messageId,
          timestamp: responseData.timestamp
        }));
      }
      
      // Check if handover is required
      if (responseData.handoverRequired) {
        // Publish handover request to Redis
        if (publisherClient) {
          await publisherClient.publish('channel:handovers', JSON.stringify({
            userId,
            sessionId,
            channel,
            reason: 'ai_determined',
            timestamp: responseData.timestamp
          }));
        }
      }
      
      return responseData;
    } else {
      throw new Error('Failed to process message');
    }
  } catch (error) {
    logger.error(`Error in processMessage: ${error.message}`);
    throw error;
  }
}

/**
 * Process an audio message from any channel
 * @param {Object} params - Audio message parameters
 * @param {string} params.audioData - Base64 encoded audio data
 * @param {string} params.userId - Unique identifier for the user
 * @param {string} params.sessionId - Session identifier (optional)
 * @param {string} params.channel - Communication channel (whatsapp, web, email)
 * @param {string} params.format - Audio format (mp3, wav, etc.)
 * @param {Object} params.metadata - Additional metadata about the message
 * @returns {Object} - The transcription and AI response
 */
async function processAudioMessage({ audioData, userId, sessionId = uuidv4(), channel, format = 'mp3', metadata = {} }) {
  try {
    logger.info(`Processing audio message from user ${userId} on channel ${channel}`);
    
    // First, transcribe the audio
    const transcriptionResponse = await axios.post(`${CHATBOT_CORE_URL}/transcribe`, {
      audioData,
      userId,
      format,
      language: metadata.language
    });
    
    if (!transcriptionResponse.data || !transcriptionResponse.data.success) {
      throw new Error('Failed to transcribe audio');
    }
    
    const transcription = transcriptionResponse.data.data.text;
    const detectedLanguage = transcriptionResponse.data.data.language;
    
    logger.info(`Transcription successful: ${transcription.length} characters`);
    
    // Now process the transcribed text as a message
    const messageResponse = await processMessage({
      message: transcription,
      userId,
      sessionId,
      channel,
      metadata: {
        ...metadata,
        language: detectedLanguage,
        isAudioMessage: true,
        originalFormat: format
      }
    });
    
    return {
      ...messageResponse,
      transcription
    };
  } catch (error) {
    logger.error(`Error in processAudioMessage: ${error.message}`);
    throw error;
  }
}

module.exports = {
  initializeRedis,
  processMessage,
  processAudioMessage
};
