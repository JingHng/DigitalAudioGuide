import React, { useState, useEffect } from "react";
import {
  LogIn,
  Menu,
  X,
  Globe,
  UserPlus,
} from "lucide-react";
// Removed: import { useAuth } from "../contexts/AuthContext";
import "../css/NavBar.css";

const Navbar: React.FC = () => {
  // Removed auth variables: user, isAuthenticated, isAdmin, isSuperAdmin, logout
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);
  // Removed: isUserDropdownOpen state
  const [currentLanguage, setCurrentLanguage] = useState("English");

  // Removed all handleLogout/Debug functions

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const toggleLanguageDropdown = () => {
    setIsLanguageDropdownOpen(!isLanguageDropdownOpen);
    // Removed: setIsUserDropdownOpen(false);
  };

  const translatePage = async (targetLang: string, langName: string) => {
    try {
      setCurrentLanguage(langName);
      setIsLanguageDropdownOpen(false);
      localStorage.setItem("selectedLanguage", targetLang);
      
      const hash = targetLang === "en" ? `#googtrans(auto|en)` : `#googtrans(en|${targetLang})`;

      if (window.location.hash !== hash) {
        window.location.hash = hash;
        setTimeout(() => {
          window.location.reload();
        }, 100);
      }
    } catch (error) {
      console.error("Translation error:", error);
      // Fallback for translation if hash setting fails
      const hash =
        targetLang === "en"
          ? `#googtrans(auto|en)`
          : `#googtrans(en|${targetLang})`;
      localStorage.setItem("selectedLanguage", targetLang);
      window.location.href = `${window.location.href.split("#")[0]}${hash}`;
    }
  };

  const languages = [
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

  useEffect(() => {
    const initializeLanguage = () => {
      const hash = window.location.hash;
      const storedLang = localStorage.getItem("selectedLanguage");

      if (hash.includes("googtrans")) {
        const englishMatch = hash.match(/googtrans\(auto\|en\)/);
        if (englishMatch) {
          setCurrentLanguage("English");
          localStorage.setItem("selectedLanguage", "en");
          return;
        }

        const langMatch = hash.match(/googtrans\(en\|(.+?)\)/);
        if (langMatch) {
          const langCode = langMatch[1];
          const language = languages.find((lang) => lang.code === langCode);
          if (language) {
            setCurrentLanguage(language.name);
            localStorage.setItem("selectedLanguage", langCode);
          }
        }
      } else if (storedLang) {
        const language = languages.find((lang) => lang.code === storedLang);
        if (language) {
          setCurrentLanguage(language.name);
        } else {
          setCurrentLanguage("English");
        }
      } else {
        setCurrentLanguage("English");
      }
    };
    
    initializeLanguage();
    
    const handleHashChange = () => {
      initializeLanguage();
    };
    window.addEventListener("hashchange", handleHashChange);

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        setTimeout(initializeLanguage, 100);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("hashchange", handleHashChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // Only close if the click target is not within the dropdown buttons
      const target = e.target as HTMLElement;
      if (!target.closest('.language-switcher-container')) {
          setIsLanguageDropdownOpen(false);
      }
      // Removed: setIsUserDropdownOpen(false);
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  return (
    <header className="navbar-header">
      <nav className="navbar-nav">
        {/* Logo */}
        <a href="/" className="navbar-logo">
          <div className="logo-text">
            <span className="logo-line-1">Singapore</span>
            <span className="logo-line-2">Discovery Centre</span>
          </div>
        </a>

        {/* Mobile Controls & Auth/Language Block */}
        <div className="mobile-controls">
          {/* Static Auth Buttons - Mobile */}
          <div className="auth-buttons-mobile">
            <a href="/login" className="admin-login-link mobile-login">
              <LogIn size={16} />
              <span>Login</span>
            </a>
            <a href="/register" className="admin-register-link mobile-register">
              <UserPlus size={16} />
              <span>Register</span>
            </a>
          </div>

          <button
            className="hamburger-button"
            onClick={toggleMenu}
            aria-label="Toggle navigation"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Navigation Links Container (for mobile dropdown) */}
        <div
          className={`nav-links mobile-controls ${isMenuOpen ? "open" : ""}`}
        >
          <a href="/exhibitions" onClick={() => setIsMenuOpen(false)}>
            Exhibits
          </a>
          <a href="/reviews" onClick={() => setIsMenuOpen(false)}>
            Reviews
          </a>
          <a href="/#how-it-works" onClick={() => setIsMenuOpen(false)}>
            How It Works
          </a>

          {/* Language Switcher in mobile menu (Keep) */}
          <div className="language-switcher-container">
            <button
              className="language-switcher-button"
              onClick={(e) => {
                e.stopPropagation();
                toggleLanguageDropdown();
              }}
              aria-label="Select language"
            >
              <Globe size={20} />
            </button>
            {isLanguageDropdownOpen && (
              <div className="language-dropdown">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    className={`language-option ${
                      currentLanguage === lang.name ? "active" : ""
                    }`}
                    onClick={() => translatePage(lang.code, lang.name)}
                  >
                    <span className="flag">{lang.flag}</span>
                    <span className="lang-name">{lang.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* --- Desktop Navigation Links Container --- */}
        <div className="nav-links">
          <a href="/exhibitions">Exhibits</a>
          <a href="/reviews">Reviews</a>
          <a href="/#how-it-works">How It Works</a>

          {/* Static Auth Buttons - Desktop */}
          <div className="auth-buttons-desktop">
            <a href="/login" className="admin-login-link desktop-login">
              <LogIn size={16} />
              <span>Login</span>
            </a>
            <a href="/register" className="admin-register-link desktop-register">
              <UserPlus size={16} />
              <span>Register</span>
            </a>
          </div>

          {/* Desktop Language Switcher (Keep) */}
          <div className="language-switcher-container desktop-language">
            <button
              className="language-switcher-button"
              onClick={(e) => {
                e.stopPropagation();
                toggleLanguageDropdown();
              }}
              aria-label="Select language"
            >
              <Globe size={20} />
            </button>
            {isLanguageDropdownOpen && (
              <div className="language-dropdown">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    className={`language-option ${
                      currentLanguage === lang.name ? "active" : ""
                    }`}
                    onClick={() => translatePage(lang.code, lang.name)}
                  >
                    <span className="flag">{lang.flag}</span>
                    <span className="lang-name">{lang.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Navbar;