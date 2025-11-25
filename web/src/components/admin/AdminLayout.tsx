import React, { useState, useEffect, ReactNode } from 'react';
import { 
  User, 
  Settings, 
  LogOut, 
  Sun, 
  Moon, 
  ChevronDown,
  ChevronRight
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


  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      
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
