import React, { useState, useEffect, useCallback, useMemo, FC } from 'react';
import apiClient from '../../utils/apiClient';
import { Edit, Trash2, PlusCircle, Loader2, QrCode, Building2, RotateCcw } from 'lucide-react';
import Modal from './Modal';
import ExhibitForm from './ExhibitForm';
import ExhibitionForm from './ExhibitionForm';
import '../css/ManageExhibits.css';

const BACKEND_URL = import.meta.env.VITE_API_TARGET || '';
const DEFAULT_IMAGE_URL = `${BACKEND_URL}/public/images/Exhibit.jpg`;

// Helper function to construct the correct image URL
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

// --- Type Definitions ---
interface Status {
  statusId: number;
  statusName: string;
}

interface ExhibitImageForAdmin {
  imageId: string;
  fileUrl: string;
  title: string | null;
  isPrimary: boolean;
}

interface Exhibit {
  exhibitId: string;
  title: string;
  description: string;
  additionalDescription: string;
  exhibitionId: string;
  images: ExhibitImageForAdmin[];
  _count: {
    images: number;
    audio: number;
  };
  status: Status;
}

interface ExhibitionGroup {
  exhibitionId: string;
  title: string;
  description: string;
  exhibits: Exhibit[];
  status: Status;
}

interface QRCodeData {
  qrUrl: string;
  qrCodeImage: string;
  exhibitId: string;
}

// --- Reusable Badge Component ---
interface StatusBadgeProps {
  statusName?: string;
}
const StatusBadge: FC<StatusBadgeProps> = ({ statusName }) => {
  const statusClass = (statusName || 'unknown').toLowerCase();
  return <span className={`status-badge ${statusClass}`}>{statusName || 'Unknown'}</span>;
};

