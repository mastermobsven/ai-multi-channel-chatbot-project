const express = require('express');
const router = express.Router();
const { processMessage } = require('../services/messageService');
const { logger } = require('../utils/logger');

/**
 * @route POST /api/message
 * @desc Process an incoming message from any channel
 * @access Public
 */
router.post('/message', async (req, res) => {
  try {
    const { 
      message, 
      userId, 
      sessionId, 
      channel, 
      metadata = {} 
    } = req.body;

    if (!message || !userId || !channel) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: message, userId, and channel are required' 
      });
    }

    logger.info(`Processing message from user ${userId} on channel ${channel}`);
    
    const response = await processMessage({
      message,
      userId,
      sessionId,
      channel,
      metadata
    });

    return res.status(200).json({
      success: true,
      data: response
    });
  } catch (error) {
    logger.error(`Error processing message: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Failed to process message'
    });
  }
});

/**
 * @route POST /api/feedback
 * @desc Submit feedback for a message exchange
 * @access Public
 */
router.post('/feedback', async (req, res) => {
  try {
    const { messageId, userId, rating, feedback } = req.body;

    if (!messageId || !userId || rating === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: messageId, userId, and rating are required'
      });
    }

    // TODO: Implement feedback storage and processing
    logger.info(`Received feedback for message ${messageId} from user ${userId}: ${rating}`);

    return res.status(200).json({
      success: true,
      message: 'Feedback received'
    });
  } catch (error) {
    logger.error(`Error processing feedback: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Failed to process feedback'
    });
  }
});

module.exports = router;
