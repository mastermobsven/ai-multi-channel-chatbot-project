const express = require('express');
const router = express.Router();
const { transcribeAudio } = require('../services/transcriptionService');
const { logger } = require('../utils/logger');

/**
 * @route POST /api/transcribe
 * @desc Transcribe audio to text using OpenAI Whisper
 * @access Public
 */
router.post('/transcribe', async (req, res) => {
  try {
    const { audioData, userId, format = 'mp3', language } = req.body;

    if (!audioData) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: audioData'
      });
    }

    logger.info(`Transcribing audio for user ${userId || 'anonymous'}`);
    
    const transcription = await transcribeAudio({
      audioData,
      format,
      language
    });

    return res.status(200).json({
      success: true,
      data: {
        text: transcription.text,
        language: transcription.detectedLanguage
      }
    });
  } catch (error) {
    logger.error(`Error transcribing audio: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Failed to transcribe audio'
    });
  }
});

module.exports = router;
