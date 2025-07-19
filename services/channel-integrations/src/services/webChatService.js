const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const { logger } = require('../utils/logger');
const { processMessage, processAudioMessage } = require('./messagingService');

// Store active connections
const activeConnections = new Map();

/**
 * Setup WebSocket server for web chat
 * @param {WebSocket.Server} wss - WebSocket server instance
 */
function setupWebSocketServer(wss) {
  wss.on('connection', (ws, req) => {
    // Generate a unique connection ID
    const connectionId = uuidv4();
    
    // Extract query parameters from URL
    const url = new URL(req.url, 'http://localhost');
    const userId = url.searchParams.get('userId') || connectionId;
    const sessionId = url.searchParams.get('sessionId') || `web:${userId}`;
    
    logger.info(`New WebSocket connection: ${connectionId}, userId: ${userId}`);
    
    // Store connection with metadata
    activeConnections.set(connectionId, {
      ws,
      userId,
      sessionId,
      connectionTime: new Date().toISOString()
    });
    
    // Send welcome message
    sendSystemMessage(ws, {
      type: 'connection_established',
      connectionId,
      userId,
      sessionId,
      message: 'Connected to AI Customer Support'
    });
    
    // Handle incoming messages
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data);
        
        // Handle different message types
        if (message.type === 'text') {
          await handleTextMessage(connectionId, message);
        } else if (message.type === 'audio') {
          await handleAudioMessage(connectionId, message);
        } else if (message.type === 'typing') {
          // Handle typing indicator (optional)
          logger.debug(`User ${userId} is typing...`);
        } else if (message.type === 'handover_request') {
          // Handle explicit handover request
          await handleHandoverRequest(connectionId, message);
        } else {
          logger.warn(`Unknown message type: ${message.type}`);
          sendSystemMessage(ws, {
            type: 'error',
            message: 'Unsupported message type'
          });
        }
      } catch (error) {
        logger.error(`Error handling WebSocket message: ${error.message}`);
        sendSystemMessage(ws, {
          type: 'error',
          message: 'Failed to process message'
        });
      }
    });
    
    // Handle connection close
    ws.on('close', () => {
      logger.info(`WebSocket connection closed: ${connectionId}`);
      activeConnections.delete(connectionId);
    });
    
    // Handle errors
    ws.on('error', (error) => {
      logger.error(`WebSocket error for connection ${connectionId}: ${error.message}`);
    });
  });
  
  // Periodically clean up stale connections
  setInterval(() => {
    const now = Date.now();
    let closedCount = 0;
    
    activeConnections.forEach((connection, id) => {
      if (connection.ws.readyState === WebSocket.CLOSED) {
        activeConnections.delete(id);
        closedCount++;
      }
    });
    
    if (closedCount > 0) {
      logger.info(`Cleaned up ${closedCount} stale WebSocket connections`);
    }
  }, 60000); // Check every minute
}

/**
 * Handle text messages from web chat
 * @param {string} connectionId - WebSocket connection ID
 * @param {Object} message - Message data
 */
async function handleTextMessage(connectionId, message) {
  try {
    const connection = activeConnections.get(connectionId);
    if (!connection) {
      logger.warn(`Connection ${connectionId} not found`);
      return;
    }
    
    const { userId, sessionId, ws } = connection;
    
    // Send typing indicator
    sendSystemMessage(ws, { type: 'typing_start' });
    
    // Process the message
    const response = await processMessage({
      message: message.text,
      userId,
      sessionId,
      channel: 'web',
      metadata: {
        messageId: message.id || uuidv4(),
        clientData: message.metadata || {}
      }
    });
    
    // Send response
    sendMessage(userId, sessionId, response.response, response.messageId);
    
    // Send typing indicator stop
    sendSystemMessage(ws, { type: 'typing_stop' });
    
    // If handover is required, notify the client
    if (response.handoverRequired) {
      sendSystemMessage(ws, {
        type: 'handover_initiated',
        message: 'Connecting you with a human agent...'
      });
    }
  } catch (error) {
    logger.error(`Error handling text message: ${error.message}`);
    
    // Send error message to client
    const connection = activeConnections.get(connectionId);
    if (connection && connection.ws) {
      sendSystemMessage(connection.ws, {
        type: 'error',
        message: 'Failed to process your message'
      });
    }
  }
}

