const axios = require('axios');

async function translateText(req, res) {
  // Get the 'text' and 'targetLanguage' that the frontend sent in the request body.
  const { text, targetLanguage } = req.body;

  if (!text || !targetLanguage) {
    return res.status(400).json({ error: 'Source text and target language are required.' });
  }

  // The MyMemory API needs the language pair in a specific format (e.g., "en|ja").
  const languagePair = `en|${targetLanguage}`;
  
  // Construct the full URL for the MyMemory API.
  // We use encodeURIComponent to safely handle special characters in the text.
  const apiUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${languagePair}&de=youremail@example.com`;

  try {
    // Make the API call to MyMemory using axios.
    const response = await axios.get(apiUrl);
    const data = response.data; // The actual JSON response from the API is in the .data property.

    // MyMemory tells us if the request was successful with a 'responseStatus' of 200.
    if (data.responseStatus === 200) {
      // Extract the translated text from the response.
      const translatedText = data.responseData.translatedText;
      // Send the translated text back to the frontend.
      res.json({ translatedText });
    } else {
      // If the API returned an error, we'll log it for debugging and send an error message back.
      console.error('MyMemory API Error:', data.responseDetails);
      throw new Error(data.responseDetails || 'Translation failed.');
    }

  } catch (error) {
    // This will catch any network errors (e.g., if you're offline) or other problems.
    console.error('ERROR making MyMemory API call:', error.message);
    res.status(500).json({ error: 'Failed to translate text.' });
  }
}

// Export the function so our route file can use it.
module.exports = {
  translateText
};