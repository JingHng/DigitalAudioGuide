import React, { useState, useEffect } from 'react';
import apiClient from '../../utils/apiClient';
import { Trash2, Loader2, Info, Languages } from 'lucide-react';
import '../css/ExhibitForm.css';

const BACKEND_URL = 'http://localhost:3000';

// --- Type Definitions ---
interface ExhibitImage {
  imageId: string;
  fileUrl: string;
  title: string | null;
}
interface ExhibitToEdit {
  exhibitId: string;
  title: string;
  description: string;
  exhibitionId: string;
  images: ExhibitImage[];
}
interface ExhibitionSelection {
  exhibitionId: string;
  title: string;
}
interface ExhibitFormProps {
  exhibitToEdit: ExhibitToEdit | null;
  preselectedExhibitionId?: string | null;
  onSave: () => void;
  onClose: () => void;
}

// MODIFIED: Updated the Language interface to include the 'status' property
// This helps TypeScript understand the data shape from your API.
interface Language {
  languageId: string;
  title: string;
  code: string;
  status?: { // Status is optional in case it's ever null
    statusId: number;
    statusName: string;
  } | null;
}

const ExhibitForm: React.FC<ExhibitFormProps> = ({ exhibitToEdit, preselectedExhibitionId, onSave, onClose }) => {
  // --- State Declarations ---
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [exhibitionId, setExhibitionId] = useState('');
  const [images, setImages] = useState<ExhibitImage[]>([]);
  const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
  const [ttsText, setTtsText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [availableExhibitions, setAvailableExhibitions] = useState<ExhibitionSelection[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [selectedLanguageId, setSelectedLanguageId] = useState('');
  const [isTranslatorVisible, setIsTranslatorVisible] = useState(false);
  const [sourceText, setSourceText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationError, setTranslationError] = useState('');

  // --- Effects ---

  // Fetch available exhibitions for the dropdown
  useEffect(() => {
    apiClient.get('/exhibitions')
      .then(response => setAvailableExhibitions(response.data))
      .catch(err => { // FIXED: Used the 'err' parameter to log the error
        console.error("Failed to fetch exhibitions:", err);
        setError("Could not load collections. Please refresh.");
      });
  }, []);
  
  // Fetch available languages for the dropdown
  useEffect(() => {
    // FIXED: Used a TypeScript generic <Language[]> to tell apiClient what data to expect.
    // This solves the "implicitly has an 'any' type" errors.
    apiClient.get<Language[]>('/language')
      .then(response => {
        // Now TypeScript knows that `lang` is of type `Language`
        const activeLanguages = response.data.filter(lang => lang.status?.statusName === 'Active');
        setLanguages(activeLanguages);
        
        // TypeScript also knows `lang` is of type `Language` here
        const defaultLang = activeLanguages.find(lang => lang.title === 'English') || activeLanguages[0];
        if (defaultLang) {
          setSelectedLanguageId(defaultLang.languageId);
        }
      })
      .catch(error => console.error("Failed to fetch languages", error));
  }, []);

  // Populate form based on create/edit mode
  useEffect(() => {
    if (exhibitToEdit) {
      setTitle(exhibitToEdit.title);
      setDescription(exhibitToEdit.description || '');
      setExhibitionId(exhibitToEdit.exhibitionId || '');
      setImages(exhibitToEdit.images || []);
    } else {
      setTitle('');
      setDescription('');
      setImages([]);
      if (preselectedExhibitionId) {
        setExhibitionId(preselectedExhibitionId);
      } else if (availableExhibitions.length > 0) {
        setExhibitionId(availableExhibitions[0].exhibitionId);
      }
    }
    setNewImageFiles([]);
    setTtsText('');
    setIsTranslatorVisible(false);
    setSourceText('');
  }, [exhibitToEdit, availableExhibitions, preselectedExhibitionId]);

  // --- Handlers ---
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setNewImageFiles(Array.from(e.target.files));
  };
  const handleRemoveExistingImage = async (imageId: string) => {
    if (!window.confirm('Are you sure you want to delete this image permanently?')) return;
    try {
      await apiClient.delete(`/images/${imageId}`);
      setImages(prevImages => prevImages.filter((img) => img.imageId !== imageId));
    } catch (err) {
      setError('Failed to delete image.');
    }
  };

  const handleTranslate = async () => {
    if (!sourceText.trim()) {
      setTranslationError('Please enter some English text to translate.');
      return;
    }
    const selectedLanguage = languages.find(lang => lang.languageId === selectedLanguageId);
    if (!selectedLanguage) {
      setTranslationError('Please select a valid target language.');
      return;
    }
    setIsTranslating(true);
    setTranslationError('');
    try {
      const response = await apiClient.post('/translate', {
        text: sourceText,
        targetLanguage: selectedLanguage.code,
      });
      setTtsText(response.data.translatedText);
      setIsTranslatorVisible(false);
    } catch (err) {
      setTranslationError('Translation failed. Please try again.');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exhibitionId) {
      setError("Please select a collection for this exhibit.");
      return;
    }
    setLoading(true);
    setError('');
    try {
      let currentExhibitId = exhibitToEdit?.exhibitId;
      if (exhibitToEdit) {
        await apiClient.put(`/exhibits/${exhibitToEdit.exhibitId}`, { title, description, exhibitionId });
        if (newImageFiles.length > 0) {
          const imageFormData = new FormData();
          newImageFiles.forEach(file => imageFormData.append('images', file));
          await apiClient.post(`/exhibits/${exhibitToEdit.exhibitId}/image`, imageFormData);
        }
      } else {
        const formData = new FormData();
        formData.append('title', title);
        formData.append('description', description);
        formData.append('exhibitionId', exhibitionId);
        newImageFiles.forEach(file => formData.append('images', file));
        const response = await apiClient.post('/exhibits', formData);
        currentExhibitId = response.data.exhibitId;
      }

      const selectedLanguageName = languages.find(l => l.languageId === selectedLanguageId)?.title;
      if (ttsText.trim() && currentExhibitId && selectedLanguageName) {
        await apiClient.post(`/exhibits/${currentExhibitId}/tts`, {
          text: ttsText,
          language: selectedLanguageName,
        });
      }
      onSave();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // --- Render ---
  const selectedLanguageTitle = languages.find(l => l.languageId === selectedLanguageId)?.title || '...';

  return (
    <form onSubmit={handleSubmit} className="exhibit-form">
      {error && <p className="form-error">{error}</p>}
      <div className="form-group"><label htmlFor="exhibitionId">Collection / Exhibition</label><select id="exhibitionId" value={exhibitionId} onChange={(e) => setExhibitionId(e.target.value)} required disabled={availableExhibitions.length === 0}><option value="" disabled>-- Select a Collection --</option>{availableExhibitions.map(ex => (<option key={ex.exhibitionId} value={ex.exhibitionId}>{ex.title}</option>))}</select>{availableExhibitions.length === 0 && <p className='form-hint'>No collections found. Please create one first.</p>}</div>
      <div className="form-group"><label htmlFor="title">Exhibit Title</label><input id="title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g., The Turning Point" /></div>
      <div className="form-group"><label htmlFor="description">Exhibit Description</label><textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="A short summary of this specific exhibit." /></div>
      <div className="form-section"><h3>Manage Images</h3>{images.length > 0 && (<div className="existing-images-grid">{images.map(img => (<div key={img.imageId} className="existing-image-item"><img src={`${BACKEND_URL}${img.fileUrl}`} alt={img.title || 'Exhibit Image'} /><button type="button" onClick={() => handleRemoveExistingImage(img.imageId)} className="delete-image-btn" title="Delete this image"><Trash2 size={16} /></button></div>))}</div>)}<div className="form-group"><label htmlFor="imageUpload">Upload New Images</label><input id="imageUpload" type="file" multiple accept="image/*" onChange={handleImageFileChange} />{newImageFiles.length > 0 && (<div className="file-preview"><p>{newImageFiles.length} file(s) selected for upload.</p></div>)}</div></div>

      <div className="form-section">
        <h3>Generate New Audio Guide</h3>
        <p className="form-hint"><Info size={14}/>Optional. This can be done later by editing the exhibit.</p>
        <div className="form-group"><label htmlFor="audio-language">Audio Language</label><select id="audio-language" value={selectedLanguageId} onChange={(e) => setSelectedLanguageId(e.target.value)}>{languages.map(lang => (<option key={lang.languageId} value={lang.languageId}>{lang.title}</option>))}</select></div>
        {!isTranslatorVisible && (<button type="button" className="button-translate" onClick={() => setIsTranslatorVisible(true)}><Languages size={16} /> Translate from English</button>)}
        {isTranslatorVisible && (<div className="mini-translator"><div className="form-group"><label htmlFor="source-text">English Text to Translate</label><textarea id="source-text" rows={4} value={sourceText} onChange={(e) => setSourceText(e.target.value)} placeholder="Enter the English script here..." /></div><div className="mini-translator-actions"><button type="button" className="button-primary" onClick={handleTranslate} disabled={isTranslating}>{isTranslating ? <Loader2 className="animate-spin" /> : 'Translate and Use Text'}</button><button type="button" className="button-link" onClick={() => setIsTranslatorVisible(false)}>Cancel</button></div>{translationError && <p className="form-error">{translationError}</p>}</div>)}
        <div className="form-group"><label htmlFor="ttsText">Script to Convert to Audio (in {selectedLanguageTitle})</label><textarea id="ttsText" value={ttsText} onChange={(e) => setTtsText(e.target.value)} rows={5} placeholder="The script for the audio guide will appear here..." /></div>
      </div>

      <div className="form-actions">
        <button type="button" onClick={onClose} className="button-secondary">Cancel</button>
        <button type="submit" className="button-primary" disabled={loading}>
          {loading ? <><Loader2 className="animate-spin" /> Saving...</> : (exhibitToEdit ? 'Save Changes' : 'Create Exhibit')}
        </button>
      </div>
    </form>
  );
};

export default ExhibitForm;