/**
 * Handle audio messages from web chat
 * @param {string} connectionId - WebSocket connection ID
 * @param {Object} message - Message data
 */
async function handleAudioMessage(connectionId, message) {
  try {
    const connection = activeConnections.get(connectionId);
    if (!connection) {
      logger.warn(`Connection ${connectionId} not found`);
      return;
    }
    
    const { userId, sessionId, ws } = connection;
    
    // Validate audio data
    if (!message.audio || !message.format) {
      sendSystemMessage(ws, {
        type: 'error',
        message: 'Invalid audio message format'
      });
      return;
    }
    
    // Send typing indicator
    sendSystemMessage(ws, { type: 'typing_start' });
    
    // Process the audio message
    const response = await processAudioMessage({
      audioData: message.audio,
      userId,
      sessionId,
      channel: 'web',
      format: message.format,
      metadata: {
        messageId: message.id || uuidv4(),
        clientData: message.metadata || {}
      }
    });
    
    // Send transcription to client
    sendSystemMessage(ws, {
      type: 'transcription',
      text: response.transcription
    });
    
    // Send response
    sendMessage(userId, sessionId, response.response, response.messageId);
    
    // Send typing indicator stop
    sendSystemMessage(ws, { type: 'typing_stop' });
    
    // If handover is required, notify the client
    if (response.handoverRequired) {
      sendSystemMessage(ws, {
        type: 'handover_initiated',
        message: 'Connecting you with a human agent...'
      });
    }
  } catch (error) {
    logger.error(`Error handling audio message: ${error.message}`);
    
    // Send error message to client
    const connection = activeConnections.get(connectionId);
    if (connection && connection.ws) {
      sendSystemMessage(connection.ws, {
        type: 'error',
        message: 'Failed to process your audio message'
      });
    }
  }
}

/**
 * Handle handover requests from web chat
 * @param {string} connectionId - WebSocket connection ID
 * @param {Object} message - Message data
 */
async function handleHandoverRequest(connectionId, message) {
  try {
    const connection = activeConnections.get(connectionId);
    if (!connection) {
      logger.warn(`Connection ${connectionId} not found`);
      return;
    }
    
    const { userId, sessionId, ws } = connection;
    
    logger.info(`Handover requested by user ${userId}`);
    
    // Notify client that handover is being processed
    sendSystemMessage(ws, {
      type: 'handover_initiated',
      message: 'Connecting you with a human agent...'
    });
    
    // TODO: Implement actual handover logic
    // This would typically involve notifying the live agent service
    
    // For now, just acknowledge the request
    sendSystemMessage(ws, {
      type: 'system_message',
      message: 'Your request for a human agent has been received. An agent will join this conversation shortly.'
    });
  } catch (error) {
    logger.error(`Error handling handover request: ${error.message}`);
  }
}

/**
 * Send a message to a web chat client
 * @param {string} userId - User ID
 * @param {string} sessionId - Session ID
 * @param {string} message - Message text
 * @param {string} messageId - Message ID
 * @returns {boolean} - Success status
 */
function sendMessage(userId, sessionId, message, messageId) {
  try {
    // Find all connections for this user/session
    let found = false;
    
    activeConnections.forEach((connection) => {
      if (connection.userId === userId && connection.sessionId === sessionId) {
        if (connection.ws.readyState === WebSocket.OPEN) {
          connection.ws.send(JSON.stringify({
            type: 'message',
            text: message,
            messageId,
            timestamp: new Date().toISOString(),
            sender: 'ai'
          }));
          found = true;
        }
      }
    });
    
    if (!found) {
      logger.warn(`No active connection found for user ${userId}, session ${sessionId}`);
      return false;
    }
    
    return true;
  } catch (error) {
    logger.error(`Error sending web chat message: ${error.message}`);
    return false;
  }
}

/**
 * Send a system message to a WebSocket client
 * @param {WebSocket} ws - WebSocket connection
 * @param {Object} data - Message data
 * @returns {boolean} - Success status
 */
function sendSystemMessage(ws, data) {
  try {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        ...data,
        timestamp: new Date().toISOString()
      }));
      return true;
    }
    return false;
  } catch (error) {
    logger.error(`Error sending system message: ${error.message}`);
    return false;
  }
}

module.exports = {
  setupWebSocketServer,
  sendMessage
};
