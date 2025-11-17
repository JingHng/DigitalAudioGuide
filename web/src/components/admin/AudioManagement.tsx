import { useState, useEffect } from 'react';
import AdminLayout from './AdminLayout';
import apiClient from '../../utils/apiClient';
import { 
  Music, Plus, Edit, Trash2, Search, Filter, 
  Play, Pause, Volume2, Languages, Calendar,
  FileText, Info
} from 'lucide-react';
import '../../css/AudioManagement.css';

// Backend URL for audio files - same as visitor page
const BACKEND_URL = 'http://localhost:3000';

interface Language {
  languageId: string;
  title: string;
  code: string;
}

interface Exhibit {
  exhibitId: string;
  title: string;
  description: string;
}

interface AudioFile {
  audioId: number;
  exhibitId: string | null;
  languageId: string | null;
  fileUrl: string | null;
  title: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  exhibit: Exhibit | null;
  language: Language | null;
  playbackCount: number;
}

interface AudioFormData {
  exhibitId: string;
  languageId: string;
  fileUrl: string;
  title: string;
  description: string;
}

interface AudioUploadData {
  exhibitId: string;
  description: string;
  audioFile: File | null;
  ttsText: string;
  ttsLanguage: string;
}

const AudioManagement = () => {
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
  const [exhibits, setExhibits] = useState<Exhibit[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAudio, setEditingAudio] = useState<AudioFile | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedExhibit, setSelectedExhibit] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');
  const [hasPlaybackFilter, setHasPlaybackFilter] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [playingAudio, setPlayingAudio] = useState<number | null>(null);
  const [loadingAudio, setLoadingAudio] = useState<number | null>(null);
  const [audioElements, setAudioElements] = useState<{[key: number]: HTMLAudioElement}>({});
  const [showTranscript, setShowTranscript] = useState(false);
  const [selectedAudioForTranscript, setSelectedAudioForTranscript] = useState<AudioFile | null>(null);
  const [transcriptData, setTranscriptData] = useState<any>(null);
  const [loadingTranscript, setLoadingTranscript] = useState(false);
  
  const [formData, setFormData] = useState<AudioFormData>({
    exhibitId: '',
    languageId: '',
    fileUrl: '',
    title: '',
    description: ''
  });

  const [uploadData, setUploadData] = useState<AudioUploadData>({
    exhibitId: '',
    description: '',
    audioFile: null,
    ttsText: '',
    ttsLanguage: ''
  });

  // Fetch audio files with filters
  const fetchAudioFiles = async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: itemsPerPage.toString(),
        search: searchTerm,
        sortBy,
        sortOrder,
        dateFrom: dateFromFilter,
        dateTo: dateToFilter,
        hasPlayback: hasPlaybackFilter
      });
      
      if (selectedExhibit) params.append('exhibitId', selectedExhibit);
      if (selectedLanguage) params.append('languageId', selectedLanguage);
      
      const response = await apiClient.get(`/audio?${params}`);
      setAudioFiles(response.data.audio);
      setTotalPages(response.data.pagination.totalPages);
      setTotalItems(response.data.pagination.totalItems);
      setCurrentPage(page);
    } catch (error) {
      console.error('Error fetching audio files:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch exhibits and languages for dropdowns
  const fetchReferenceData = async () => {
    try {
      const [exhibitsRes, languagesRes] = await Promise.all([
        apiClient.get('/exhibits'),
        apiClient.get('/language')
      ]);
      
      setExhibits(exhibitsRes.data);
      setLanguages(languagesRes.data);
      
      // Set default TTS language to first available TTS-supported language
      const ttsLanguages = languagesRes.data.filter((language: Language) => 
        ['English', 'Spanish', 'French', 'German', 'Japanese', 'Chinese (Simplified)'].includes(language.title)
      );
      if (ttsLanguages.length > 0 && !uploadData.ttsLanguage) {
        setUploadData(prev => ({
          ...prev,
          ttsLanguage: ttsLanguages[0].title
        }));
      }
    } catch (error) {
      console.error('Error fetching reference data:', error);
    }
  };

  useEffect(() => {
    fetchReferenceData();
    fetchAudioFiles();
  }, [selectedExhibit, selectedLanguage, searchTerm, sortBy, sortOrder, dateFromFilter, dateToFilter, hasPlaybackFilter, itemsPerPage]);
  
  // Check for URL fragments for deep linking
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      
      // Handle audio file creation
      if (hash === '#add-audio') {
        // Open add audio form
        setShowAddForm(true);
        setEditingAudio(null);
        setFormData({
          exhibitId: '',
          languageId: '',
          fileUrl: '',
          title: '',
          description: ''
        });
        
        // Initialize TTS data
        const ttsLanguages = languages.filter((language: Language) => 
          ['English', 'Spanish', 'French', 'German', 'Japanese', 'Chinese (Simplified)'].includes(language.title)
        );
        
        setUploadData({
          exhibitId: '',
          description: '',
          audioFile: null,
          ttsText: '',
          ttsLanguage: ttsLanguages.length > 0 ? ttsLanguages[0].title : ''
        });
        
        // Clear the hash after opening form
        history.replaceState(null, document.title, window.location.pathname + window.location.search);
      }
    };

    // Check hash on initial load
    handleHashChange();

    // Add listener for hash changes
    window.addEventListener('hashchange', handleHashChange);
    
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [languages]);

  // Cleanup audio elements on unmount
  useEffect(() => {
    return () => {
      // Stop and cleanup all audio elements
      Object.values(audioElements).forEach(audio => {
        audio.pause();
        audio.src = '';
      });
    };
  }, [audioElements]);

  // Handle form submission for upload
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingAudio) {
        // For editing, use the regular API endpoint
        const submitData = {
          ...formData,
          fileUrl: formData.fileUrl || ''
        };
        await apiClient.put(`/audio/${editingAudio.audioId}`, submitData);
      } else {
        // For new audio, check if we have file upload or TTS
        if (!uploadData.audioFile && !uploadData.ttsText.trim()) {
          alert('Please either select an audio file to upload or provide text for TTS generation');
          return;
        }

        if (uploadData.audioFile && uploadData.ttsText.trim()) {
          alert('Please choose either file upload OR TTS generation, not both');
          return;
        }

        if (uploadData.audioFile) {
          // File upload
          const formDataUpload = new FormData();
          formDataUpload.append('audio', uploadData.audioFile);
          formDataUpload.append('exhibitId', uploadData.exhibitId);
          formDataUpload.append('title', uploadData.audioFile.name.split('.')[0]); // Use filename without extension as title
          formDataUpload.append('description', uploadData.description);

          await apiClient.post('/audio/upload', formDataUpload, {
            headers: {
              'Content-Type': 'multipart/form-data',
              Authorization: `Bearer ${localStorage.getItem('token')}`
            }
          });
        } else {
          // TTS generation - create audio entry first, then generate TTS
          const audioData = {
            exhibitId: uploadData.exhibitId,
            title: `TTS Audio - ${uploadData.ttsLanguage}`, // Auto-generate title for TTS
            description: uploadData.description,
            fileUrl: null
          };

          const response = await apiClient.post('/audio', audioData);
          const audioId = response.data.audio.audioId;

          // Generate TTS for the created audio
          await apiClient.post(`/audio/${audioId}/tts`, {
            text: uploadData.ttsText,
            language: uploadData.ttsLanguage
          });
        }
      }
      
      setShowAddForm(false);
      setEditingAudio(null);
      setFormData({
        exhibitId: '',
        languageId: '',
        fileUrl: '',
        title: '',
        description: ''
      });
      const ttsLanguages = languages.filter((language: Language) => 
        ['English', 'Spanish', 'French', 'German', 'Japanese', 'Chinese (Simplified)'].includes(language.title)
      );
      setUploadData({
        exhibitId: '',
        description: '',
        audioFile: null,
        ttsText: '',
        ttsLanguage: ttsLanguages.length > 0 ? ttsLanguages[0].title : ''
      });
      fetchAudioFiles(currentPage);
    } catch (error: any) {
      console.error('Error submitting form:', error);
      let errorMessage = 'Error processing audio. Please try again.';
      
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      alert(errorMessage);
    }
  };

  // Handle edit
  const handleEdit = (audio: AudioFile) => {
    setEditingAudio(audio);
    setFormData({
      exhibitId: audio.exhibitId || '',
      languageId: audio.languageId || '',
      fileUrl: audio.fileUrl || '',
      title: audio.title || '',
      description: audio.description || ''
    });
    setShowAddForm(true);
  };

  // Handle delete
  const handleDelete = async (audioId: number) => {
    if (window.confirm('Are you sure you want to delete this audio file?')) {
      try {
        await apiClient.delete(`/audio/${audioId}`);
        fetchAudioFiles(currentPage);
      } catch (error) {
        console.error('Error deleting audio:', error);
      }
    }
  };

  // Filter audio files by search term
  const filteredAudioFiles = audioFiles.filter(audio =>
    audio.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    audio.exhibit?.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    audio.language?.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Validate audio URL - more permissive since visitor playback works
  const isValidAudioUrl = (url: string): boolean => {
    if (!url || url.trim() === '') return false;
    
    // Check if it's a valid URL format
    try {
      const urlObj = new URL(url);
      // Accept http, https, and relative URLs
      return ['http:', 'https:', ''].includes(urlObj.protocol) || !url.includes('://');
    } catch {
      // If URL constructor fails, check if it's a relative path
      return url.startsWith('/') || url.startsWith('./') || url.startsWith('../') || !url.includes('://');
    }
  };

  // Handle audio play/pause - using same method as visitor page
  const toggleAudioPlay = (audioId: number, fileUrl: string | null) => {
    console.log('Attempting to play audio:', audioId, fileUrl);
    
    if (!fileUrl || fileUrl.trim() === '') {
      console.warn('No file URL provided for audio:', audioId);
      alert('No audio file URL available for this audio.');
      return;
    }
    
    // Construct full URL same as visitor page
    const fullAudioUrl = `${BACKEND_URL}${fileUrl}`;
    console.log('Full audio URL:', fullAudioUrl);
    
    // Validate the constructed URL
    if (!fullAudioUrl || fullAudioUrl === BACKEND_URL || fullAudioUrl.endsWith('null') || fullAudioUrl.endsWith('undefined')) {
      console.error('Invalid full audio URL constructed:', fullAudioUrl);
      alert('Invalid audio file URL. Please check the audio file.');
      return;
    }
    
    // Stop currently playing audio
    if (playingAudio && playingAudio !== audioId && audioElements[playingAudio]) {
      audioElements[playingAudio].pause();
      audioElements[playingAudio].currentTime = 0;
    }
    
    if (playingAudio === audioId) {
      // Pause current audio
      if (audioElements[audioId]) {
        audioElements[audioId].pause();
      }
      setPlayingAudio(null);
      console.log('Paused audio:', audioId);
    } else {
      // Play new audio
      setLoadingAudio(audioId);
      let audio = audioElements[audioId];
      
      if (!audio) {
        console.log('Creating new audio element for:', fullAudioUrl);
        // Create new audio element - same as visitor page approach
        audio = new Audio();
        
        audio.addEventListener('loadedmetadata', () => {
          console.log('Audio metadata loaded:', audioId);
          setLoadingAudio(null);
        });
        
        audio.addEventListener('canplay', () => {
          console.log('Audio can play:', audioId);
          setLoadingAudio(null);
        });
        
        audio.addEventListener('ended', () => {
          console.log('Audio ended:', audioId);
          setPlayingAudio(null);
          setLoadingAudio(null);
        });
        
        audio.addEventListener('error', (e) => {
          // Hide empty src attribute errors from console
          if (audio.error?.code !== 4 || !audio.error?.message?.includes('Empty src attribute')) {
            console.error('Audio error for', audioId, ':', e, audio.error);
          }
          setPlayingAudio(null);
          setLoadingAudio(null);
          if (audio.error?.code !== 4 || !audio.error?.message?.includes('Empty src attribute')) {
            alert(`Failed to load audio: ${audio.error?.message || 'Unknown error'}\n\nURL: ${fullAudioUrl}`);
          }
        });
        
        setAudioElements(prev => ({
          ...prev,
          [audioId]: audio
        }));
      }
      
      // Always reset and reload the source to prevent corruption
      console.log('Setting audio source:', fullAudioUrl);
      audio.src = fullAudioUrl;
      audio.load();
      
      // Play the audio
      const playPromise = audio.play();
      
      if (playPromise !== undefined) {
        playPromise.then(() => {
          console.log('Audio playing successfully:', audioId);
          setPlayingAudio(audioId);
          setLoadingAudio(null);
        }).catch((error) => {
          console.error('Failed to play audio:', audioId, error);
          setPlayingAudio(null);
          setLoadingAudio(null);
          
          // If the audio failed due to no supported sources, recreate the element
          if (error.name === 'NotSupportedError') {
            console.log('Recreating corrupted audio element for:', audioId);
            // Remove the corrupted audio element
            setAudioElements(prev => {
              const newElements = { ...prev };
              delete newElements[audioId];
              return newElements;
            });
            alert(`Audio playback failed. Please try again.`);
          } else {
            alert(`Failed to play audio: ${error.message}`);
          }
        });
      }
    }
  };

  // Handle view transcript
  const handleViewTranscript = async (audio: AudioFile) => {
    setSelectedAudioForTranscript(audio);
    setLoadingTranscript(true);
    setShowTranscript(true);
    
    try {
      const response = await apiClient.get(`/audio/${audio.audioId}`);
      setTranscriptData(response.data);
    } catch (error) {
      console.error('Error fetching transcript:', error);
      setTranscriptData(null);
    } finally {
      setLoadingTranscript(false);
    }
  };

  return (
    <AdminLayout currentPath="/admin/audio">
      <div className="audio-management">
        <div className="page-header">
          <div className="header-left">
            <h1>
              <Music size={28} />
              Audio Management
            </h1>
            <p>Manage audio files for museum exhibits</p>
          </div>
          <button 
            className="btn-primary"
            onClick={() => window.location.hash = 'add-audio'}
          >
            <Plus size={20} />
            Add Audio File
          </button>
        </div>

        {/* Filters */}
        <div className="filters-section">
          <div className="search-bar">
            <Search size={20} />
            <input
              type="text"
              placeholder="Search audio files..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="filter-controls">
            <select
              value={selectedExhibit}
              onChange={(e) => setSelectedExhibit(e.target.value)}
            >
              <option value="">All Exhibits</option>
              {exhibits.map(exhibit => (
                <option key={exhibit.exhibitId} value={exhibit.exhibitId}>
                  {exhibit.title}
                </option>
              ))}
            </select>
            
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
            >
              <option value="">All Languages</option>
              {languages.filter((language: Language) => 
                ['English', 'Spanish', 'French', 'German', 'Japanese', 'Chinese (Simplified)'].includes(language.title)
              ).map(language => (
                <option key={language.languageId} value={language.languageId}>
                  {language.title}
                </option>
              ))}
            </select>

            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(parseInt(e.target.value));
                setCurrentPage(1);
              }}
            >
              <option value={5}>5 per page</option>
              <option value={10}>10 per page</option>
              <option value={20}>20 per page</option>
            </select>

            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-');
                setSortBy(field);
                setSortOrder(order as 'asc' | 'desc');
              }}
            >
              <option value="createdAt-desc">Newest First</option>
              <option value="createdAt-asc">Oldest First</option>
              <option value="title-asc">Title A-Z</option>
              <option value="title-desc">Title Z-A</option>
            </select>
            
            <button
              className="btn-icon"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              title="Advanced Filters"
            >
              <Filter size={16} />
            </button>
          </div>
        </div>

        {showAdvancedFilters && (
          <div className="advanced-filters">
            <div className="filter-row">
              <div className="filter-group">
                <label>Has Playbacks</label>
                <select
                  value={hasPlaybackFilter}
                  onChange={(e) => setHasPlaybackFilter(e.target.value)}
                >
                  <option value="">All Audio</option>
                  <option value="true">Has Playbacks</option>
                  <option value="false">No Playbacks</option>
                </select>
              </div>
              
              <div className="filter-group">
                <label>Created From</label>
                <input
                  type="date"
                  value={dateFromFilter}
                  onChange={(e) => setDateFromFilter(e.target.value)}
                />
              </div>
              
              <div className="filter-group">
                <label>Created To</label>
                <input
                  type="date"
                  value={dateToFilter}
                  onChange={(e) => setDateToFilter(e.target.value)}
                />
              </div>
              
              <div className="filter-group">
                <button
                  className="btn-secondary"
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedExhibit('');
                    setSelectedLanguage('');
                    setHasPlaybackFilter('');
                    setDateFromFilter('');
                    setDateToFilter('');
                    setSortBy('createdAt');
                    setSortOrder('desc');
                    setCurrentPage(1);
                  }}
                >
                  Clear All Filters
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Audio Files List */}
        <div className="audio-list">
          {loading ? (
            <div className="loading-state">
              <Volume2 className="loading-icon" />
              <p>Loading audio files...</p>
            </div>
          ) : filteredAudioFiles.length === 0 ? (
            <div className="empty-state">
              <Music size={64} />
              <h3>No audio files found</h3>
              <p>Add your first audio file to get started</p>
            </div>
          ) : (
            filteredAudioFiles.map(audio => (
              <div key={audio.audioId} className="audio-card">
                <div className="audio-info">
                  <div className="audio-header">
                    <h3>{audio.title || 'Untitled Audio'}</h3>
                    <div className="audio-badges">
                      {audio.language && (
                        <span className="badge language-badge">
                          <Languages size={14} />
                          {audio.language.title}
                        </span>
                      )}
                      <span className="badge playback-badge">
                        {audio.playbackCount} plays
                      </span>
                    </div>
                  </div>
                  
                  <div className="audio-details">
                    <p className="audio-description">
                      {audio.description || 'No description provided'}
                    </p>
                    <div className="audio-meta">
                      <span className="exhibit-info">
                        <strong>Exhibit:</strong> {audio.exhibit?.title || 'No exhibit assigned'}
                      </span>
                      <span className="date-info">
                        <Calendar size={14} />
                        {new Date(audio.createdAt).toLocaleDateString()}
                      </span>
                      {audio.fileUrl && (
                        <span className={`url-status ${isValidAudioUrl(audio.fileUrl) ? 'valid' : 'invalid'}`}>
                          <strong>Audio:</strong> {isValidAudioUrl(audio.fileUrl) ? '✓ File Available' : '✗ File Missing'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="audio-controls">
                  {audio.fileUrl && (
                    <button
                      className={`play-btn ${playingAudio === audio.audioId ? 'playing' : ''} ${loadingAudio === audio.audioId ? 'loading' : ''}`}
                      onClick={() => toggleAudioPlay(audio.audioId, audio.fileUrl)}
                      disabled={loadingAudio === audio.audioId}
                    >
                      {loadingAudio === audio.audioId ? (
                        <div className="loading-spinner" />
                      ) : playingAudio === audio.audioId ? (
                        <Pause size={20} />
                      ) : (
                        <Play size={20} />
                      )}
                    </button>
                  )}
                  
                  <div className="action-buttons">
                    <button
                      className="btn-icon"
                      onClick={() => handleViewTranscript(audio)}
                      title="View transcript"
                    >
                      <FileText size={16} />
                    </button>
                    
                    <button
                      className="btn-icon"
                      onClick={() => handleEdit(audio)}
                      title="Edit audio"
                    >
                      <Edit size={16} />
                    </button>
                    
                    <button
                      className="btn-icon delete-btn"
                      onClick={() => handleDelete(audio.audioId)}
                      title="Delete audio"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination">
            <div className="pagination-info">
              Showing {filteredAudioFiles.length} of {totalItems} audio files 
              ({Math.ceil((currentPage - 1) * itemsPerPage + 1)}-{Math.min(currentPage * itemsPerPage, totalItems)})
            </div>
            <div className="pagination-controls">
              <button 
                disabled={currentPage === 1}
                onClick={() => fetchAudioFiles(currentPage - 1)}
              >
                Previous
              </button>
              
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    className={currentPage === pageNum ? 'active' : ''}
                    onClick={() => fetchAudioFiles(pageNum)}
                  >
                    {pageNum}
                  </button>
                );
              })}
              
              <button 
                disabled={currentPage === totalPages}
                onClick={() => fetchAudioFiles(currentPage + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Add/Edit Form Modal */}
        {showAddForm && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h2>
                  {editingAudio ? 'Edit Audio File' : 'Add New Audio File'}
                </h2>
                <button 
                  className="modal-close"
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingAudio(null);
                  }}
                >
                  ×
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="audio-form">
                {editingAudio ? (
                  // Edit form - show existing fields
                  <>
                    <div className="form-group">
                      <label htmlFor="title">Title *</label>
                      <input
                        type="text"
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="exhibitId">Exhibit *</label>
                      <select
                        id="exhibitId"
                        value={formData.exhibitId}
                        onChange={(e) => setFormData({...formData, exhibitId: e.target.value})}
                        required
                      >
                        <option value="">Select an exhibit</option>
                        {exhibits.map(exhibit => (
                          <option key={exhibit.exhibitId} value={exhibit.exhibitId}>
                            {exhibit.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label htmlFor="languageId">Language</label>
                      <select
                        id="languageId"
                        value={formData.languageId}
                        onChange={(e) => setFormData({...formData, languageId: e.target.value})}
                      >
                        <option value="">Select a language</option>
                        {languages.map(language => (
                          <option key={language.languageId} value={language.languageId}>
                            {language.title} ({language.code})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label htmlFor="description">Description</label>
                      <textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        rows={3}
                        placeholder="Audio description or notes..."
                      />
                    </div>
                  </>
                ) : (
                  // Add form - show upload fields
                  <>
                    <div className="form-group">
                      <label htmlFor="uploadExhibitId">Exhibit *</label>
                      <select
                        id="uploadExhibitId"
                        value={uploadData.exhibitId}
                        onChange={(e) => setUploadData({...uploadData, exhibitId: e.target.value})}
                        required
                      >
                        <option value="">Select an exhibit</option>
                        {exhibits.map(exhibit => (
                          <option key={exhibit.exhibitId} value={exhibit.exhibitId}>
                            {exhibit.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label htmlFor="audioFile">Audio File</label>
                      <input
                        type="file"
                        id="audioFile"
                        accept="audio/*"
                        onChange={(e) => setUploadData({...uploadData, audioFile: e.target.files?.[0] || null})}
                      />
                      {uploadData.audioFile && (
                        <p className="file-info">Selected: {uploadData.audioFile.name}</p>
                      )}
                    </div>

                    <div className="form-group">
                      <label htmlFor="uploadDescription">Description</label>
                      <textarea
                        id="uploadDescription"
                        value={uploadData.description}
                        onChange={(e) => setUploadData({...uploadData, description: e.target.value})}
                        rows={3}
                        placeholder="Audio description or notes..."
                      />
                    </div>

                    {/* TTS Section */}
                    <div className="form-section">
                      <h4>OR Generate Audio from Text (TTS)</h4>
                      
                      <div className="form-group">
                        <label htmlFor="ttsLanguage">TTS Language</label>
                        <select
                          id="ttsLanguage"
                          value={uploadData.ttsLanguage}
                          onChange={(e) => setUploadData({...uploadData, ttsLanguage: e.target.value})}
                        >
                          {languages.filter((language: Language) => 
                            ['English', 'Spanish', 'French', 'German', 'Japanese', 'Chinese (Simplified)'].includes(language.title)
                          ).map(language => (
                            <option key={language.languageId} value={language.title}>
                              {language.title}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group">
                        <label htmlFor="ttsText">Script (in {uploadData.ttsLanguage})</label>
                        <textarea
                          id="ttsText"
                          value={uploadData.ttsText}
                          onChange={(e) => setUploadData({...uploadData, ttsText: e.target.value})}
                          rows={6}
                          placeholder={`Enter the full script here, written in ${uploadData.ttsLanguage}...`}
                        />
                        {uploadData.ttsText && (
                          <div className="tts-preview">
                            <p className="form-hint"><strong>Preview:</strong> This text will be converted to speech and used as subtitles.</p>
                            <div className="preview-text">{uploadData.ttsText}</div>
                          </div>
                        )}
                        <p className="form-hint">
                          <Info size={14}/> You must provide the text in the language you selected above.
                        </p>
                      </div>
                    </div>
                  </>
                )}

                <div className="form-actions">
                  <button 
                    type="button" 
                    className="btn-secondary"
                    onClick={() => {
                      setShowAddForm(false);
                      setEditingAudio(null);
                      const ttsLanguages = languages.filter((language: Language) => 
                        ['English', 'Spanish', 'French', 'German', 'Japanese', 'Chinese (Simplified)'].includes(language.title)
                      );
                      setUploadData({
                        exhibitId: '',
                        description: '',
                        audioFile: null,
                        ttsText: '',
                        ttsLanguage: ttsLanguages.length > 0 ? ttsLanguages[0].title : ''
                      });
                    }}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    {editingAudio ? 'Update Audio' : 'Upload Audio'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Transcript Modal */}
        {showTranscript && (
          <div className="modal-overlay">
            <div className="modal-content transcript-modal">
              <div className="modal-header">
                <h2>
                  <FileText size={24} />
                  Audio Transcript
                </h2>
                <button 
                  className="modal-close"
                  onClick={() => {
                    setShowTranscript(false);
                    setSelectedAudioForTranscript(null);
                    setTranscriptData(null);
                  }}
                >
                  ×
                </button>
              </div>
              
              <div className="transcript-content">
                {selectedAudioForTranscript && (
                  <div className="transcript-header">
                    <h3>{selectedAudioForTranscript.title || 'Untitled Audio'}</h3>
                    <div className="transcript-meta">
                      <span className="exhibit-name">
                        {selectedAudioForTranscript.exhibit?.title || 'No exhibit'}
                      </span>
                      {selectedAudioForTranscript.language && (
                        <span className="language-name">
                          {selectedAudioForTranscript.language.title}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div className="transcript-body">
                  {loadingTranscript ? (
                    <div className="transcript-loading">
                      <div className="loading-spinner" />
                      <p>Loading transcript...</p>
                    </div>
                  ) : transcriptData?.subtitles && transcriptData.subtitles.length > 0 ? (
                    <div className="transcript-text">
                      {transcriptData.subtitles.map((subtitle: any, index: number) => {
                        let displayText = '';
                        
                        try {
                          if (Array.isArray(subtitle.text)) {
                            // Already parsed array - extract words
                            displayText = subtitle.text
                              .map((wordObj: any) => wordObj.word || wordObj.text || wordObj)
                              .join(' ');
                          } else if (typeof subtitle.text === 'string') {
                            // Try to parse JSON string first
                            try {
                              const parsed = JSON.parse(subtitle.text);
                              if (Array.isArray(parsed)) {
                                // Parsed successfully - extract words
                                displayText = parsed
                                  .map((wordObj: any) => wordObj.word || wordObj.text || wordObj)
                                  .filter(word => word && word.length > 0)
                                  .join(' ');
                              } else {
                                // Not an array, use as plain text
                                displayText = subtitle.text;
                              }
                            } catch (parseError) {
                              // Not valid JSON, use as plain text
                              displayText = subtitle.text;
                            }
                          } else {
                            displayText = 'No transcript available';
                          }
                        } catch (error) {
                          console.error('Error processing subtitle:', error);
                          displayText = 'Error processing transcript';
                        }
                        
                        return (
                          <div key={index} className="subtitle-block">
                            <div className="subtitle-content">
                              {displayText || 'No transcript text available'}
                            </div>
                            {subtitle.language && (
                              <div className="subtitle-language">
                                Language: {subtitle.language.title}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="no-transcript">
                      <FileText size={48} color="#ccc" />
                      <h4>No transcript available</h4>
                      <p>This audio file doesn't have a transcript yet.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AudioManagement;