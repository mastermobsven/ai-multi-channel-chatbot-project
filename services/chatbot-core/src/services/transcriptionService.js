const { OpenAI } = require('openai');
const { logger } = require('../utils/logger');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Transcribe audio data to text using OpenAI Whisper
 * @param {Object} params - Transcription parameters
 * @param {string} params.audioData - Base64 encoded audio data
 * @param {string} params.format - Audio format (mp3, wav, etc.)
 * @param {string} params.language - Optional language hint
 * @returns {Object} - Transcription result with text and detected language
 */
async function transcribeAudio({ audioData, format = 'mp3', language = null }) {
  try {
    logger.info(`Transcribing audio in ${format} format${language ? ` with language hint: ${language}` : ''}`);
    
    // Convert base64 to buffer
    const audioBuffer = Buffer.from(audioData, 'base64');
    
    // Create a temporary file name
    const fileName = `audio-${Date.now()}.${format}`;
    
    // Prepare transcription options
    const transcriptionOptions = {
      file: {
        name: fileName,
        data: audioBuffer
      },
      model: "whisper-1",
      response_format: "json"
    };
    
    // Add language if provided
    if (language) {
      transcriptionOptions.language = language;
    }
    
    // Call OpenAI Whisper API
    const transcription = await openai.audio.transcriptions.create(transcriptionOptions);
    
    logger.info(`Transcription successful, ${transcription.text.length} characters`);
    
    return {
      text: transcription.text,
      detectedLanguage: transcription.language || language || 'auto-detected'
    };
  } catch (error) {
    logger.error(`Error in transcribeAudio: ${error.message}`);
    throw error;
  }
}

module.exports = {
  transcribeAudio
};
