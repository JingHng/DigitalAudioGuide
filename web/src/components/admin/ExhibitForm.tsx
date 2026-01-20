import React, { useState, useEffect } from 'react';
import apiClient from '../../utils/apiClient';
import { Loader2, Info, Languages, Mic, ImageIcon, Plus, CheckCircle2, Sparkles } from 'lucide-react';
import '../css/ExhibitForm.css';

const BACKEND_URL = import.meta.env.VITE_API_TARGET || '';
const DEFAULT_IMAGE_URL = `${BACKEND_URL}/public/images/Exhibit.jpg`;

const getImageUrl = (fileUrl: string | null): string => {
  if (!fileUrl) return DEFAULT_IMAGE_URL;
  const cleanedPath = fileUrl.replace(/\\/g, '/');
  const imagePrefix = '/images/';
  const pathIndex = cleanedPath.indexOf(imagePrefix);
  if (pathIndex !== -1) {
    const filename = cleanedPath.substring(pathIndex + imagePrefix.length);
    return `${BACKEND_URL}/public/images/${filename}`;
  }
  return DEFAULT_IMAGE_URL;
};

interface ExhibitImage { imageId: string; fileUrl: string; isPrimary: boolean; }
interface ExhibitToEdit { exhibitId: string; title: string; description: string; additionalDescription: string; exhibitionId: string; images: ExhibitImage[]; }
interface Language { languageId: string; title: string; code: string; status?: { statusName: string; } | null; }

