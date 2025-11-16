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
  HelpCircle,
  CheckCircle,
  ArrowRight,
  BookOpen,
  Settings
} from 'lucide-react';
import AdminLayout from './AdminLayout';
import '../../css/HelpAndInformationPage.css';

interface HelpSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  description: string;
  features: string[];
  quickActions?: string[];
}

const HelpAndInformationPage: React.FC = () => {
  // Define breadcrumbs for the page
  const breadcrumbs = [
    { label: 'Admin', path: '/admin/dashboard' },
    { label: 'Help & Information' }
  ];
  const helpSections: HelpSection[] = [
    {
      id: 'home',
      title: 'Home Dashboard',
      icon: <Home size={24} />,
      description: 'Your central hub for monitoring system activity and key metrics.',
      features: [
        'View real-time system statistics',
        'Monitor active users and sessions',
        'Quick access to recent activities',
        'System health indicators',
        'Performance metrics overview'
      ],
      quickActions: [
        'Check system status',
        'View daily summaries',
        'Access quick settings'
      ]
    },
    {
      id: 'audio-analytics',
      title: 'Audio Analytics',
      icon: <BarChart3 size={24} />,
      description: 'Comprehensive analytics for audio content and user interactions.',
      features: [
        'Track audio playback statistics',
        'Monitor user engagement metrics',
        'Generate detailed reports',
        'View trending audio content',
        'Analyze listening patterns'
      ],
      quickActions: [
        'Generate monthly reports',
        'Export analytics data',
        'Set up custom dashboards'
      ]
    },
    {
      id: 'audit-logs',
      title: 'Audit Logs',
      icon: <FileText size={24} />,
      description: 'Complete system activity tracking and security monitoring.',
      features: [
        'View all system activities',
        'Track user actions and changes',
        'Monitor security events',
        'Filter logs by date and type',
        'Export audit reports'
      ],
      quickActions: [
        'Search specific events',
        'Filter by user or action',
        'Download log files'
      ]
    },
    {
      id: 'users',
      title: 'User Management',
      icon: <Users size={24} />,
      description: 'Manage user accounts, profiles, and access permissions.',
      features: [
        'Create and edit user accounts',
        'Assign roles and permissions',
        'Monitor user activity',
        'Bulk user operations',
        'User profile management'
      ],
      quickActions: [
        'Add new users quickly',
        'Reset user passwords',
        'Bulk import users'
      ]
    },
    {
      id: 'roles',
      title: 'Role Management',
      icon: <Shield size={24} />,
      description: 'Define and manage user roles with specific permission sets.',
      features: [
        'Create custom roles',
        'Assign permissions to roles',
        'Manage role hierarchies',
        'View role usage statistics',
        'Clone and modify existing roles'
      ],
      quickActions: [
        'Create new roles quickly',
        'Copy permissions from existing roles',
        'Bulk assign roles to users'
      ]
    },
    {
      id: 'permissions',
      title: 'Permission Management',
      icon: <Key size={24} />,
      description: 'Fine-grained control over system access and capabilities.',
      features: [
        'Define granular permissions',
        'Group permissions by category',
        'Assign permissions to roles/users',
        'View permission usage',
        'Audit permission changes'
      ],
      quickActions: [
        'Quick permission search',
        'Bulk permission updates',
        'Permission impact analysis'
      ]
    },
    {
      id: 'exhibits',
      title: 'Exhibit Management',
      icon: <Image size={24} />,
      description: 'Manage museum exhibits, content, and visitor experiences.',
      features: [
        'Create and edit exhibits',
        'Manage exhibit media content',
        'Schedule exhibit displays',
        'Track visitor engagement',
        'Organize exhibit categories'
      ],
      quickActions: [
        'Create new exhibits quickly',
        'Upload media files',
        'Schedule exhibit rotations'
      ]
    },
    {
      id: 'audio',
      title: 'Audio Management',
      icon: <Music size={24} />,
      description: 'Comprehensive audio content management and delivery system.',
      features: [
        'Upload and organize audio files',
        'Manage audio metadata',
        'Quality control and processing',
        'Audio delivery optimization',
        'Usage tracking and analytics'
      ],
      quickActions: [
        'Upload new audio content',
        'Process audio files',
        'Update metadata quickly'
      ]
    }
  ];

  const generalTips = [
    {
      title: 'Navigation Tips',
      tips: [
        'Use the sidebar collapse button to maximize workspace',
        'Click the + icons next to menu items for quick actions',
        'Use keyboard shortcuts for faster navigation',
        'Bookmark frequently used pages for quick access'
      ]
    },
    {
      title: 'Best Practices',
      tips: [
        'Regularly review audit logs for security monitoring',
        'Keep user roles and permissions up to date',
        'Monitor system performance through the dashboard',
        'Back up important data before making bulk changes'
      ]
    },
    {
      title: 'Troubleshooting',
      tips: [
        'Clear browser cache if pages load slowly',
        'Check your permissions if you cannot access a feature',
        'Contact system administrator for technical issues',
        'Use the search function to quickly find specific items'
      ]
    }
  ];

  return (
    <AdminLayout currentPath="/admin/help" breadcrumbs={breadcrumbs}>
      <div className="help-page admin-content-container">
        <div className="help-header">
          <div className="help-header-content">
            <div className="help-icon">
              <HelpCircle size={32} />
            </div>
            <div className="help-header-text">
              <h1>Help & Information</h1>
              <p>Complete guide to using the Admin Dashboard effectively</p>
            </div>
          </div>
        </div>

        <div className="help-content">
          <div className="help-sections">
            <h2 className="section-title">
              <BookOpen size={20} />
              Admin Pages Guide
            </h2>
            
            <div className="help-cards">
            {helpSections.map((section) => (
              <div key={section.id} className="help-card">
                <div className="help-card-header">
                  <div className="help-card-icon">
                    {section.icon}
                  </div>
                  <h3 className="help-card-title">{section.title}</h3>
                </div>
                
                <p className="help-card-description">{section.description}</p>
                
                <div className="help-card-features">
                  <h4>Key Features:</h4>
                  <ul>
                    {section.features.map((feature, index) => (
                      <li key={index}>
                        <CheckCircle size={16} />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                {section.quickActions && (
                  <div className="help-card-actions">
                    <h4>Quick Actions:</h4>
                    <div className="quick-actions">
                      {section.quickActions.map((action, index) => (
                        <span key={index} className="quick-action">
                          <ArrowRight size={14} />
                          {action}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
            </div>
          </div>

          <div className="help-tips">
            <h2 className="section-title">
              <Settings size={20} />
              Tips & Best Practices
            </h2>
            
            <div className="tips-grid">
            {generalTips.map((category, index) => (
              <div key={index} className="tip-category">
                <h3>{category.title}</h3>
                <ul>
                  {category.tips.map((tip, tipIndex) => (
                    <li key={tipIndex}>
                      <CheckCircle size={16} />
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            </div>
          </div>

          <div className="help-footer">
            <div className="help-contact">
              <h3>Need Additional Help?</h3>
              <p>If you need further assistance or have questions not covered in this guide, please contact your system administrator or technical support team.</p>
              <div className="contact-info">
                <p><strong>System Version:</strong> Admin Dashboard v2.1.0</p>
                <p><strong>Last Updated:</strong> {new Date().toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default HelpAndInformationPage;
