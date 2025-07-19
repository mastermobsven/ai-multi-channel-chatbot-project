const express = require('express');
const router = express.Router();
const { logger } = require('../utils/logger');
const { handleWebhook } = require('../services/whatsappService');

/**
 * @route GET /api/whatsapp/webhook
 * @desc Verify WhatsApp webhook
 * @access Public
 */
router.get('/whatsapp/webhook', (req, res) => {
  try {
    // Parse params from the webhook verification request
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    
    // Check if a token and mode were sent
    if (mode && token) {
      // Check the mode and token sent are correct
      if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
        // Respond with the challenge token from the request
        logger.info('WhatsApp webhook verified');
        return res.status(200).send(challenge);
      } else {
        // Respond with '403 Forbidden' if verify tokens do not match
        logger.warn('WhatsApp webhook verification failed');
        return res.sendStatus(403);
      }
    }
    
    return res.sendStatus(400);
  } catch (error) {
    logger.error(`Error verifying WhatsApp webhook: ${error.message}`);
    return res.sendStatus(500);
  }
});

/**
 * @route POST /api/whatsapp/webhook
 * @desc Handle WhatsApp webhook events
 * @access Public
 */
router.post('/whatsapp/webhook', async (req, res) => {
  try {
    // Return a '200 OK' response to all events
    res.status(200).send('EVENT_RECEIVED');
    
    // Process the webhook asynchronously
    handleWebhook(req.body)
      .then(result => {
        if (!result.success) {
          logger.warn(`WhatsApp webhook processing failed: ${result.error}`);
        }
      })
      .catch(error => {
        logger.error(`Error processing WhatsApp webhook: ${error.message}`);
      });
  } catch (error) {
    logger.error(`Error handling WhatsApp webhook: ${error.message}`);
    // We've already sent a 200 response, so we don't need to send another one
  }
});

/**
 * @route POST /api/whatsapp/send
 * @desc Send a WhatsApp message
 * @access Private
 */
router.post('/whatsapp/send', async (req, res) => {
  try {
    const { to, message } = req.body;
    
    if (!to || !message) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: to and message'
      });
    }
    
    const result = await require('../services/whatsappService').sendMessage(to, message);
    
    if (result) {
      return res.status(200).json({
        success: true,
        message: 'WhatsApp message sent successfully'
      });
    } else {
      return res.status(500).json({
        success: false,
        error: 'Failed to send WhatsApp message'
      });
    }
  } catch (error) {
    logger.error(`Error sending WhatsApp message: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Failed to send WhatsApp message'
    });
  }
});

module.exports = router;
