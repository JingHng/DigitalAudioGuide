import React, { useState, useEffect } from 'react'; 
import apiClient from '../../utils/apiClient';
import { Loader2 } from 'lucide-react';
import '../css/ExhibitForm.css'; 

// --- Type Definitions ---
// Describes the shape of an exhibition object passed for editing
interface Exhibition {
  exhibitionId: string;
  title: string;
  description: string;
}

// Describes the props the component receives
interface ExhibitionFormProps {
  exhibitionToEdit: Exhibition | null;
  onSave: () => void; // Callback to refresh the list after saving
  onClose: () => void; // Callback to close the modal
}

// --- Component ---
const ExhibitionForm: React.FC<ExhibitionFormProps> = ({ exhibitionToEdit, onSave, onClose }) => {
  // --- State Declarations ---
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // --- Effect ---
  // This effect runs when the component loads or when the `exhibitionToEdit` prop changes.
  // It populates the form for editing or resets it for creation.
  useEffect(() => {
    if (exhibitionToEdit) {
      // --- EDIT MODE ---
      setTitle(exhibitionToEdit.title);
      setDescription(exhibitionToEdit.description || '');
      setImageFile(null); // Reset file input when opening the modal for editing
    } else {
      // --- CREATE MODE ---
      setTitle('');
      setDescription('');
      setImageFile(null);
    }
  }, [exhibitionToEdit]);

  // --- Handlers ---

  // Updates state when a user selects a file
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    } else {
      setImageFile(null);
    }
  };

  // Handles the form submission for both creating and editing
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);

      if (imageFile) {
        formData.append('image', imageFile); 
      }

      if (exhibitionToEdit) {
        // --- UPDATE ---
        // Send a PUT request to the update endpoint
        await apiClient.put(`/exhibitions/${exhibitionToEdit.exhibitionId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        // --- CREATE ---
        // Send a POST request to the create endpoint
        await apiClient.post('/exhibitions', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      
      onSave();  // Trigger the refresh callback on the parent component
      onClose(); // Trigger the close modal callback
    } catch (err: any) {
      setError(err.response?.data?.error || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // --- Render ---
  return (
    <form onSubmit={handleSubmit} className="exhibit-form">
      {error && <p className="form-error">{error}</p>}
      
      <div className="form-group">
        <label htmlFor="exhibitionTitle">Collection Title</label>
        <input
          id="exhibitionTitle"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="e.g., Founding Stories of Singapore"
        />
      </div>

      <div className="form-group">
        <label htmlFor="exhibitionDescription">Collection Description</label>
        <textarea
          id="exhibitionDescription"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="A brief summary of what this collection is about."
        />
      </div>

      <div className="form-group">
        <label htmlFor="exhibitionImage">Cover Image</label>
        <input
          id="exhibitionImage"
          type="file"
          accept="image/*"
          onChange={handleFileChange}
        />
        {exhibitionToEdit && <p className="form-hint">Uploading a new image will replace the current cover image.</p>}
        {imageFile && <p className="file-preview">Selected: {imageFile.name}</p>}
      </div>

      <div className="form-actions">
        <button type="button" onClick={onClose} className="button-secondary">Cancel</button>
        <button type="submit" className="button-primary" disabled={loading}>
          {loading ? <><Loader2 className="animate-spin" /> Saving...</> : (exhibitionToEdit ? 'Save Changes' : 'Create Collection')}
        </button>
      </div>
    </form>
  );
};

export default ExhibitionForm;