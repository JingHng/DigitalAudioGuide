// config/profanity.config.js
/**
 * Profanity checking configuration
 * 
 * MODE OPTIONS:
 * - 'reject': Reject review submission entirely if profanity is detected (RECOMMENDED)
 * - 'censor': Replace profane words with asterisks (e.g., "f***")
 * - 'flag': Allow submission but flag the review for manual moderation
 * 
 * CUSTOM WORDS:
 * Add any additional words you want to filter beyond the default list
 */

module.exports = {
  // Set the profanity handling mode
  // 'reject' mode prevents submission until all profanity is removed
  mode: 'reject', // Change to 'censor' or 'flag' if needed
  
  // Add custom banned words here
  customWords: [
    // Add your custom words
    // Example: 'customword1', 'customword2'
  ],
  
  // Whether to log profanity detections (for monitoring purposes)
  logDetections: true,
};
