import React, { useState, useEffect } from "react";
import {
  LogIn,
  Menu,
  X,
  Globe,
  UserPlus,
  ShieldCheck,
  User,
  Settings,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import "../css/NavBar.css";

const Navbar: React.FC = () => {
  const { user, isAuthenticated, isAdmin, isSuperAdmin, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState("English");

  const handleLogout = () => {
    try {
      // Clear all stored data explicitly
      localStorage.removeItem("token");
      localStorage.removeItem("userData");
      localStorage.removeItem("userType");
      localStorage.removeItem("selectedLanguage");

      // Use auth context logout (which also clears localStorage)
      logout();

      // Force a page reload to ensure everything is cleared
      window.location.href = "/";
    } catch (error) {
      console.error("Logout error:", error);
      // Fallback: force clear everything and reload
      localStorage.clear();
      window.location.href = "/";
    }
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const toggleLanguageDropdown = () => {
    setIsLanguageDropdownOpen(!isLanguageDropdownOpen);
    setIsUserDropdownOpen(false); // Close user dropdown
  };

  const toggleUserDropdown = () => {
    setIsUserDropdownOpen(!isUserDropdownOpen);
    setIsLanguageDropdownOpen(false); // Close language dropdown
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
    const handleClickOutside = () => {
      setIsLanguageDropdownOpen(false);
      setIsUserDropdownOpen(false);
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
          {isAuthenticated ? (
            <div className="user-menu-mobile">
              <button
                className="admin-login-link mobile-login"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleUserDropdown();
                }}
              >
                <User size={16} />
                <span>{user?.username}</span>
              </button>
              {isUserDropdownOpen && (
                <div className="user-dropdown mobile-user-dropdown">
                  <div className="user-info">
                    <span className="username">{user?.username}</span>
                    <span className="user-roles">{user?.roles?.join(", ") || "No roles"}</span>
                  </div>
                  <div className="dropdown-divider"></div>
                  <a href="/dashboard" className="dropdown-item">
                    <User size={16} />
                    Settings
                  </a>
                  {isAdmin() && (
                    <a href="/admin/dashboard" className="dropdown-item">
                      <ShieldCheck size={16} />
                      Admin Dashboard
                    </a>
                  )}
                  <button
                    onClick={handleLogout}
                    className="dropdown-item logout-item"
                  >
                    <LogIn size={16} />
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
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
          )}

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

        </div>

        {/* --- Desktop Navigation Links Container --- */}
        <div className="nav-links">
          <a href="/exhibitions">Exhibits</a>
          <a href="/reviews">Reviews</a>
          <a href="/#how-it-works">How It Works</a>

          {isAuthenticated ? (
            <div className="user-menu-desktop">
              <button
                className="admin-login-link desktop-login"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleUserDropdown();
                }}
              >
                <User size={16} />
                <span>{user?.username}</span>
                <span className="role-badge">{user?.roles?.[0] || 'No Role'}</span>
              </button>
              {isUserDropdownOpen && (
                <div className="user-dropdown desktop-user-dropdown">
                  <div className="user-info">
                    <span className="username">{user?.username}</span>
                    <span className="user-roles">{user?.roles?.join(", ") || "No roles"}</span>
                  </div>
                  <div className="dropdown-divider"></div>
                  <a href="/dashboard" className="dropdown-item">
                    <User size={16} />
                    Settings
                  </a>
                  {isAdmin() && (
                    <a href="/admin/dashboard" className="dropdown-item">
                      <ShieldCheck size={16} />
                      Admin Dashboard
                    </a>
                  )}
                  {isSuperAdmin() && (
                    <a href="/admin/users" className="dropdown-item">
                      <Settings size={16} />
                      User Management
                    </a>
                  )}
                  <div className="dropdown-divider"></div>
                  <button
                    onClick={handleLogout}
                    className="dropdown-item logout-item"
                  >
                    <LogIn size={16} />
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
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
          )}

        </div>
      </nav>
    </header>
  );
};

export default Navbar;