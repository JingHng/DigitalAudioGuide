// languageUtils.ts
export const languages = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "zh-CN", name: "简体中文", flag: "🇨🇳" },
  { code: "zh-TW", name: "繁體中文", flag: "🇹🇼" },
  { code: "ja", name: "日本語", flag: "🇯🇵" },
  { code: "ko", name: "한국어", flag: "🇰🇷" },
  { code: "th", name: "ไทย", flag: "🇹🇭" },
  { code: "vi", name: "Tiếng Việt", flag: "🇻🇳" },
  { code: "ms", name: "Bahasa Melayu", flag: "🇲🇾" },
  { code: "id", name: "Bahasa Indonesia", flag: "🇮🇩" },
];

// Check if localStorage is available
const isLocalStorageAvailable = (): boolean => {
  try {
    const test = '__localStorage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
};

export const getUserPreferredLanguage = (): string => {
  if (!isLocalStorageAvailable()) return "en";
  return localStorage.getItem("userPreferredLanguage") || "en";
};

export const getAdminPreferredLanguage = (): string => {
  if (!isLocalStorageAvailable()) return "en";
  return localStorage.getItem("adminPreferredLanguage") || "en";
};

export const setUserPreferredLanguage = (languageCode: string): void => {
  if (!isLocalStorageAvailable()) return;
  localStorage.setItem("userPreferredLanguage", languageCode);
};

export const setAdminPreferredLanguage = (languageCode: string): void => {
  if (!isLocalStorageAvailable()) return;
  localStorage.setItem("adminPreferredLanguage", languageCode);
};

export const applyLanguagePreference = (languageCode: string): void => {
  try {
    if (isLocalStorageAvailable()) {
      localStorage.setItem("selectedLanguage", languageCode);
    }
    
    if (languageCode === "en") {
      // For English, completely reset Google Translate
      // Clear any existing translation hash
      window.location.hash = "";
      
      // Remove Google Translate elements if they exist
      const gtElements = document.querySelectorAll('[id^="google_translate"], .goog-te-banner-frame, .skiptranslate');
      gtElements.forEach(el => el.remove());
      
      // Clear Google Translate cookies
      document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=." + window.location.hostname;
      document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      
      // Force reload to completely reset the page
      setTimeout(() => {
        window.location.reload(true);
      }, 100);
    } else {
      // For other languages, set the translation hash
      const hash = `#googtrans(en|${languageCode})`;
      if (window.location.hash !== hash) {
        window.location.hash = hash;
        setTimeout(() => {
          window.location.reload();
        }, 100);
      }
    }
  } catch (error) {
    console.error("Error applying language preference:", error);
  }
};

export const getLanguageByCode = (code: string) => {
  return languages.find(lang => lang.code === code);
};

export const initializeUserLanguagePreference = (isAdmin: boolean = false): void => {
  const preferredLang = isAdmin ? getAdminPreferredLanguage() : getUserPreferredLanguage();
  
  // Always apply the preferred language, even if it's English
  const currentLang = isLocalStorageAvailable() ? localStorage.getItem("selectedLanguage") : null;
  if (preferredLang !== currentLang) {
    applyLanguagePreference(preferredLang);
  }
};

// Function to ensure language preference is applied on page load
export const ensureLanguagePersistence = (): void => {
  try {
    if (!isLocalStorageAvailable()) return;
    
    // Check if we have a stored language preference
    const storedLang = localStorage.getItem("selectedLanguage");
    const currentHash = window.location.hash;
    
    if (storedLang && storedLang !== "en") {
      const expectedHash = `#googtrans(en|${storedLang})`;
      if (currentHash !== expectedHash) {
        window.location.hash = expectedHash;
      }
    } else if (storedLang === "en" && currentHash.includes("googtrans")) {
      // If English is selected, completely clear Google Translate
      window.location.hash = "";
      
      // Clear Google Translate cookies
      document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=." + window.location.hostname;
      document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      
      // Remove any Google Translate elements
      setTimeout(() => {
        const gtElements = document.querySelectorAll('[id^="google_translate"], .goog-te-banner-frame, .skiptranslate');
        gtElements.forEach(el => el.remove());
      }, 100);
    }
  } catch (error) {
    console.error("Error ensuring language persistence:", error);
  }
};