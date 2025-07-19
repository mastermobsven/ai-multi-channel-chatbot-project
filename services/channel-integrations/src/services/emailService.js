const nodemailer = require('nodemailer');
const Imap = require('imap');
const { simpleParser } = require('mailparser');
const { v4: uuidv4 } = require('uuid');
const { logger } = require('../utils/logger');
const { processMessage } = require('./messagingService');

// Email configuration
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD;
const EMAIL_HOST = process.env.EMAIL_HOST || 'smtp.gmail.com';
const EMAIL_PORT = parseInt(process.env.EMAIL_PORT || '587');
const EMAIL_SECURE = process.env.EMAIL_SECURE === 'true';
const EMAIL_FROM = process.env.EMAIL_FROM || EMAIL_USER;

// IMAP configuration for receiving emails
const IMAP_HOST = process.env.IMAP_HOST || EMAIL_HOST;
const IMAP_PORT = parseInt(process.env.IMAP_PORT || '993');
const IMAP_TLS = process.env.IMAP_TLS !== 'false';

// Initialize email transporter
let transporter;
try {
  if (EMAIL_USER && EMAIL_PASSWORD) {
    transporter = nodemailer.createTransport({
      host: EMAIL_HOST,
      port: EMAIL_PORT,
      secure: EMAIL_SECURE,
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASSWORD
      }
    });
    
    logger.info('Email transporter initialized');
  } else {
    logger.warn('Email credentials not configured');
  }
} catch (error) {
  logger.error(`Error initializing email transporter: ${error.message}`);
}

/**
 * Initialize IMAP client and start listening for emails
 */
function startEmailListener() {
  if (!EMAIL_USER || !EMAIL_PASSWORD) {
    logger.warn('Email credentials not configured, email listener not started');
    return;
  }
  
  try {
    const imap = new Imap({
      user: EMAIL_USER,
      password: EMAIL_PASSWORD,
      host: IMAP_HOST,
      port: IMAP_PORT,
      tls: IMAP_TLS,
      tlsOptions: { rejectUnauthorized: false }
    });
    
    function openInbox(cb) {
      imap.openBox('INBOX', false, cb);
    }
    
    imap.once('ready', () => {
      logger.info('IMAP connection established');
      
      openInbox((err, box) => {
        if (err) {
          logger.error(`Error opening inbox: ${err.message}`);
          return;
        }
        
        logger.info('Inbox opened, listening for new emails');
        
        // Listen for new emails
        imap.on('mail', (numNewMsgs) => {
          logger.info(`${numNewMsgs} new message(s) received`);
          fetchNewEmails(imap);
        });
      });
    });
    
    imap.once('error', (err) => {
      logger.error(`IMAP error: ${err.message}`);
    });
    
    imap.once('end', () => {
      logger.info('IMAP connection ended');
      
      // Reconnect after a delay
      setTimeout(() => {
        logger.info('Reconnecting to IMAP server');
        startEmailListener();
      }, 30000); // 30 seconds
    });
    
    // Connect to the IMAP server
    imap.connect();
  } catch (error) {
    logger.error(`Error starting email listener: ${error.message}`);
  }
}

/**
 * Fetch new emails from IMAP server
 * @param {Imap} imap - IMAP client instance
 */
function fetchNewEmails(imap) {
  try {
    // Search for unread messages
    imap.search(['UNSEEN'], (err, results) => {
      if (err) {
        logger.error(`Error searching for unread emails: ${err.message}`);
        return;
      }
      
      if (!results || !results.length) {
        logger.info('No new unread emails');
        return;
      }
      
      logger.info(`Found ${results.length} unread email(s)`);
      
      // Fetch the emails
      const f = imap.fetch(results, { bodies: '', markSeen: true });
      
      f.on('message', (msg, seqno) => {
        logger.info(`Processing email #${seqno}`);
        
        msg.on('body', (stream) => {
          simpleParser(stream, async (err, parsed) => {
            if (err) {
              logger.error(`Error parsing email: ${err.message}`);
              return;
            }
            
            try {
              await processIncomingEmail(parsed);
            } catch (error) {
              logger.error(`Error processing email: ${error.message}`);
            }
          });
        });
      });
      
      f.once('error', (err) => {
        logger.error(`Error fetching emails: ${err.message}`);
      });
      
      f.once('end', () => {
        logger.info('Finished processing emails');
      });
    });
  } catch (error) {
    logger.error(`Error fetching new emails: ${error.message}`);
  }
}

