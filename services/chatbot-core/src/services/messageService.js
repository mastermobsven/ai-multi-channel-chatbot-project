const { v4: uuidv4 } = require('uuid');
const { OpenAI } = require('openai');
const { logger } = require('../utils/logger');
const { getMemory, storeMemory } = require('./memoryService');
const { detectLanguage, translateIfNeeded } = require('./languageService');
const { shouldHandover } = require('./handoverService');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Process an incoming message and generate a response using GPT-4o
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
    // Generate a unique ID for this message exchange
    const messageId = uuidv4();
    logger.info(`Processing message ${messageId} from user ${userId}`);
    
    // Detect language if not specified in metadata
    const detectedLanguage = metadata.language || await detectLanguage(message);
    logger.info(`Detected language: ${detectedLanguage}`);
    
    // Retrieve conversation history and context
    const memory = await getMemory(userId, sessionId);
    
    // Prepare conversation for GPT-4o
    const conversation = prepareConversation(message, memory, detectedLanguage, metadata);
    
    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: conversation,
      temperature: 0.7,
      max_tokens: 500,
    });
    
    // Extract the response
    const aiResponse = completion.choices[0].message.content;
    
    // Check if we need to hand over to a human agent
    const handoverRequired = await shouldHandover({
      message,
      response: aiResponse,
      userId,
      sessionId,
      metadata
    });
    
    // Store the conversation in memory
    await storeMemory({
      userId,
      sessionId,
      message,
      response: aiResponse,
      messageId,
      timestamp: new Date().toISOString(),
      channel,
      metadata: {
        ...metadata,
        language: detectedLanguage,
        handoverRequired
      }
    });
    
    // Return the response
    return {
      messageId,
      response: aiResponse,
      language: detectedLanguage,
      handoverRequired,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error(`Error in processMessage: ${error.message}`);
    throw error;
  }
}

/**
 * Prepare the conversation history and context for GPT-4o
 * @param {string} message - The user's message
 * @param {Array} memory - Previous conversation history
 * @param {string} language - Detected language
 * @param {Object} metadata - Additional metadata
 * @returns {Array} - Formatted conversation for OpenAI API
 */
function prepareConversation(message, memory, language, metadata) {
  // Start with system message
  const conversation = [
    {
      role: "system",
      content: `You are a helpful customer support assistant. Respond concisely and accurately. 
      The user's detected language is ${language}. Respond in the same language as the user.
      Current date and time: ${new Date().toISOString()}`
    }
  ];
  
  // Add conversation history from memory
  if (memory && memory.history && memory.history.length > 0) {
    memory.history.forEach(entry => {
      conversation.push({ role: "user", content: entry.message });
      conversation.push({ role: "assistant", content: entry.response });
    });
  }
  
  // Add the current message
  conversation.push({ role: "user", content: message });
  
  return conversation;
}

module.exports = {
  processMessage
};
