import { useState } from 'react';
import { HelpCircle, BookOpen, MessageSquare, FileText, PlayCircle, ExternalLink, Users, Image } from 'lucide-react';
import AdminLayout from './AdminLayout';
import '../../css/AdminComponents.css';

const HelpSupportPage = () => {
  const [activeCategory, setActiveCategory] = useState('getting-started');
  
  const breadcrumbs = [
    { label: 'Admin', path: '/admin/dashboard' },
    { label: 'Help & Support' }
  ];

  const helpCategories = [
    {
      id: 'getting-started',
      label: 'Getting Started',
      icon: <PlayCircle size={20} />,
      articles: [
        { id: 'welcome', title: 'Welcome to the Museum Admin', description: 'An overview of the museum administration platform.' },
        { id: 'dashboard', title: 'Navigating the Dashboard', description: 'Learn how to use the main dashboard and its features.' },
        { id: 'setup', title: 'Initial Setup Guide', description: 'Steps to set up your museum profile and first exhibits.' }
      ]
    },
    {
      id: 'user-management',
      label: 'User Management',
      icon: <Users size={20} />,
      articles: [
        { id: 'add-users', title: 'Adding New Users', description: 'How to create and manage user accounts.' },
        { id: 'roles', title: 'Understanding Roles', description: 'Learn about different user roles and their capabilities.' },
        { id: 'permissions', title: 'Managing Permissions', description: 'How to assign and customize user permissions.' }
      ]
    },
    {
      id: 'exhibits',
      label: 'Exhibit Management',
      icon: <Image size={20} />,
      articles: [
        { id: 'create-exhibit', title: 'Creating Exhibits', description: 'Step by step guide to creating engaging digital exhibits.' },
        { id: 'media', title: 'Working with Media', description: 'How to upload and manage images, videos, and audio files.' },
        { id: 'qr-codes', title: 'QR Codes and Scanning', description: 'Setting up QR codes for physical-to-digital connections.' }
      ]
    },
    {
      id: 'troubleshooting',
      label: 'Troubleshooting',
      icon: <HelpCircle size={20} />,
      articles: [
        { id: 'common-issues', title: 'Common Issues', description: 'Solutions to frequent problems and questions.' },
        { id: 'error-messages', title: 'Error Messages', description: 'Understanding system error messages and how to resolve them.' },
        { id: 'contact-support', title: 'Contact Support', description: 'How to get help from our support team.' }
      ]
    }
  ];

  return (
    <AdminLayout currentPath="/admin/help" breadcrumbs={breadcrumbs}>
      <div className="admin-help-container">
        <div className="admin-help-sidebar">
          <div className="admin-help-search">
            <input
              type="text"
              placeholder="Search for help..."
              className="admin-help-search-input"
            />
          </div>
          
          <nav className="admin-help-nav">
            <h3 className="admin-help-nav-title">Help Categories</h3>
            <ul className="admin-help-nav-list">
              {helpCategories.map(category => (
                <li key={category.id}>
                  <button
                    className={`admin-help-nav-button ${activeCategory === category.id ? 'active' : ''}`}
                    onClick={() => setActiveCategory(category.id)}
                  >
                    {category.icon}
                    <span>{category.label}</span>
                  </button>
                </li>
              ))}
            </ul>

            <div className="admin-help-contact">
              <h3 className="admin-help-contact-title">Need more help?</h3>
              <a href="#" className="admin-help-contact-link">
                <MessageSquare size={16} />
                <span>Contact Support</span>
              </a>
            </div>
          </nav>
        </div>
        
        <div className="admin-help-content">
          {helpCategories.filter(c => c.id === activeCategory).map(category => (
            <div key={category.id} className="admin-help-category">
              <h2 className="admin-help-category-title">{category.label}</h2>
              
              <div className="admin-help-articles">
                {category.articles.map(article => (
                  <div key={article.id} className="admin-help-article-card">
                    <h3 className="admin-help-article-title">{article.title}</h3>
                    <p className="admin-help-article-description">{article.description}</p>
                    <div className="admin-help-article-actions">
                      <button className="admin-help-article-button">
                        <BookOpen size={16} />
                        <span>Read Article</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="admin-help-resources">
            <h3 className="admin-help-resources-title">Additional Resources</h3>
            
            <div className="admin-help-resources-grid">
              <a href="#" className="admin-help-resource-card">
                <div className="admin-help-resource-icon">
                  <FileText size={24} />
                </div>
                <h4 className="admin-help-resource-title">Documentation</h4>
                <p className="admin-help-resource-description">
                  Browse our complete documentation
                </p>
                <div className="admin-help-resource-link">
                  <ExternalLink size={14} />
                </div>
              </a>
              
              <a href="#" className="admin-help-resource-card">
                <div className="admin-help-resource-icon">
                  <PlayCircle size={24} />
                </div>
                <h4 className="admin-help-resource-title">Video Tutorials</h4>
                <p className="admin-help-resource-description">
                  Watch step-by-step tutorial videos
                </p>
                <div className="admin-help-resource-link">
                  <ExternalLink size={14} />
                </div>
              </a>
              
              <a href="#" className="admin-help-resource-card">
                <div className="admin-help-resource-icon">
                  <MessageSquare size={24} />
                </div>
                <h4 className="admin-help-resource-title">Community Forum</h4>
                <p className="admin-help-resource-description">
                  Join discussions with other users
                </p>
                <div className="admin-help-resource-link">
                  <ExternalLink size={14} />
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default HelpSupportPage;
