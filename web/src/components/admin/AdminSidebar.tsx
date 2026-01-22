import React from 'react';
import { 
  Home, 
  BarChart3, 
  FileText, 
  Users, 
  Shield, 
  Key, 
  Image, 
  Music,
  Plus,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Settings,
  Bot,
  Award,
  Eye
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Avatar from '../common/Avatar';
import '../../css/AdminSidebar.css';

interface AdminSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  currentPath?: string;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  hasAddButton?: boolean;
  addAction?: () => void;
  isCategory?: boolean;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({
  collapsed,
  onToggleCollapse,
  currentPath = ''
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout: authLogout, user } = useAuth();

  const handleAddUser = () => {
    navigate('/admin/users#add-user');
  };

  const handleAddRole = () => {
    navigate('/admin/roles#add-role');
  };

  const handleAddExhibit = () => {
    navigate('/admin/exhibits#add-collection');
  };

  const handleAddBadge = () => {
    navigate('/admin/badges#add-badge');
  };

  const handleAddAudio = () => {
    navigate('/admin/audio#add-audio');
  };

  const handleLogout = () => {
    // Use the auth context's logout function
    authLogout();
    
    // Redirect to homepage
    navigate('/');
  };

  const menuItems: MenuItem[] = [
    {
      id: 'home',
      label: 'Home',
      icon: <Home size={20} />,
      path: '/admin/dashboard'
    },
    {
      id: 'ai-assistant',
      label: 'AI Assistant - Omnie',
      icon: <Bot size={20} />,
      path: '/admin/assistant'
    },
    {
      id: 'audio-analytics',
      label: 'Audio Analytics',
      icon: <BarChart3 size={20} />,
      path: '/admin/audio-analytics'
    },
    {
      id: 'audit-logs',
      label: 'Audit Logs',
      icon: <FileText size={20} />,
      path: '/admin/audit-logs'
    },
    {
      id: 'crud-category',
      label: 'CRUD',
      icon: null,
      path: '',
      isCategory: true
    },
    {
      id: 'users',
      label: 'Users',
      icon: <Users size={20} />,
      path: '/admin/users',
      hasAddButton: true,
      addAction: handleAddUser
    },
    {
      id: 'roles',
      label: 'Roles',
      icon: <Shield size={20} />,
      path: '/admin/roles',
      hasAddButton: true,
      addAction: handleAddRole
    },
    {
      id: 'exhibits',
      label: 'Tour & Exhibits ',
      icon: <Image size={20} />,
      path: '/admin/exhibits',
      hasAddButton: true,
      addAction: handleAddExhibit
    },
    {
      id: 'badges',
      label: 'Badges',
      icon: <Award size={20} />,
      path: '/admin/badges',
      hasAddButton: true,
      addAction: handleAddBadge
    },
    {
      id: 'audio',
      label: 'Audio',
      icon: <Music size={20} />,
      path: '/admin/audio',
      hasAddButton: true,
      addAction: handleAddAudio
    }
     ,
     {
       id: 'reviews',
       label: 'Reviews',
       icon: <Eye size={20} />,
       path: '/admin/reviews'
     }
  ];

  const bottomMenuItems: MenuItem[] = [
    {
      id: 'logout',
      label: 'Log Out',
      icon: <LogOut size={20} />,
      path: '#',
      addAction: handleLogout
    }
  ];
  
  const isActiveItem = (itemPath: string) => {
    if (!itemPath || itemPath === '#') return false;
    return location.pathname === itemPath || 
           location.pathname.startsWith(itemPath + '/') || 
           currentPath === itemPath;
  };

  const renderMenuItem = (item: MenuItem) => {
    if (item.isCategory) {
      return (
        <li key={item.id} className="admin-sidebar-category">
          {!collapsed && (
            <span className="admin-sidebar-category-text">
              {item.label}
            </span>
          )}
        </li>
      );
    }

    const handleClick = (e: React.MouseEvent) => {
      if (item.id === 'logout') {
        e.preventDefault();
        handleLogout();
      }
    };

    return (
      <li key={item.id} className="admin-sidebar-menu-item">
        <div className="admin-sidebar-menu-item-wrapper">
          <Link
            to={item.path}
            className={`admin-sidebar-menu-link ${isActiveItem(item.path) ? 'active' : ''}`}
            title={collapsed ? item.label : undefined}
            onClick={handleClick}
          >
            <span className="admin-sidebar-menu-icon">
              {item.icon}
            </span>
            
            {!collapsed && (
              <span className="admin-sidebar-menu-text">
                {item.label}
              </span>
            )}
          </Link>
          
          {item.hasAddButton && !collapsed && (
            <button
              className="admin-sidebar-add-button"
              onClick={item.addAction}
              title={`Add ${item.label}`}
            >
              <Plus size={16} />
            </button>
          )}
        </div>
      </li>
    );
  };

  return (
    <aside className={`admin-sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="admin-sidebar-header">
        <div className="admin-sidebar-brand">
          <div className="admin-brand-icon">
            <Shield size={24} />
          </div>
          {!collapsed && (
            <div className="admin-brand-text">
              <h2>Admin Dashboard</h2>
            </div>
          )}
        </div>
      </div>

      <div className="admin-sidebar-toggle-wrapper">
        <button
          className="admin-sidebar-toggle"
          onClick={onToggleCollapse}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <nav className="admin-sidebar-nav">
        <ul className="admin-sidebar-menu">
          {menuItems.map(renderMenuItem)}
        </ul>
      </nav>

      <div className="admin-sidebar-bottom">
        {/* User Profile Section */}
        <div className="admin-sidebar-user-section">
          <Link to="/admin/settings" className="admin-sidebar-user-profile">
            <Avatar
              fullName={user?.fullName}
              username={user?.username}
              email={user?.email}
              size={collapsed ? 32 : 40}
              className="admin-sidebar-user-avatar"
            />
            {!collapsed && (
              <div className="admin-sidebar-user-info">
                <div className="admin-sidebar-user-name">
                  {user?.fullName || user?.username || 'Admin User'}
                </div>
                <div className="admin-sidebar-user-role">
                  {user?.roles?.[0] || 'Administrator'}
                </div>
              </div>
            )}
            {!collapsed && (
              <Settings size={16} className="admin-sidebar-user-settings" />
            )}
          </Link>
        </div>
        
        <ul className="admin-sidebar-bottom-menu">
          {bottomMenuItems.map(renderMenuItem)}
        </ul>
      </div>
    </aside>
  );
};

export default AdminSidebar;
