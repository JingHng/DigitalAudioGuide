import React, { useState, useEffect } from 'react';
import { Languages, Check, Loader } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../utils/apiClient';
import '../css/AudioGuidePreferencePage.css';

interface Language {
  languageId: number;
  title: string;
  code: string;
  isDefault: boolean;
}

const AudioGuidePreferencePage: React.FC = () => {
  const { user } = useAuth();
  const [languages, setLanguages] = useState<Language[]>([]);
  const [selectedLanguageId, setSelectedLanguageId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    fetchLanguages();
    fetchUserPreference();
  }, []);

  const fetchLanguages = async () => {
    try {
      const response = await apiClient.get('/language');
      const languagesData = response.data.map((lang: any) => ({
        ...lang,
        languageId: parseInt(lang.languageId.toString())
      }));
      setLanguages(languagesData);
    } catch (error) {
      console.error('Error fetching languages:', error);
      setMessage({ type: 'error', text: 'Failed to load available languages' });
    }
  };

  const fetchUserPreference = async () => {
    try {
      const response = await apiClient.get('/auth/profile');
      if (response.data.user.languageId) {
        setSelectedLanguageId(parseInt(response.data.user.languageId));
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching user preference:', error);
      setLoading(false);
    }
  };

  const handleLanguageSelect = async (languageId: number) => {
    setSaving(true);
    setMessage(null);

    try {
      const response = await apiClient.put('/auth/language-preference', { languageId });
      setSelectedLanguageId(languageId);
      setMessage({ type: 'success', text: 'Language preference saved successfully!' });
      console.log('Language preference updated:', response.data);
    } catch (error: any) {
      console.error('Error saving language preference:', error);
      console.error('Error response:', error.response?.data);
      const errorMessage = error.response?.data?.error || 'Failed to save language preference. Please try again.';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="audio-guide-preference-page">
        <div className="loading-container">
          <Loader className="spinner" size={48} />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="audio-guide-preference-page">
      <div className="preference-container">
        <div className="preference-header">
          <Languages size={24} className="header-icon" />
          <h1>Audio Guide Language Preference</h1>
          <p className="subtitle">
            Select your preferred language for audio guides throughout the museum exhibits.
          </p>
        </div>

        <div className="disclaimer-top">
          <p>
            <strong>Note:</strong> Your selected language will only be used if an audio guide is available in that language for the exhibit. If not available, it will default to English.
          </p>
        </div>

        {message && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}

        <div className="user-info-card">
          <div className="user-detail">
            <span className="label">Logged in as:</span>
            <span className="value">{user?.username}</span>
          </div>
        </div>

        <div className="languages-grid">
          {languages.map((language) => (
            <button
              key={language.languageId}
              className={`language-card ${selectedLanguageId === language.languageId ? 'selected' : ''}`}
              onClick={() => handleLanguageSelect(language.languageId)}
              disabled={saving}
            >
              <div className="language-content">
                <div className="language-title">{language.title}</div>
                <div className="language-code">{language.code}</div>
                {language.isDefault && (
                  <div className="default-badge">Default</div>
                )}
              </div>
              {selectedLanguageId === language.languageId && (
                <div className="selected-indicator">
                  <Check size={24} />
                </div>
              )}
            </button>
          ))}
        </div>

        {languages.length === 0 && (
          <div className="no-languages">
            <p>No languages available at the moment.</p>
          </div>
        )}

        <div className="preference-footer">
          <p className="footer-note">
            Your audio guide language preference will be applied to all exhibits you visit.
            This setting does not affect the website interface language.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AudioGuidePreferencePage;
