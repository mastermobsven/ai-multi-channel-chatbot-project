const express = require('express');
const router = express.Router();
const { logger } = require('../utils/logger');
const { processEmailRequest } = require('../services/emailService');

/**
 * @route POST /api/email/send
 * @desc Send an email message
 * @access Private
 */
router.post('/email/send', async (req, res) => {
  try {
    const { to, subject, message } = req.body;
    
    if (!to || !message) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: to and message'
      });
    }
    
    const result = await processEmailRequest({
      to,
      subject,
      message
    });
    
    if (result.success) {
      return res.status(200).json({
        success: true,
        messageId: result.messageId,
        message: 'Email sent successfully'
      });
    } else {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to send email'
      });
    }
  } catch (error) {
    logger.error(`Error sending email: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Failed to send email'
    });
  }
});

/**
 * @route POST /api/email/process
 * @desc Process an incoming email (for webhook or manual processing)
 * @access Private
 */
router.post('/email/process', async (req, res) => {
  try {
    const { from, subject, text, html, messageId, inReplyTo, references } = req.body;
    
    if (!from || (!text && !html)) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: from and text/html'
      });
    }
    
    // Create a parsed email object similar to what mailparser would produce
    const parsedEmail = {
      from: { value: [{ address: from }] },
      subject: subject || '(No Subject)',
      text: text || '',
      html: html || '',
      messageId: messageId || `manual-${Date.now()}`,
      inReplyTo: inReplyTo || null,
      references: references || null
    };
    
    // Process the email asynchronously
    require('../services/emailService').processIncomingEmail(parsedEmail)
      .then(() => {
        logger.info(`Manual email processing initiated for ${from}`);
      })
      .catch(error => {
        logger.error(`Error processing manual email: ${error.message}`);
      });
    
    // Return success immediately since processing is async
    return res.status(200).json({
      success: true,
      message: 'Email processing initiated'
    });
  } catch (error) {
    logger.error(`Error processing manual email: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Failed to process email'
    });
  }
});

/**
 * @route POST /api/email/start-listener
 * @desc Start the email listener service
 * @access Private
 */
router.post('/email/start-listener', (req, res) => {
  try {
    require('../services/emailService').startEmailListener();
    
    return res.status(200).json({
      success: true,
      message: 'Email listener started'
    });
  } catch (error) {
    logger.error(`Error starting email listener: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Failed to start email listener'
    });
  }
});

module.exports = router;
