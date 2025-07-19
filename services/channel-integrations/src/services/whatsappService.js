const axios = require('axios');
const { logger } = require('../utils/logger');
const { processMessage, processAudioMessage } = require('./messagingService');

// WhatsApp API configuration
const WHATSAPP_API_VERSION = process.env.WHATSAPP_API_VERSION || 'v18.0';
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const WHATSAPP_API_TOKEN = process.env.WHATSAPP_API_TOKEN;
const WHATSAPP_API_URL = `https://graph.facebook.com/${WHATSAPP_API_VERSION}`;

// Twilio configuration (alternative to WhatsApp Cloud API)
const TWILIO_ENABLED = process.env.TWILIO_ENABLED === 'true';
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

// Initialize Twilio client if enabled
let twilioClient;
if (TWILIO_ENABLED && TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
  const twilio = require('twilio');
  twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
}

/**
 * Handle incoming WhatsApp webhook
 * @param {Object} body - Webhook request body
 * @returns {Object} - Processing result
 */
async function handleWebhook(body) {
  try {
    logger.info('Received WhatsApp webhook');
    
    // Verify this is a WhatsApp message webhook
    if (!body.object || !body.entry || !body.entry.length) {
      logger.warn('Invalid webhook body structure');
      return { success: false, error: 'Invalid webhook body' };
    }
    
    // Process each entry
    for (const entry of body.entry) {
      // Process each change in the entry
      for (const change of entry.changes || []) {
        if (change.field === 'messages') {
          await processWhatsAppMessage(change.value);
        }
      }
    }
    
    return { success: true };
  } catch (error) {
    logger.error(`Error handling WhatsApp webhook: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Process a WhatsApp message
 * @param {Object} messageData - Message data from webhook
 */
async function processWhatsAppMessage(messageData) {
  try {
    // Check if this is a valid message
    if (!messageData || !messageData.messages || !messageData.messages.length) {
      logger.warn('No messages in WhatsApp webhook data');
      return;
    }
    
    // Process each message
    for (const message of messageData.messages) {
      // Extract user ID (WhatsApp number)
      const userId = message.from;
      
      // Generate a session ID based on the conversation
      const sessionId = `whatsapp:${userId}`;
      
      // Handle different message types
      if (message.type === 'text' && message.text) {
        // Process text message
        await processMessage({
          message: message.text.body,
          userId,
          sessionId,
          channel: 'whatsapp',
          metadata: {
            messageId: message.id,
            timestamp: message.timestamp,
            contactName: messageData.contacts?.[0]?.profile?.name
          }
        });
      } else if (message.type === 'audio' && message.audio) {
        // Process audio message
        // First, download the audio file
        const audioId = message.audio.id;
        const audioData = await downloadWhatsAppMedia(audioId);
        
        if (audioData) {
          // Process the audio message
          await processAudioMessage({
            audioData,
            userId,
            sessionId,
            channel: 'whatsapp',
            format: 'ogg', // WhatsApp audio is typically in OGG format
            metadata: {
              messageId: message.id,
              timestamp: message.timestamp,
              contactName: messageData.contacts?.[0]?.profile?.name
            }
          });
        }
      } else if (message.type === 'image' && message.image) {
        // For now, respond that we received an image
        // TODO: Implement image processing with DALL-E or CLIP
        await sendMessage(
          userId,
          "I've received your image. Currently, I can only process text and voice messages.",
          message.id
        );
      } else {
        // For other message types, send a default response
        await sendMessage(
          userId,
          "I've received your message. Currently, I can only process text and voice messages.",
          message.id
        );
      }
    }
  } catch (error) {
    logger.error(`Error processing WhatsApp message: ${error.message}`);
  }
}

/**
 * Download media from WhatsApp API
 * @param {string} mediaId - Media ID to download
 * @returns {string|null} - Base64 encoded media data or null on failure
 */
async function downloadWhatsAppMedia(mediaId) {
  try {
    // First, get the media URL
    const mediaUrlResponse = await axios.get(
      `${WHATSAPP_API_URL}/${mediaId}`,
      {
        headers: {
          'Authorization': `Bearer ${WHATSAPP_API_TOKEN}`
        }
      }
    );
    
    if (!mediaUrlResponse.data || !mediaUrlResponse.data.url) {
      logger.error('Failed to get media URL');
      return null;
    }
    
    // Download the media
    const mediaResponse = await axios.get(
      mediaUrlResponse.data.url,
      {
        headers: {
          'Authorization': `Bearer ${WHATSAPP_API_TOKEN}`
        },
        responseType: 'arraybuffer'
      }
    );
    
    // Convert to base64
    const base64Data = Buffer.from(mediaResponse.data).toString('base64');
    return base64Data;
  } catch (error) {
    logger.error(`Error downloading WhatsApp media: ${error.message}`);
    return null;
  }
}

/**
 * Send a message via WhatsApp
 * @param {string} to - Recipient phone number
 * @param {string} message - Message text
 * @param {string} replyToMessageId - Optional message ID to reply to
 * @returns {boolean} - Success status
 */
async function sendMessage(to, message, replyToMessageId = null) {
  try {
    // Use Twilio if enabled, otherwise use WhatsApp Cloud API
    if (TWILIO_ENABLED && twilioClient) {
      return await sendMessageViaTwilio(to, message);
    } else {
      return await sendMessageViaWhatsAppAPI(to, message, replyToMessageId);
    }
  } catch (error) {
    logger.error(`Error sending WhatsApp message: ${error.message}`);
    return false;
  }
}

/**
 * Send a message via WhatsApp Cloud API
 * @param {string} to - Recipient phone number
 * @param {string} message - Message text
 * @param {string} replyToMessageId - Optional message ID to reply to
 * @returns {boolean} - Success status
 */
async function sendMessageViaWhatsAppAPI(to, message, replyToMessageId = null) {
  try {
    if (!WHATSAPP_PHONE_NUMBER_ID || !WHATSAPP_API_TOKEN) {
      logger.error('WhatsApp API credentials not configured');
      return false;
    }
    
    // Prepare message payload
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: {
        preview_url: false,
        body: message
      }
    };
    
    // Add context if replying to a specific message
    if (replyToMessageId) {
      payload.context = {
        message_id: replyToMessageId
      };
    }
    
    // Send message
    const response = await axios.post(
      `${WHATSAPP_API_URL}/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${WHATSAPP_API_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (response.data && response.data.messages && response.data.messages.length > 0) {
      logger.info(`WhatsApp message sent successfully to ${to}`);
      return true;
    } else {
      logger.warn(`WhatsApp API response without message ID: ${JSON.stringify(response.data)}`);
      return false;
    }
  } catch (error) {
    logger.error(`Error sending message via WhatsApp API: ${error.message}`);
    return false;
  }
}

/**
 * Send a message via Twilio
 * @param {string} to - Recipient phone number
 * @param {string} message - Message text
 * @returns {boolean} - Success status
 */
async function sendMessageViaTwilio(to, message) {
  try {
    if (!twilioClient || !TWILIO_PHONE_NUMBER) {
      logger.error('Twilio client not configured');
      return false;
    }
    
    // Format phone number for Twilio (ensure it has + prefix)
    const formattedTo = to.startsWith('+') ? to : `+${to}`;
    
    // Send message via Twilio
    const twilioResponse = await twilioClient.messages.create({
      body: message,
      from: `whatsapp:${TWILIO_PHONE_NUMBER}`,
      to: `whatsapp:${formattedTo}`
    });
    
    logger.info(`Twilio message sent successfully, SID: ${twilioResponse.sid}`);
    return true;
  } catch (error) {
    logger.error(`Error sending message via Twilio: ${error.message}`);
    return false;
  }
}

module.exports = {
  handleWebhook,
  sendMessage
};
