const { OpenAI } = require('openai');
const { logger } = require('../utils/logger');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Detect the language of a text message
 * @param {string} text - The text to analyze
 * @returns {string} - ISO language code
 */
async function detectLanguage(text) {
  try {
    if (!text || text.trim().length === 0) {
      return 'en'; // Default to English for empty text
    }

    logger.info('Detecting language...');
    
    // Use OpenAI to detect language
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a language detection tool. Respond with only the ISO 639-1 language code (e.g., 'en' for English, 'es' for Spanish, etc.) for the provided text."
        },
        {
          role: "user",
          content: text
        }
      ],
      temperature: 0.1,
      max_tokens: 10,
    });
    
    const languageCode = response.choices[0].message.content.trim().toLowerCase();
    logger.info(`Detected language: ${languageCode}`);
    
    return languageCode;
  } catch (error) {
    logger.error(`Error detecting language: ${error.message}`);
    return 'en'; // Default to English on error
  }
}

/**
 * Translate text if needed
 * @param {string} text - The text to translate
 * @param {string} sourceLanguage - Source language code
 * @param {string} targetLanguage - Target language code
 * @returns {string} - Translated text
 */
async function translateIfNeeded(text, sourceLanguage, targetLanguage) {
  try {
    // If languages are the same, no translation needed
    if (sourceLanguage === targetLanguage) {
      return text;
    }
    
    logger.info(`Translating from ${sourceLanguage} to ${targetLanguage}`);
    
    // Use OpenAI for translation
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a translation tool. Translate the following text from ${sourceLanguage} to ${targetLanguage}. Provide only the translated text without any explanations or notes.`
        },
        {
          role: "user",
          content: text
        }
      ],
      temperature: 0.3,
      max_tokens: 1000,
    });
    
    const translatedText = response.choices[0].message.content.trim();
    logger.info(`Translation complete: ${text.length} chars → ${translatedText.length} chars`);
    
    return translatedText;
  } catch (error) {
    logger.error(`Error translating text: ${error.message}`);
    return text; // Return original text on error
  }
}

/**
 * Get supported languages
 * @returns {Array} - List of supported language codes and names
 */
function getSupportedLanguages() {
  // This is a static list of commonly supported languages
  return [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'ru', name: 'Russian' },
    { code: 'zh', name: 'Chinese' },
    { code: 'ja', name: 'Japanese' },
    { code: 'ko', name: 'Korean' },
    { code: 'ar', name: 'Arabic' },
    { code: 'hi', name: 'Hindi' },
    { code: 'bn', name: 'Bengali' },
    { code: 'ur', name: 'Urdu' },
    { code: 'tr', name: 'Turkish' },
    { code: 'nl', name: 'Dutch' },
    { code: 'sv', name: 'Swedish' },
    { code: 'pl', name: 'Polish' },
    { code: 'vi', name: 'Vietnamese' },
    { code: 'th', name: 'Thai' }
  ];
}

module.exports = {
  detectLanguage,
  translateIfNeeded,
  getSupportedLanguages
};
