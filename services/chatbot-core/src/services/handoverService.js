const { OpenAI } = require('openai');
const { logger } = require('../utils/logger');
const axios = require('axios');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Live agent service URL
const LIVE_AGENT_URL = process.env.LIVE_AGENT_URL || 'http://live-agent-engine:3002/api';

/**
 * Determine if a conversation should be handed over to a human agent
 * @param {Object} params - Parameters for handover decision
 * @param {string} params.message - User's message
 * @param {string} params.response - AI's response
 * @param {string} params.userId - User identifier
 * @param {string} params.sessionId - Session identifier
 * @param {Object} params.metadata - Additional metadata
 * @returns {boolean} - Whether handover is required
 */
async function shouldHandover({ message, response, userId, sessionId, metadata = {} }) {
  try {
    // Check for explicit handover request
    if (containsHandoverRequest(message)) {
      logger.info(`Explicit handover request detected from user ${userId}`);
      await notifyHandover({ userId, sessionId, reason: 'explicit_request', message, response, metadata });
      return true;
    }
    
    // Check for complex issues that AI can't handle
    const isComplexIssue = await detectComplexIssue(message, response);
    if (isComplexIssue) {
      logger.info(`Complex issue detected for user ${userId}`);
      await notifyHandover({ userId, sessionId, reason: 'complex_issue', message, response, metadata });
      return true;
    }
    
    // Check for user frustration or dissatisfaction
    const isUserFrustrated = detectUserFrustration(message, metadata);
    if (isUserFrustrated) {
      logger.info(`User frustration detected for user ${userId}`);
      await notifyHandover({ userId, sessionId, reason: 'user_frustration', message, response, metadata });
      return true;
    }
    
    // No handover required
    return false;
  } catch (error) {
    logger.error(`Error in shouldHandover: ${error.message}`);
    // Default to no handover on error
    return false;
  }
}

/**
 * Check if message contains explicit request for human agent
 * @param {string} message - User's message
 * @returns {boolean} - Whether message contains handover request
 */
function containsHandoverRequest(message) {
  if (!message) return false;
  
  const lowercaseMessage = message.toLowerCase();
  const handoverKeywords = [
    'speak to a human',
    'talk to a human',
    'speak to an agent',
    'talk to an agent',
    'speak to a representative',
    'talk to a representative',
    'speak to someone',
    'talk to someone',
    'human agent',
    'real person',
    'agent please',
    'human please',
    'transfer me',
    'connect me'
  ];
  
  return handoverKeywords.some(keyword => lowercaseMessage.includes(keyword));
}

/**
 * Detect if the issue is too complex for the AI to handle
 * @param {string} message - User's message
 * @param {string} response - AI's response
 * @returns {boolean} - Whether the issue is complex
 */
async function detectComplexIssue(message, response) {
  try {
    // Use OpenAI to determine if the issue is complex
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an AI that determines if a customer support issue is too complex for an AI assistant to handle.
          Respond with only "true" if the issue requires human intervention, or "false" if the AI can handle it.
          Issues that typically require human intervention include:
          1. Complex technical troubleshooting that requires system access
          2. Account-specific actions that require verification
          3. Complaints about service that require empathy and resolution authority
          4. Issues where the AI's response indicates uncertainty or inability to help`
        },
        {
          role: "user",
          content: `User message: "${message}"\nAI response: "${response}"`
        }
      ],
      temperature: 0.1,
      max_tokens: 10,
    });
    
    const result = completion.choices[0].message.content.trim().toLowerCase();
    return result === 'true';
  } catch (error) {
    logger.error(`Error in detectComplexIssue: ${error.message}`);
    return false;
  }
}

/**
 * Detect user frustration based on message and metadata
 * @param {string} message - User's message
 * @param {Object} metadata - Message metadata
 * @returns {boolean} - Whether user is frustrated
 */
function detectUserFrustration(message, metadata) {
  if (!message) return false;
  
  const lowercaseMessage = message.toLowerCase();
  
  // Check for frustration keywords
  const frustrationKeywords = [
    'this is not helpful',
    'you\'re not helping',
    'you are not helping',
    'this isn\'t working',
    'this is not working',
    'useless',
    'stupid bot',
    'stupid ai',
    'not understanding',
    'don\'t understand',
    'do not understand',
    'frustrated',
    'annoying',
    'waste of time'
  ];
  
  // Check for ALL CAPS (shouting)
  const isAllCaps = message.length > 5 && message === message.toUpperCase();
  
  // Check for multiple question or exclamation marks
  const hasMultipleMarks = (message.match(/\?{2,}/g) || message.match(/\!{2,}/g));
  
  // Check for repetitive messages (if available in metadata)
  const isRepetitive = metadata.isRepetitiveMessage === true;
  
  // Check satisfaction score if available
  const lowSatisfaction = metadata.satisfactionScore !== undefined && metadata.satisfactionScore < 3; // On a scale of 1-5
  
  return frustrationKeywords.some(keyword => lowercaseMessage.includes(keyword)) || 
         isAllCaps || 
         hasMultipleMarks || 
         isRepetitive || 
         lowSatisfaction;
}

/**
 * Notify the live agent system about a handover
 * @param {Object} params - Handover notification parameters
 * @param {string} params.userId - User identifier
 * @param {string} params.sessionId - Session identifier
 * @param {string} params.reason - Reason for handover
 * @param {string} params.message - User's message
 * @param {string} params.response - AI's response
 * @param {Object} params.metadata - Additional metadata
 * @returns {boolean} - Success status
 */
async function notifyHandover({ userId, sessionId, reason, message, response, metadata }) {
  try {
    // Call the live agent service
    await axios.post(`${LIVE_AGENT_URL}/handover`, {
      userId,
      sessionId,
      reason,
      message,
      aiResponse: response,
      timestamp: new Date().toISOString(),
      metadata
    });
    
    logger.info(`Handover notification sent for user ${userId}, reason: ${reason}`);
    return true;
  } catch (error) {
    logger.error(`Error notifying handover: ${error.message}`);
    return false;
  }
}

module.exports = {
  shouldHandover
};
