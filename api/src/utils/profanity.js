// utils/profanity.js
// Profanity detection and filtering utility using leo-profanity

const filter = require('leo-profanity');
const profanityConfig = require('../../config/profanity.config.js');

// leo-profanity comes with a default English dictionary already loaded
// No need to explicitly load dictionaries unless switching languages

/**
 * Configuration for profanity checking
 * Loaded from config file and can be modified at runtime
 */
const config = {
  mode: profanityConfig.mode || 'censor',
  customWords: profanityConfig.customWords || [],
  logDetections: profanityConfig.logDetections !== undefined ? profanityConfig.logDetections : true,
};

// Add custom words from config to the filter
if (config.customWords && config.customWords.length > 0) {
  filter.add(config.customWords);
}

/**
 * Set the profanity checking mode
 * @param {string} mode - 'reject', 'censor', or 'flag'
 */
function setMode(mode) {
  if (['reject', 'censor', 'flag'].includes(mode)) {
    config.mode = mode;
  } else {
    throw new Error('Invalid mode. Must be "reject", "censor", or "flag"');
  }
}

/**
 * Add custom banned words
 * @param {string[]} words - Array of words to add
 */
function addCustomWords(words) {
  if (Array.isArray(words)) {
    config.customWords = [...new Set([...config.customWords, ...words])];
    filter.add(words); // Add to leo-profanity filter
  }
}

/**
 * Get all banned words from the filter
 * @returns {string[]} List of banned words
 */
function getBannedWords() {
  return filter.list();
}

/**
 * Scan text for profanity
 * @param {string} text - Text to scan
 * @returns {string[]} Array of profane words found
 */
function scanProfanity(text) {
  if (!text || typeof text !== 'string') return [];
  
  // Use leo-profanity's check method to detect profanity
  const hasProfanity = filter.check(text);
  
  if (!hasProfanity) return [];
  
  // Extract profane words by testing each word individually
  const words = text.split(/\b/); // Split on word boundaries
  const profaneWords = [];
  
  for (const word of words) {
    const cleanWord = word.trim().toLowerCase();
    if (cleanWord && filter.check(cleanWord)) {
      profaneWords.push(cleanWord);
    }
  }
  
  return [...new Set(profaneWords)];
}

/**
 * Censor profanity by replacing with asterisks
 * @param {string} text - Text to censor
 * @returns {string} Censored text
 */
function censorProfanity(text) {
  if (!text || typeof text !== 'string') return text;
  
  // Use leo-profanity's clean method with asterisks
  return filter.clean(text, '*');
}

/**
 * Check text for profanity and handle according to configured mode
 * @param {string} text - Text to check
 * @returns {object} Result object with status and processed text
 *   - passed: boolean - Whether the check passed
 *   - text: string - Processed text (censored if mode is 'censor')
 *   - profaneWords: string[] - List of profane words found
 *   - flagged: boolean - Whether the content should be flagged
 *   - message: string - User-facing message if rejected
 */
function checkProfanity(text) {
  const profaneWords = scanProfanity(text);
  
  if (profaneWords.length === 0) {
    return {
      passed: true,
      text: text,
      profaneWords: [],
      flagged: false,
      message: null,
    };
  }
  
  // Log detection if enabled
  if (config.logDetections) {
    console.log(`[Profanity Detection] Found ${profaneWords.length} profane word(s):`, profaneWords);
  }
  
  // Handle based on mode
  switch (config.mode) {
    case 'reject':
      return {
        passed: false,
        text: text,
        profaneWords,
        flagged: false,
        message: 'Your review contains inappropriate language and cannot be submitted. Please revise your review.',
      };
      
    case 'censor':
      return {
        passed: true,
        text: censorProfanity(text),
        profaneWords,
        flagged: false,
        message: null,
      };
      
    case 'flag':
      return {
        passed: true,
        text: text,
        profaneWords,
        flagged: true,
        message: null,
      };
      
    default:
      return {
        passed: true,
        text: text,
        profaneWords,
        flagged: false,
        message: null,
      };
  }
}

/**
 * Escape special regex characters
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = {
  scanProfanity,
  censorProfanity,
  checkProfanity,
  setMode,
  addCustomWords,
  getBannedWords,
  filter, // Export leo-profanity filter for advanced usage
};