const ExhibitForm: React.FC<{ exhibitToEdit: ExhibitToEdit | null; onSave: () => void; onClose: () => void; preselectedExhibitionId?: string | null; }> = ({ exhibitToEdit, onSave, onClose, preselectedExhibitionId }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [additionalDescription, setAdditionalDescription] = useState('');
  const [exhibitionId, setExhibitionId] = useState('');
  const [images, setImages] = useState<ExhibitImage[]>([]);
  const [primaryImageFile, setPrimaryImageFile] = useState<File | null>(null);
  const [ttsText, setTtsText] = useState('');
  const [loading, setLoading] = useState(false);
  const [availableExhibitions, setAvailableExhibitions] = useState<any[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [selectedLanguageId, setSelectedLanguageId] = useState('');
  const [isTranslatorVisible, setIsTranslatorVisible] = useState(false);
  const [sourceText, setSourceText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    apiClient.get('/exhibitions').then(res => setAvailableExhibitions(res.data));
    apiClient.get<Language[]>('/language').then(res => {
      const active = res.data.filter(l => l.status?.statusName === 'Active');
      setLanguages(active);
      if (active.length) setSelectedLanguageId(active[0].languageId);
    });
  }, []);

  useEffect(() => {
    if (exhibitToEdit) {
      setTitle(exhibitToEdit.title);
      setDescription(exhibitToEdit.description || '');
      setAdditionalDescription(exhibitToEdit.additionalDescription || '');
      setExhibitionId(exhibitToEdit.exhibitionId || '');
      setImages(exhibitToEdit.images || []);
    } else if (preselectedExhibitionId) {
      setExhibitionId(preselectedExhibitionId);
    }
  }, [exhibitToEdit, preselectedExhibitionId]);

  const handleTranslate = async () => {
    const lang = languages.find(l => l.languageId === selectedLanguageId);
    if (!sourceText || !lang) return;
    setIsTranslating(true);
    try {
      const res = await apiClient.post('/translate', { text: sourceText, targetLanguage: lang.code });
      setTtsText(res.data.translatedText);
      setIsTranslatorVisible(false);
    } catch (err) { console.error(err); }
    finally { setIsTranslating(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let currentId = exhibitToEdit?.exhibitId;
      if (exhibitToEdit) {
        await apiClient.put(`/exhibits/${currentId}`, { title, description, additionalDescription, exhibitionId });
        if (primaryImageFile) {
          const fd = new FormData(); fd.append('images', primaryImageFile); fd.append('isPrimary', 'true');
          await apiClient.post(`/exhibits/${currentId}/image`, fd);
        }
      } else {
        const fd = new FormData();
        fd.append('title', title); fd.append('description', description);
        fd.append('additionalDescription', additionalDescription); fd.append('exhibitionId', exhibitionId);
        if (primaryImageFile) fd.append('primaryImage', primaryImageFile);
        const res = await apiClient.post('/exhibits', fd);
        currentId = res.data.exhibitId;
      }
      const langName = languages.find(l => l.languageId === selectedLanguageId)?.title;
      if (ttsText.trim() && currentId && langName) {
        await apiClient.post(`/exhibits/${currentId}/tts`, { text: ttsText, language: langName });
      }
      onSave(); onClose();
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  return (
    <div className="exhibit-form-container-unique">
      <form onSubmit={handleSubmit} className="exhibit-internal-form">
        
        {/* TOP SECTION: NOW SINGLE COLUMN STACK */}
        <div className="form-main-stack">
          
          {/* BASIC INFO */}
          <div className="form-section-card">
            <div className="exhibit-section-header">
              <Info className="exhibit-icon-primary" size={20} />
              <span className="exhibit-header-text">Basic Information</span>
            </div>
            
            <div className="exhibit-input-field">
              <label>Parent Tour</label>
              <select value={exhibitionId} onChange={(e) => setExhibitionId(e.target.value)} required>
                <option value="">Select a Tour</option>
                {availableExhibitions.map(ex => <option key={ex.exhibitionId} value={ex.exhibitionId}>{ex.title}</option>)}
              </select>
            </div>

            <div className="exhibit-input-field">
              <label>Exhibit Title</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Exhibit Name" required />
            </div>

            <div className="exhibit-input-field">
              <label>Brief Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="A short overview for visitors..." />
            </div>

            <div className="exhibit-input-field">
              <label>Additional Description</label>
              <textarea value={additionalDescription} onChange={(e) => setAdditionalDescription(e.target.value)} rows={5} placeholder="Full history or details..." />
            </div>
          </div>

          {/* MEDIA SECTION */}
          <div className="form-section-card">
            <div className="exhibit-section-header">
              <ImageIcon className="exhibit-icon-primary" size={20} />
              <span className="exhibit-header-text">Exhibit Media</span>
            </div>

            <div className="exhibit-media-box">
              <div className="image-preview-area">
                {(images.filter(img => img.isPrimary).length > 0 || primaryImageFile) ? (
                  <img 
                    src={primaryImageFile ? URL.createObjectURL(primaryImageFile) : getImageUrl(images.find(img => img.isPrimary)?.fileUrl || null)} 
                    alt="Preview" 
                    className="main-preview-img" 
                  />
                ) : (
                  <div className="image-placeholder">
                    <ImageIcon size={48} />
                    <span>No image selected</span>
                  </div>
                )}
              </div>

              <div className="file-upload-controls">
                <input 
                  type="file" 
                  id="exhibit-upload"
                  accept="image/*" 
                  onChange={(e) => e.target.files && setPrimaryImageFile(e.target.files[0])} 
                  className="hidden-file-input"
                />
                <label htmlFor="exhibit-upload" className="custom-file-label">
                  <Plus size={18} /> {primaryImageFile ? primaryImageFile.name : 'Choose File'}
                </label>
                <span className="file-status-text">
                  {primaryImageFile ? 'Ready to upload' : 'No file chosen'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* AUDIO STUDIO SECTION */}
        <div className="exhibit-ai-card">
          <div className="ai-card-header">
            <div className="ai-badge"><Mic size={14} /><span> Text-To-Speech</span></div>
            <div className="lang-picker-wrapper">
              <Languages size={14} />
              <select className="exhibit-lang-select-refined" value={selectedLanguageId} onChange={(e) => setSelectedLanguageId(e.target.value)}>
                {languages.map(l => <option key={l.languageId} value={l.languageId}>{l.title}</option>)}
              </select>
            </div>
          </div>

          <div className="ai-card-content">
            {isTranslatorVisible ? (
              <div className="ai-input-zone animate-fade-in">
                <div className="zone-label">English Script to Translate</div>
                <textarea 
                   className="ai-source-textarea"
                   value={sourceText} 
                   onChange={(e) => setSourceText(e.target.value)} 
                   placeholder="Paste the English description here..." 
                />
                <div className="ai-actions">
                  <button type="button" className="btn-ghost" onClick={() => setIsTranslatorVisible(false)}>Cancel</button>
                  <button type="button" onClick={handleTranslate} disabled={isTranslating || !sourceText} className="btn-ai-generate">
                    {isTranslating ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
                    {isTranslating ? 'Translating...' : 'Translate'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="ai-prompt-zone">
                <p>Translate your English Text into a language of your choice</p>
                <button type="button" className="btn-ai-magic" onClick={() => setIsTranslatorVisible(true)}>
                  <Languages size={18} /> Open Translator
                </button>
              </div>
            )}

            <div className="ai-output-zone">
              <div className="zone-label">Final Audio Guide</div>
              <textarea 
                className="exhibit-tts-final-refined" 
                value={ttsText} 
                onChange={(e) => setTtsText(e.target.value)} 
                placeholder="The translated text will appear here..." 
                rows={4} 
              />
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="exhibit-form-footer">
          <button type="button" onClick={onClose} className="exhibit-btn-cancel">Cancel</button>
          <button type="submit" className="exhibit-btn-save" disabled={loading}>
            {loading ? <Loader2 className="animate-spin" size={20} /> : <><CheckCircle2 size={20} /> Save Exhibit</>}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ExhibitForm;