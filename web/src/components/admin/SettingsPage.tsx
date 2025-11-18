import { useState, useEffect } from 'react';
import { Save, Lock, User, Check, AlertCircle, Eye, EyeOff, Server } from 'lucide-react';
import AdminLayout from './AdminLayout';
import Avatar from '../common/Avatar';
import apiClient from '../../utils/apiClient';
import { languages, getAdminPreferredLanguage, setAdminPreferredLanguage, applyLanguagePreference } from '../../utils/languageUtils';
import { getSystemSettings, updateSystemSettings } from '../../services/systemSettingsService';
import '../../css/AdminComponents.css';
import '../../css/AdminForms.css';
import '../../css/AdminSettings.css';



interface SecuritySettings {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface ProfileSettings {
  username: string;
  email: string;
  fullName: string;
  jobTitle: string;
  bio: string;
  emailVerified?: boolean;
  lastLoginAt?: string;
  createdAt?: string;
}

interface SystemSettings {
  inactivityThresholdDays: number;
}

const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    inactivityThresholdDays: 7
  });



  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [profileSettings, setProfileSettings] = useState<ProfileSettings>({
    username: '',
    email: '',
    fullName: 'John Doe',
    jobTitle: 'Museum Administrator',
    bio: 'Museum administrator with over 5 years of experience in digital exhibit management.',
    emailVerified: false
  });

  // Fetch user profile from backend
  const fetchUserProfile = async () => {
    try {
      const response = await apiClient.get('/auth/profile');
      const user = response.data.user;
      
      console.log('Fetched user profile:', user);
      
      // Update profile settings with backend data
      setProfileSettings(prev => ({
        ...prev,
        username: user.username || '',
        email: user.email || '',
        emailVerified: user.emailVerified,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
        // Keep localStorage values for fields not in backend
        fullName: prev.fullName,
        jobTitle: prev.jobTitle,
        bio: prev.bio
      }));
      
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setErrors({ general: 'Failed to load profile information' });
    }
  };

  // Load settings from localStorage and fetch profile on component mount
  useEffect(() => {
    const loadSettings = () => {
      try {
        const savedProfile = localStorage.getItem('adminSettings_profile');
        if (savedProfile) {
          const profileData = JSON.parse(savedProfile);
          setProfileSettings(prev => ({
            ...prev,
            fullName: profileData.fullName || prev.fullName,
            jobTitle: profileData.jobTitle || prev.jobTitle,
            bio: profileData.bio || prev.bio
          }));
        }

        const savedSecurity = localStorage.getItem('adminSettings_security');
        if (savedSecurity) {
          // No security settings to restore from localStorage currently
          // Placeholder for future implementation
        }
      } catch (error) {
        console.error('Error loading settings from localStorage:', error);
      }
    };

    loadSettings();
    fetchUserProfile();
    fetchSystemSettings();
  }, []);

  // Fetch system settings from backend
  const fetchSystemSettings = async () => {
    try {
      const response = await getSystemSettings();
      setSystemSettings(response.data);
      console.log('Loaded system settings:', response.data);
    } catch (error) {
      console.error('Error fetching system settings:', error);
      setErrors(prev => ({ ...prev, system: 'Failed to load system settings' }));
    }
  };

  const breadcrumbs = [
    { label: 'Admin', path: '/admin/dashboard' },
    { label: 'Settings' }
  ];
  
  const handleInactivityThresholdChange = (value: number) => {
    setSystemSettings(prev => ({
      ...prev,
      inactivityThresholdDays: value
    }));
  };

  // Validation functions
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const getPasswordStrength = (password: string): { strength: number; label: string; color: string } => {
    if (!password) return { strength: 0, label: '', color: '' };
    
    let score = 0;
    const checks = [
      password.length >= 8,
      /[A-Z]/.test(password),
      /[a-z]/.test(password),
      /\d/.test(password),
      /[!@#$%^&*(),.?":{}|<>]/.test(password),
      password.length >= 12
    ];
    
    score = checks.filter(Boolean).length;
    
    if (score <= 2) return { strength: score, label: 'Weak', color: '#ef4444' };
    if (score <= 4) return { strength: score, label: 'Medium', color: '#f59e0b' };
    return { strength: score, label: 'Strong', color: '#10b981' };
  };

  const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  };


  const validateSecuritySettings = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    console.log('Validating security settings:', securitySettings);
    
    // Only validate if user is trying to change password
    if (securitySettings.newPassword || securitySettings.confirmPassword || securitySettings.currentPassword) {
      if (!securitySettings.currentPassword.trim()) {
        newErrors.currentPassword = 'Current password is required to change password';
      }
      
      if (!securitySettings.newPassword.trim()) {
        newErrors.newPassword = 'New password is required';
      } else {
        const passwordValidation = validatePassword(securitySettings.newPassword);
        if (!passwordValidation.isValid) {
          newErrors.newPassword = passwordValidation.errors[0]; // Show first error
        }
      }
      
      if (!securitySettings.confirmPassword.trim()) {
        newErrors.confirmPassword = 'Please confirm your new password';
      } else if (securitySettings.newPassword !== securitySettings.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }
    
    console.log('Security validation errors:', newErrors);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Save functions
  const saveToLocalStorage = (key: string, data: any) => {
    try {
      const serializedData = JSON.stringify(data);
      localStorage.setItem(`adminSettings_${key}`, serializedData);
      console.log(`Saved ${key} to localStorage:`, data);
      
      // Verify the save
      const saved = localStorage.getItem(`adminSettings_${key}`);
      console.log(`Verified ${key} in localStorage:`, saved ? JSON.parse(saved) : null);
      
      return true;
    } catch (error) {
      console.error('Error saving to localStorage:', error);
      throw error;
    }
  };



  const handleSaveSystem = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveStatus('saving');
    setErrors({});

    // Validate inactivity threshold
    const threshold = systemSettings.inactivityThresholdDays;
    if (isNaN(threshold) || threshold < 1 || threshold > 365) {
      setErrors({ inactivityThreshold: 'Threshold must be between 1 and 365 days' });
      setSaveStatus('error');
      return;
    }

    try {
      // Save system settings via API
      const response = await updateSystemSettings({
        inactivityThresholdDays: threshold
      });

      console.log('System settings saved:', response.data);
      setSystemSettings(response.data);
      setSaveStatus('success');

      // Reset to idle after showing success message
      setTimeout(() => {
        setSaveStatus('idle');
      }, 3000);
    } catch (error) {
      console.error('Error saving system settings:', error);
      setErrors({ system: 'Failed to save system settings' });
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const handleSaveSecurity = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Security settings save triggered');
    
    // Clear any previous errors
    setErrors({});
    
    // Check if user is trying to change password or just toggle 2FA
    const isPasswordChange = securitySettings.newPassword || securitySettings.confirmPassword || securitySettings.currentPassword;
    
    if (isPasswordChange) {
      if (!validateSecuritySettings()) {
        console.log('Security validation failed');
        return;
      }
    }
    
    setSaveStatus('saving');
    try {
      // Handle password change using existing backend API
      if (isPasswordChange) {
        console.log('Calling password change API...');
        
        try {
          const response = await apiClient.put('/auth/change-password', {
            currentPassword: securitySettings.currentPassword,
            newPassword: securitySettings.newPassword
          });
          
          console.log('Password changed successfully:', response.data);
          
          // Clear password fields after successful save
          setSecuritySettings(prev => ({
            ...prev,
            currentPassword: '',
            newPassword: '',
            confirmPassword: ''
          }));
          
        } catch (apiError: any) {
          console.error('Password change API error:', apiError);
          
          // Handle specific API errors
          if (apiError.response?.status === 400) {
            const errorMessage = apiError.response.data.error;
            if (errorMessage.includes('Current password is incorrect')) {
              setErrors({ currentPassword: 'Current password is incorrect' });
            } else if (errorMessage.includes('password must be')) {
              setErrors({ newPassword: errorMessage });
            } else {
              setErrors({ general: errorMessage });
            }
          } else {
            setErrors({ general: 'Failed to change password. Please try again.' });
          }
          
          setSaveStatus('error');
          setTimeout(() => setSaveStatus('idle'), 3000);
          return;
        }
      }
      
      // Save password change timestamp to localStorage if password was changed
      if (isPasswordChange) {
        console.log('Saving password change timestamp...');
        saveToLocalStorage('security', {
          lastPasswordChange: new Date().toISOString()
        });
      }
      
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
      
    } catch (error) {
      console.error('Error saving security settings:', error);
      setErrors({ general: 'An unexpected error occurred. Please try again.' });
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Profile settings save triggered');
    
    // Clear any previous errors
    setErrors({});
    
    // Basic validation
    if (!profileSettings.username.trim()) {
      setErrors({ username: 'Username is required' });
      return;
    }
    
    if (profileSettings.username.length < 3 || profileSettings.username.length > 50) {
      setErrors({ username: 'Username must be between 3 and 50 characters' });
      return;
    }
    
    // Validate email if it's editable (currently it's read-only in the UI)
    if (profileSettings.email && !validateEmail(profileSettings.email)) {
      setErrors({ email: 'Please enter a valid email address' });
      return;
    }
    
    setSaveStatus('saving');
    
    try {
      // Update username via backend API
      console.log('Updating username via API...');
      const response = await apiClient.put('/auth/profile', {
        username: profileSettings.username
      });
      
      console.log('Profile updated successfully:', response.data);
      
      // Update profile with backend response
      const updatedUser = response.data.user;
      setProfileSettings(prev => ({
        ...prev,
        username: updatedUser.username,
        email: updatedUser.email,
        emailVerified: updatedUser.emailVerified,
        lastLoginAt: updatedUser.lastLoginAt,
        createdAt: updatedUser.createdAt
      }));
      
      // Save additional profile fields to localStorage (not in backend)
      const localStorageData = {
        fullName: profileSettings.fullName,
        jobTitle: profileSettings.jobTitle,
        bio: profileSettings.bio
      };
      saveToLocalStorage('profile', localStorageData);
      
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
      
    } catch (apiError: any) {
      console.error('Profile update API error:', apiError);
      
      // Handle specific API errors
      if (apiError.response?.status === 400) {
        const errorMessage = apiError.response.data.error;
        if (errorMessage.includes('Username is already taken')) {
          setErrors({ username: 'This username is already taken' });
        } else if (errorMessage.includes('Username must be')) {
          setErrors({ username: errorMessage });
        } else {
          setErrors({ general: errorMessage });
        }
      } else if (apiError.response?.status === 404) {
        setErrors({ general: 'User not found. Please try logging in again.' });
      } else {
        setErrors({ general: 'Failed to update profile. Please try again.' });
      }
      
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };


  // Render save button with status
  const renderSaveButton = (text: string = 'Save Changes') => (
    <button 
      type="submit" 
      className={`admin-form-btn-primary ${saveStatus === 'saving' ? 'loading' : ''}`}
      disabled={saveStatus === 'saving'}
    >
      {saveStatus === 'saving' && <div className="spinner" />}
      {saveStatus === 'success' && <Check size={16} />}
      {saveStatus === 'error' && <AlertCircle size={16} />}
      {saveStatus === 'idle' && <Save size={16} />}
      <span>
        {saveStatus === 'saving' ? 'Saving...' :
         saveStatus === 'success' ? 'Saved!' :
         saveStatus === 'error' ? 'Error' : text}
      </span>
    </button>
  );

  return (
    <AdminLayout currentPath="/admin/settings" breadcrumbs={breadcrumbs}>
      <main className="admin-main">
          <div className="admin-settings">
            <div className="admin-settings-sidebar">
              <ul className="admin-settings-nav">
                <li>
                  <button
                    className={activeTab === 'profile' ? 'active' : ''}
                    onClick={() => setActiveTab('profile')}
                  >
                    <User size={18} />
                    <span>Profile</span>
                  </button>
                </li>
                <li>
                  <button
                    className={activeTab === 'security' ? 'active' : ''}
                    onClick={() => setActiveTab('security')}
                  >
                    <Lock size={18} />
                    <span>Security</span>
                  </button>
                </li>
                <li>
                  <button
                    className={activeTab === 'system' ? 'active' : ''}
                    onClick={() => setActiveTab('system')}
                  >
                    <Server size={18} />
                    <span>System</span>
                  </button>
                </li>
              </ul>
            </div>
            
            <div className="admin-settings-content">
              
              {activeTab === 'security' && (
                <div className="admin-settings-section">
                  <h2 className="admin-settings-title">Security Settings</h2>
                  <p className="admin-settings-description">
                    Manage your password and security preferences.
                  </p>
                  
                  <form onSubmit={handleSaveSecurity} className="admin-form">
                    {errors.general && (
                      <div className="admin-form-error admin-form-error-general">
                        <AlertCircle size={16} />
                        <span>{errors.general}</span>
                      </div>
                    )}
                    
                    <div className="admin-form-group">
                      <label className="admin-form-label">Current Password</label>
                      <div className="admin-password-input">
                        <input 
                          type={showPasswords.current ? "text" : "password"}
                          className={`admin-form-input ${errors.currentPassword ? 'error' : ''}`}
                          value={securitySettings.currentPassword}
                          onChange={(e) => setSecuritySettings(prev => ({ ...prev, currentPassword: e.target.value }))}
                          placeholder="Enter current password"
                        />
                        <button
                          type="button"
                          className="admin-password-toggle"
                          onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                        >
                          {showPasswords.current ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      {errors.currentPassword && <span className="admin-form-error">{errors.currentPassword}</span>}
                    </div>
                    
                    <div className="admin-form-group">
                      <label className="admin-form-label">New Password</label>
                      <div className="admin-password-input">
                        <input 
                          type={showPasswords.new ? "text" : "password"}
                          className={`admin-form-input ${errors.newPassword ? 'error' : ''}`}
                          value={securitySettings.newPassword}
                          onChange={(e) => setSecuritySettings(prev => ({ ...prev, newPassword: e.target.value }))}
                          placeholder="Enter new password"
                        />
                        <button
                          type="button"
                          className="admin-password-toggle"
                          onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                        >
                          {showPasswords.new ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      {securitySettings.newPassword && (
                        <div className="admin-password-strength">
                          <div className="admin-password-strength-bar">
                            <div 
                              className="admin-password-strength-fill"
                              style={{ 
                                width: `${(getPasswordStrength(securitySettings.newPassword).strength / 6) * 100}%`,
                                backgroundColor: getPasswordStrength(securitySettings.newPassword).color
                              }}
                            ></div>
                          </div>
                          <span 
                            className="admin-password-strength-label"
                            style={{ color: getPasswordStrength(securitySettings.newPassword).color }}
                          >
                            {getPasswordStrength(securitySettings.newPassword).label}
                          </span>
                        </div>
                      )}
                      {errors.newPassword && <span className="admin-form-error">{errors.newPassword}</span>}
                      <div className="admin-password-requirements">
                        <p className="admin-form-help">Password must contain:</p>
                        <ul className="admin-password-checklist">
                          <li className={securitySettings.newPassword.length >= 8 ? 'valid' : ''}>
                            At least 8 characters
                          </li>
                          <li className={/[A-Z]/.test(securitySettings.newPassword) ? 'valid' : ''}>
                            One uppercase letter
                          </li>
                          <li className={/[a-z]/.test(securitySettings.newPassword) ? 'valid' : ''}>
                            One lowercase letter
                          </li>
                          <li className={/\d/.test(securitySettings.newPassword) ? 'valid' : ''}>
                            One number
                          </li>
                          <li className={/[!@#$%^&*(),.?":{}|<>]/.test(securitySettings.newPassword) ? 'valid' : ''}>
                            One special character
                          </li>
                        </ul>
                      </div>
                    </div>
                    
                    <div className="admin-form-group">
                      <label className="admin-form-label">Confirm New Password</label>
                      <div className="admin-password-input">
                        <input 
                          type={showPasswords.confirm ? "text" : "password"}
                          className={`admin-form-input ${errors.confirmPassword ? 'error' : ''}`}
                          value={securitySettings.confirmPassword}
                          onChange={(e) => setSecuritySettings(prev => ({ ...prev, confirmPassword: e.target.value }))}
                          placeholder="Confirm new password"
                        />
                        <button
                          type="button"
                          className="admin-password-toggle"
                          onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                        >
                          {showPasswords.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      {errors.confirmPassword && <span className="admin-form-error">{errors.confirmPassword}</span>}
                    </div>
                    

                    <div className="admin-form-actions">
                      {renderSaveButton('Update Password')}
                    </div>
                  </form>
                </div>
              )}
              
              {activeTab === 'profile' && (
                <div className="admin-settings-section">
                  <h2 className="admin-settings-title">Profile Settings</h2>
                  <p className="admin-settings-description">
                    Update your profile information and preferences.
                  </p>
                  
                  <form onSubmit={handleSaveProfile} className="admin-form">
                    {errors.general && (
                      <div className="admin-form-error admin-form-error-general">
                        <AlertCircle size={16} />
                        <span>{errors.general}</span>
                      </div>
                    )}
                    
                    <div className="admin-form-group">
                      <label className="admin-form-label">Profile Avatar</label>
                      <div className="admin-profile-avatar">
                        <Avatar
                          fullName={profileSettings.fullName}
                          username={profileSettings.username}
                          email={profileSettings.email}
                          size={64}
                          className="admin-profile-avatar-display"
                        />
                        <div className="admin-profile-avatar-info">
                          <h4>Your Avatar</h4>
                          <p>Generated from your name or username</p>
                        </div>
                      </div>
                      <span className="admin-form-help">Avatar automatically updates when you change your name and appears throughout the admin interface</span>
                    </div>
                    
                    <div className="admin-form-group">
                      <label className="admin-form-label">Username</label>
                      <input 
                        type="text" 
                        className={`admin-form-input ${errors.username ? 'error' : ''}`}
                        value={profileSettings.username}
                        onChange={(e) => setProfileSettings(prev => ({ ...prev, username: e.target.value }))}
                        placeholder="Enter your username"
                      />
                      {errors.username && <span className="admin-form-error">{errors.username}</span>}
                      <span className="admin-form-help">This will update your login username</span>
                    </div>
                    
                    <div className="admin-form-group">
                      <label className="admin-form-label">Email Address</label>
                      <input 
                        type="email" 
                        className="admin-form-input"
                        value={profileSettings.email}
                        readOnly
                        disabled
                      />
                      <span className="admin-form-help">
                        Email cannot be changed here. {profileSettings.emailVerified ? '✓ Verified' : '⚠ Not verified'}
                      </span>
                    </div>
                    
                    <div className="admin-form-group">
                      <label className="admin-form-label">Full Name</label>
                      <input 
                        type="text" 
                        className="admin-form-input" 
                        value={profileSettings.fullName}
                        onChange={(e) => setProfileSettings(prev => ({ ...prev, fullName: e.target.value }))}
                        placeholder="Enter your full name"
                      />
                      <span className="admin-form-help">Display name for your profile</span>
                    </div>
                    
                    <div className="admin-form-group">
                      <label className="admin-form-label">Job Title</label>
                      <input 
                        type="text" 
                        className="admin-form-input" 
                        value={profileSettings.jobTitle}
                        onChange={(e) => setProfileSettings(prev => ({ ...prev, jobTitle: e.target.value }))}
                        placeholder="Enter your job title"
                      />
                    </div>
                    
                    <div className="admin-form-group">
                      <label className="admin-form-label">Bio</label>
                      <textarea 
                        className="admin-form-textarea" 
                        value={profileSettings.bio}
                        onChange={(e) => setProfileSettings(prev => ({ ...prev, bio: e.target.value }))}
                        placeholder="Tell us about yourself..."
                        rows={4}
                      ></textarea>
                    </div>

                    <div className="admin-form-group">
                      <label className="admin-form-label">Preferred Language</label>
                      <AdminLanguagePreferenceSelector />
                    </div>
                    
                    {(profileSettings.createdAt || profileSettings.lastLoginAt) && (
                      <div className="admin-form-group">
                        <label className="admin-form-label">Account Information</label>
                        <div className="admin-account-info">
                          {profileSettings.createdAt && (
                            <p><strong>Member since:</strong> {new Date(profileSettings.createdAt).toLocaleDateString()}</p>
                          )}
                          {profileSettings.lastLoginAt && (
                            <p><strong>Last login:</strong> {new Date(profileSettings.lastLoginAt).toLocaleString()}</p>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <div className="admin-form-actions">
                      {renderSaveButton('Save Profile')}
                    </div>
                  </form>
                </div>
              )}
              
              {activeTab === 'system' && (
                <div className="admin-settings-section">
                  <h2 className="admin-settings-title">System Settings</h2>
                  <p className="admin-settings-description">
                    Configure system-wide settings for all users.
                  </p>
                  
                  <form onSubmit={handleSaveSystem} className="admin-form">
                    {errors.system && (
                      <div className="admin-form-error admin-form-error-general">
                        <AlertCircle size={16} />
                        <span>{errors.system}</span>
                      </div>
                    )}
                    
                    <div className="admin-form-group">
                      <label className="admin-form-label">User Inactivity Threshold</label>
                      <div className="admin-form-row" style={{ display: 'flex', alignItems: 'center' }}>
                        <input 
                          type="number" 
                          className={`admin-form-input ${errors.inactivityThreshold ? 'error' : ''}`}
                          min="1"
                          max="365"
                          value={systemSettings.inactivityThresholdDays}
                          onChange={(e) => handleInactivityThresholdChange(parseInt(e.target.value) || 1)}
                          style={{ width: '80px', marginRight: '10px' }}
                        />
                        <span style={{ marginRight: '15px' }}>days</span>
                      </div>
                      {errors.inactivityThreshold && (
                        <span className="admin-form-error">{errors.inactivityThreshold}</span>
                      )}
                      <div className="admin-form-slider-container">
                        <input 
                          type="range" 
                          min="1" 
                          max="365" 
                          value={systemSettings.inactivityThresholdDays} 
                          onChange={(e) => handleInactivityThresholdChange(parseInt(e.target.value))}
                          className="admin-form-input"
                          style={{ width: '100%' }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px' }}>
                          <span className="admin-form-help">1 day</span>
                          <span className="admin-form-help">365 days</span>
                        </div>
                      </div>
                      <span className="admin-form-help">
                        Users who haven't logged in for this number of days will be automatically marked as inactive.
                        <br />A daily job runs at 02:00 UTC to check for inactive users.
                      </span>
                    </div>
                    
                    <div className="admin-form-actions">
                      {renderSaveButton('Save System Settings')}
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        </main>
    </AdminLayout>
  );
};

const AdminLanguagePreferenceSelector: React.FC = () => {
  const [selectedLanguage, setSelectedLanguage] = useState<string>(() => getAdminPreferredLanguage());

  const handleLanguageChange = (languageCode: string) => {
    setSelectedLanguage(languageCode);
    setAdminPreferredLanguage(languageCode);
    applyLanguagePreference(languageCode);
  };

  return (
    <select
      value={selectedLanguage}
      onChange={e => handleLanguageChange(e.target.value)}
      style={{ padding: "6px", borderRadius: "4px", fontSize: "14px" }}
    >
      {languages.map(lang => (
        <option key={lang.code} value={lang.code}>
          {lang.flag} {lang.name}
        </option>
      ))}
    </select>
  );
};

export default SettingsPage;