/**
 * Process an incoming email
 * @param {Object} email - Parsed email object
 */
async function processIncomingEmail(email) {
  try {
    // Extract email information
    const from = email.from?.value?.[0]?.address;
    const subject = email.subject || '(No Subject)';
    const text = email.text || '';
    const html = email.html || '';
    
    if (!from) {
      logger.warn('Email has no sender address');
      return;
    }
    
    logger.info(`Processing email from ${from}, subject: ${subject}`);
    
    // Use email address as user ID
    const userId = from;
    const sessionId = `email:${userId}`;
    
    // Extract message content (prefer plain text)
    const messageContent = text || html;
    
    // Process the message
    const response = await processMessage({
      message: messageContent,
      userId,
      sessionId,
      channel: 'email',
      metadata: {
        subject,
        messageId: email.messageId,
        inReplyTo: email.inReplyTo,
        references: email.references
      }
    });
    
    // Send response email
    await sendMessage(
      userId,
      response.response,
      response.messageId,
      `Re: ${subject}`,
      email.messageId
    );
    
    logger.info(`Sent email response to ${userId}`);
  } catch (error) {
    logger.error(`Error processing incoming email: ${error.message}`);
  }
}

/**
 * Send an email message
 * @param {string} to - Recipient email address
 * @param {string} message - Message text
 * @param {string} messageId - Message ID
 * @param {string} subject - Email subject
 * @param {string} inReplyTo - Reference to original message ID
 * @returns {boolean} - Success status
 */
async function sendMessage(to, message, messageId, subject = 'AI Customer Support', inReplyTo = null) {
  try {
    if (!transporter) {
      logger.error('Email transporter not initialized');
      return false;
    }
    
    // Prepare email options
    const mailOptions = {
      from: `"AI Customer Support" <${EMAIL_FROM}>`,
      to,
      subject,
      text: message,
      html: `<div style="font-family: Arial, sans-serif; line-height: 1.6;">${message.replace(/\n/g, '<br>')}</div>`,
      messageId: `<${messageId}@ai-customer-support.com>`,
      headers: {}
    };
    
    // Add in-reply-to header if available
    if (inReplyTo) {
      mailOptions.inReplyTo = inReplyTo;
      mailOptions.references = inReplyTo;
    }
    
    // Send the email
    const info = await transporter.sendMail(mailOptions);
    
    logger.info(`Email sent: ${info.messageId}`);
    return true;
  } catch (error) {
    logger.error(`Error sending email: ${error.message}`);
    return false;
  }
}

/**
 * Process an email request from API
 * @param {Object} params - Email parameters
 * @param {string} params.to - Recipient email address
 * @param {string} params.subject - Email subject
 * @param {string} params.message - Message text
 * @returns {Object} - Processing result
 */
async function processEmailRequest(params) {
  try {
    const { to, subject, message } = params;
    
    if (!to || !message) {
      return { success: false, error: 'Missing required fields' };
    }
    
    // Generate message ID
    const messageId = uuidv4();
    
    // Send email
    const success = await sendMessage(
      to,
      message,
      messageId,
      subject || 'AI Customer Support'
    );
    
    return {
      success,
      messageId: success ? messageId : null
    };
  } catch (error) {
    logger.error(`Error processing email request: ${error.message}`);
    return { success: false, error: error.message };
  }
}

module.exports = {
  startEmailListener,
  sendMessage,
  processEmailRequest
};