// --- Main Component ---
const ManageExhibitions: React.FC = () => {
  const [exhibitionGroups, setExhibitionGroups] = useState<ExhibitionGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [isExhibitModalOpen, setIsExhibitModalOpen] = useState(false);
  const [isExhibitionModalOpen, setIsExhibitionModalOpen] = useState(false);
  
  const [editingExhibit, setEditingExhibit] = useState<Exhibit | null>(null);
  const [editingExhibition, setEditingExhibition] = useState<ExhibitionGroup | null>(null);
  const [preselectedExhibitionId, setPreselectedExhibitionId] = useState<string | null>(null);
  
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [qrCodeData, setQRCodeData] = useState<QRCodeData | null>(null);

  const [filter, setFilter] = useState('all');

  // --- Data Fetching ---
  const fetchAdminData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await apiClient.get('/exhibitions/admin/all');
      setExhibitionGroups(response.data);
    } catch (err) {
      setError('Failed to fetch data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);
  
  // Hash change logic for deep linking
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash === '#add-collection') {
        handleOpenCreateExhibitionModal();
        history.replaceState(null, document.title, window.location.pathname + window.location.search);
      } else if (hash.startsWith('#add-exhibit-')) {
        const exhibitionId = hash.replace('#add-exhibit-', '');
        if (exhibitionId) {
          handleOpenCreateExhibitModal(exhibitionId);
          history.replaceState(null, document.title, window.location.pathname + window.location.search);
        }
      }
    };
    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  // Filtering Logic
  const filteredData = useMemo(() => {
    if (filter === 'all') {
      return exhibitionGroups;
    }
    return exhibitionGroups
      .map(group => ({
        ...group,
        exhibits: group.exhibits.filter(
          (exhibit) => exhibit.status?.statusName.toLowerCase() === filter
        ),
      }))
      .filter(group =>
        group.status?.statusName.toLowerCase() === filter ||
        group.exhibits.length > 0
      );
  }, [exhibitionGroups, filter]);

  // --- Handlers for Exhibitions (Collections) ---
  const handleOpenCreateExhibitionModal = () => {
    setEditingExhibition(null);
    setIsExhibitionModalOpen(true);
  };

  const handleOpenEditExhibitionModal = (exhibition: ExhibitionGroup) => {
    setEditingExhibition(exhibition);
    setIsExhibitionModalOpen(true);
  };

  const handleDeleteExhibition = async (exhibitionId: string, exhibitCount: number) => {
    const confirmMsg = exhibitCount > 0
      ? `This will also mark all ${exhibitCount} exhibits inside as Inactive. Are you sure?`
      : 'Are you sure you want to mark this exhibition as Inactive?';
    if (window.confirm(confirmMsg)) {
      try {
        await apiClient.delete(`/exhibitions/${exhibitionId}`);
        fetchAdminData();
      } catch (err) { setError('Failed to deactivate exhibition.'); }
    }
  };

  const handleReactivateExhibition = async (exhibitionId: string) => {
    if (window.confirm('Are you sure you want to reactivate this exhibition and all exhibits inside?')) {
      try {
        await apiClient.patch(`/exhibitions/${exhibitionId}/reactivate`);
        fetchAdminData();
      } catch (err) {
        setError('Failed to reactivate exhibition.');
        console.error(err);
      }
    }
  };

  // --- Handlers for Exhibits (Items) ---
  const handleOpenCreateExhibitModal = (exhibitionId: string) => {
    setEditingExhibit(null);
    setPreselectedExhibitionId(exhibitionId);
    setIsExhibitModalOpen(true);
  };

  const handleOpenEditExhibitModal = (exhibit: Exhibit) => {
    setEditingExhibit(exhibit);
    setPreselectedExhibitionId(null);
    setIsExhibitModalOpen(true);
  };

  const handleDeleteExhibit = async (exhibitId: string) => {
    if (window.confirm('Are you sure you want to mark this exhibit as Inactive?')) {
      try {
        await apiClient.delete(`/exhibits/${exhibitId}`);
        fetchAdminData();
      } catch (err) { setError('Failed to deactivate exhibit.'); }
    }
  };

  const handleReactivateExhibit = async (exhibitId: string) => {
    if (window.confirm('Are you sure you want to reactivate this exhibit?')) {
      try {
        await apiClient.patch(`/exhibits/${exhibitId}/reactivate`);
        fetchAdminData();
      } catch (err) {
        setError('Failed to reactivate exhibit.');
        console.error(err);
      }
    }
  };
  
  // --- Universal Handlers ---
  const handleSave = () => {
    fetchAdminData();
  };

  const handleViewQRCode = async (exhibitId: string) => {
    try {
      const response = await apiClient.get(`/exhibits/${exhibitId}/qr`);
      setQRCodeData({ ...response.data, exhibitId });
      setIsQRModalOpen(true);
    } catch (err) {
      alert('Failed to load QR code.');
    }
  };

  if (loading) return <div className="status-container"><Loader2 className="animate-spin" /> Loading Exhibitions/Exhibits...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="manage-exhibits-container">
      <div className="manage-header">
        <div className="filter-container">
          <label htmlFor="status-filter" className="form-label" style={{marginBottom: 0, fontWeight: 500}}>Filter Status:</label>
          <select
            id="status-filter"
            className="form-input form-select"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{ minWidth: '150px' }}
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        
        <button className="button-primary" onClick={handleOpenCreateExhibitionModal}>
          <Building2 size={18} />
          Create New Exhibitions
        </button>
      </div>
      
      <div className="exhibitions-grouped-list">
        {filteredData.map((group) => (
          <section key={group.exhibitionId} className="exhibition-group">
            <header className="exhibition-group-header">
              <div className="exhibition-group-title">
                <h3>{group.title}</h3>
                <span className="exhibit-count">({group.exhibits.length} exhibits)</span>
                <StatusBadge statusName={group.status?.statusName} />
              </div>
              <div className="exhibition-group-actions">
                <button className="action-button create" onClick={() => handleOpenCreateExhibitModal(group.exhibitionId)}>
                  <PlusCircle size={16} /> Add Exhibit
                </button>
                <button className="action-button edit" onClick={() => handleOpenEditExhibitionModal(group)}>
                  <Edit size={16} /> Edit Exhibit
                </button>
                {group.status?.statusName.toLowerCase() === 'inactive' ? (
                  <button className="action-button reactivate" onClick={() => handleReactivateExhibition(group.exhibitionId)}>
                    <RotateCcw size={16} /> Reactivate
                  </button>
                ) : (
                  <button className="action-button delete" onClick={() => handleDeleteExhibition(group.exhibitionId, group.exhibits.length)}>
                    <Trash2 size={16} /> Deactivate
                  </button>
                )}
              </div>
            </header>
            <div className="exhibits-list">
              {group.exhibits.length > 0 ? (
                group.exhibits.map((exhibit) => {
                  // Prioritize primary image, fallback to first image, then default
                  const primaryImage = exhibit.images.find(img => img.isPrimary);
                  const imageToDisplay = primaryImage || exhibit.images[0] || null;
                  const imageUrl = getImageUrl(imageToDisplay?.fileUrl || null);
                  
                  return (
                    <div key={exhibit.exhibitId} className="exhibit-card-manage">
                      <img src={imageUrl} alt={exhibit.title} className="exhibit-card-image" />
                      <div className="exhibit-card-body">
                          <h4>{exhibit.title}</h4>
                          <p className="item-counts">Images: {exhibit._count.images} | Audio: {exhibit._count.audio}</p>
                          <div style={{ marginTop: '0.5rem', marginBottom: '1rem' }}>
                            <StatusBadge statusName={exhibit.status?.statusName} />
                          </div>
                          <div className="exhibit-card-actions">
                            <button className="action-button edit" onClick={() => handleOpenEditExhibitModal(exhibit)}>
                              <Edit size={16} /> Edit
                            </button>
                            <button className="action-button qr-code" onClick={() => handleViewQRCode(exhibit.exhibitId)}>
                              <QrCode size={16} /> QR
                            </button>
                            {exhibit.status?.statusName.toLowerCase() === 'inactive' ? (
                              <button className="action-button reactivate" onClick={() => handleReactivateExhibit(exhibit.exhibitId)}>
                                <RotateCcw size={16} /> Reactivate
                              </button>
                            ) : (
                              <button className="action-button delete" onClick={() => handleDeleteExhibit(exhibit.exhibitId)}>
                                <Trash2 size={16} /> Deactivate
                              </button>
                            )}
                          </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="no-exhibits-message">
                  <p>No exhibits match the current filter.</p>
                </div>
              )}
            </div>
          </section>
        ))}
      </div>

      <Modal
        isOpen={isExhibitModalOpen}
        onClose={() => setIsExhibitModalOpen(false)}
        title={editingExhibit ? `Edit Exhibit: ${editingExhibit.title}` : 'Create New Exhibit'}
      >
        <ExhibitForm
          exhibitToEdit={editingExhibit}
          preselectedExhibitionId={preselectedExhibitionId}
          onSave={handleSave}
          onClose={() => setIsExhibitModalOpen(false)}
        />
      </Modal>

      <Modal
        isOpen={isExhibitionModalOpen}
        onClose={() => setIsExhibitionModalOpen(false)}
        title={editingExhibition ? `Edit Exhibition: ${editingExhibition.title}` : 'Create New Exhibition'}
      >
        <ExhibitionForm
          exhibitionToEdit={editingExhibition}
          onSave={handleSave}
          onClose={() => setIsExhibitionModalOpen(false)}
        />
      </Modal>
      
      {isQRModalOpen && qrCodeData && (
        <Modal
          isOpen={isQRModalOpen}
          onClose={() => setIsQRModalOpen(false)}
          title={`QR Code for Exhibit`}
        >
          <div className="qr-code-modal-content">
              <img src={qrCodeData.qrCodeImage} alt="Exhibit QR Code" className="qr-image" />
              <p>Scan this code to go directly to the exhibit page.</p>
              <a href={qrCodeData.qrUrl} target="_blank" rel="noopener noreferrer" className="qr-url-link">{qrCodeData.qrUrl}</a>
              <a href={qrCodeData.qrCodeImage} download={`exhibit-${qrCodeData.exhibitId}-qr.png`} className="button-primary qr-download-btn">
                Download QR Image
              </a>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ManageExhibitions;