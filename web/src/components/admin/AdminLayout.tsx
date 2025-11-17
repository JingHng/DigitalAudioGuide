import React, { useState, useEffect, ReactNode } from 'react';
import { 
  User, 
  Settings, 
  LogOut, 
  Sun, 
  Moon, 
  ChevronDown,
  ChevronRight,
  Globe
} from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import AdminSidebar from './AdminSidebar';
import Avatar from '../common/Avatar';
import '../../css/AdminLayout.css';

interface BreadcrumbItem {
  label: string;
  path?: string;
}

export interface AdminLayoutProps {
  children: ReactNode;
  currentPath: string;
  breadcrumbs?: BreadcrumbItem[];
}

const AdminLayout: React.FC<AdminLayoutProps> = ({
  children,
  currentPath,
  breadcrumbs = []
}) => {
  const { user, logout } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('admin-dark-mode');
    return saved ? JSON.parse(saved) : false;
  });
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState("English");
  
  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };
  
  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    // Save to localStorage
    localStorage.setItem('admin-dark-mode', JSON.stringify(newDarkMode));
    // Apply the theme change to the document element
    document.documentElement.classList.toggle('dark-mode', newDarkMode);
  };

  const toggleLanguageDropdown = () => {
    setIsLanguageDropdownOpen(!isLanguageDropdownOpen);
    setUserMenuOpen(false); // Close user dropdown
  };

  const translatePage = async (targetLang: string, langName: string) => {
    try {
      setCurrentLanguage(langName);
      setIsLanguageDropdownOpen(false);
      localStorage.setItem("selectedLanguage", targetLang);
      if (targetLang === "en") {
        const newHash = `#googtrans(auto|en)`;
        if (window.location.hash === newHash) {
          return;
        }
        window.location.hash = newHash;
        setTimeout(() => {
          window.location.reload();
        }, 100);
        return;
      }
      const newHash = `#googtrans(en|${targetLang})`;
      if (window.location.hash === newHash) {
        return;
      }
      window.location.hash = newHash;
      setTimeout(() => {
        window.location.reload();
      }, 100);
    } catch (error) {
      console.error("Translation error:", error);
      console.error("Error details:", {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        targetLang,
        langName,
        currentHash: window.location.hash,
        currentUrl: window.location.href
      });
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
  
  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  // Use real user data from auth context
  const currentUser = user ? {
    name: user.username || 'Admin User',
    email: user.email || 'admin@museum.com',
    role: user.roles?.[0] || 'Administrator',
    avatar: null // No avatar for now
  } : {
    name: 'Admin User',
    email: 'admin@museum.com',
    role: 'Administrator',
    avatar: null
  };

  // Apply dark mode on mount
  useEffect(() => {
    document.documentElement.classList.toggle('dark-mode', darkMode);
  }, []);

  useEffect(() => {
    const initializeLanguage = () => {
      const hash = window.location.hash;
      const storedLang = localStorage.getItem("selectedLanguage");

      if (hash.includes("googtrans")) {
        // Handle English (auto|en) pattern
        const englishMatch = hash.match(/googtrans\(auto\|en\)/);
        if (englishMatch) {
          setCurrentLanguage("English");
          localStorage.setItem("selectedLanguage", "en");
          return;
        }

        // Handle other languages (en|lang) pattern
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
        // Restore language from localStorage when no hash present
        const language = languages.find((lang) => lang.code === storedLang);
        if (language) {
          setCurrentLanguage(language.name);
        } else {
          setCurrentLanguage("English");
        }
      } else {
        // Default to English if nothing stored
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
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      
      // Check if click is outside language switcher
      if (!target.closest('.admin-language-switcher')) {
        setIsLanguageDropdownOpen(false);
      }
      
      // Check if click is outside user dropdown
      if (!target.closest('.admin-user-dropdown')) {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  return (
    <div className={`admin-layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''} ${darkMode ? 'dark-mode' : ''}`}>
      <AdminSidebar 
        collapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebar}
        currentPath={currentPath}
      />
      
      <div className="admin-content-wrapper">
        <div className="admin-page-header">
          {/* Breadcrumbs */}
          <nav className="admin-breadcrumbs">
            <ol className="admin-breadcrumbs-list">
              {breadcrumbs.map((item, index) => (
                <li key={index} className="admin-breadcrumbs-item">
                  {item.path ? (
                    <a href={item.path} className="admin-breadcrumbs-link">{item.label}</a>
                  ) : (
                    <span className="admin-breadcrumbs-text">{item.label}</span>
                  )}
                  
                  {index < breadcrumbs.length - 1 && (
                    <ChevronRight className="admin-breadcrumbs-separator" size={16} />
                  )}
                </li>
              ))}
            </ol>
          </nav>
          
          <div className="admin-page-actions">
            {/* Language Switcher */}
            <div className="admin-language-switcher">
              <button
                className="admin-action-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleLanguageDropdown();
                }}
                aria-label="Select language"
              >
                <Globe size={18} />
              </button>
              {isLanguageDropdownOpen && (
                <div className="admin-language-dropdown">
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      className={`admin-language-option ${
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

            {/* Theme toggle */}
            <button 
              className="admin-action-btn"
              onClick={toggleDarkMode}
              aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            
            {/* User menu */}
            <div className="admin-user-dropdown">
              <button 
                className="admin-user-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setUserMenuOpen(!userMenuOpen);
                  setIsLanguageDropdownOpen(false); // Close language dropdown
                }}
                aria-expanded={userMenuOpen}
                aria-haspopup="true"
              >
                <Avatar
                  fullName={user?.fullName}
                  username={user?.username}
                  email={user?.email}
                  size={32}
                  className="admin-user-avatar"
                  showTooltip={true}
                />
                <span className="admin-user-name">{currentUser.name}</span>
                <ChevronDown size={14} className="admin-user-arrow" />
              </button>
              
              {userMenuOpen && (
                <div className="admin-user-menu">
                  <div className="admin-user-info">
                    <strong>{currentUser.name}</strong>
                    <span>{currentUser.email}</span>
                    <span className="admin-user-role">{currentUser.role}</span>
                  </div>
                  
                  <ul className="admin-user-menu-list">
                    <li>
                      <a href="/admin/settings" className="admin-user-menu-link">
                        <Settings size={16} />
                        <span>Settings</span>
                      </a>
                    </li>
                    <li className="admin-user-menu-divider"></li>
                    <li>
                      <button className="admin-user-menu-btn" onClick={handleLogout}>
                        <LogOut size={16} />
                        <span>Log out</span>
                      </button>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <main className="admin-main-content">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
