import React, { useState, useEffect, useCallback, useMemo, FC } from 'react';
import apiClient from '../../utils/apiClient';
import { 
  Edit, 
  Trash2, 
  PlusCircle, 
  Loader2, 
  QrCode, 
  MapPin, 
  ImageIcon, 
  Mic, 
  Download, 
  ArrowUp, 
  ArrowDown,
  RotateCcw 
} from 'lucide-react';
import Modal from './Modal';
import ExhibitForm from './ExhibitForm';
import ExhibitionForm from './ExhibitionForm';
import '../css/ManageExhibits.css';

const BACKEND_URL = import.meta.env.VITE_API_TARGET || '';
const DEFAULT_IMAGE_URL = `${BACKEND_URL}/public/images/Exhibit.jpg`;

const buildImageUrl = (fileUrl: string | null): string => {
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

// --- Interfaces ---

interface Status { 
  statusId: number; 
  statusName: string; 
}

interface ExhibitImage { 
  imageId: string; 
  fileUrl: string; 
  isPrimary: boolean;
  title: string;
  altText: string;
}

interface Exhibit {
  exhibitId: string;
  exhibitionId: string;
  title: string;
  description: string;
  additionalDescription: string; 
  sequence: number;
  images: ExhibitImage[];
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

const StatusBadge: FC<{ statusName?: string }> = ({ statusName }) => {
  const statusClass = (statusName || 'unknown').toLowerCase();
  return <span className={`status-badge ${statusClass}`}>{statusName || 'Unknown'}</span>;
};

const ManageExhibitions: React.FC = () => {
  const [exhibitionGroups, setExhibitionGroups] = useState<ExhibitionGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  
  const [isExhibitModalOpen, setIsExhibitModalOpen] = useState(false);
  const [isExhibitionModalOpen, setIsExhibitionModalOpen] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  
  const [editingExhibit, setEditingExhibit] = useState<Exhibit | null>(null);
  const [editingExhibition, setEditingExhibition] = useState<ExhibitionGroup | null>(null);
  const [preselectedExhibitionId, setPreselectedExhibitionId] = useState<string | null>(null);
  const [qrCodeData, setQRCodeData] = useState<{ qrUrl: string; qrCodeImage: string; exhibitId: string } | null>(null);

  const fetchAdminData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/exhibitions/admin/all');
      setExhibitionGroups(response.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAdminData(); }, [fetchAdminData]);

  const processedData = useMemo(() => {
    return exhibitionGroups
      .filter(group => {
        if (filterStatus === 'all') return true;
        const isGroupActive = group.status?.statusName.toLowerCase() === 'active';
        return filterStatus === 'active' ? isGroupActive : !isGroupActive;
      })
      .map(group => ({
        ...group,
        exhibits: [...group.exhibits].sort((a, b) => (a.sequence || 0) - (b.sequence || 0))
      }));
  }, [exhibitionGroups, filterStatus]);

  const handleToggleExhibitionStatus = async (exhibitionId: string, title: string, currentStatus: string) => {
    const isActive = currentStatus.toLowerCase() === 'active';
    const action = isActive ? 'deactivate' : 'reactivate';
    
    if (window.confirm(`Are you sure you want to ${action} "${title}"?`)) {
      try {
        if (isActive) {
          await apiClient.delete(`/exhibitions/${exhibitionId}`);
        } else {
          // Uses PATCH to match backend route
          await apiClient.patch(`/exhibitions/${exhibitionId}/reactivate`);
        }
        fetchAdminData();
      } catch (err) {
        console.error(`Error ${action}ing tour:`, err);
        alert(`Failed to ${action} the tour.`);
      }
    }
  };

  const handleMove = async (exhibitId: string, direction: 'up' | 'down', currentExhibits: Exhibit[]) => {
    try {
      const currentIndex = currentExhibits.findIndex(e => e.exhibitId === exhibitId);
      if (currentIndex === -1) return;

      const currentExhibit = currentExhibits[currentIndex];
      const currentSequence = currentExhibit.sequence || 0;
      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      
      if (targetIndex < 0 || targetIndex >= currentExhibits.length) return;
      
      const swapExhibit = currentExhibits[targetIndex];
      const swapSequence = swapExhibit.sequence || 0;

      await apiClient.put(`/exhibits/${exhibitId}/sequence`, { sequence: -999 });
      await apiClient.put(`/exhibits/${swapExhibit.exhibitId}/sequence`, { sequence: currentSequence });
      await apiClient.put(`/exhibits/${exhibitId}/sequence`, { sequence: swapSequence });
      
      fetchAdminData();
    } catch (err) {
      console.error('Reorder error:', err);
      alert('Order update failed.');
    }
  };

  const handleViewQRCode = async (exhibitId: string) => {
    try {
      const response = await apiClient.get(`/exhibits/${exhibitId}/qr`);
      setQRCodeData({ ...response.data, exhibitId });
      setIsQRModalOpen(true);
    } catch (err) {
      alert('Failed to load QR.');
    }
  };

  if (loading) return (
    <div className="status-container">
      <Loader2 className="animate-spin" /> 
      <p>Loading sequences...</p>
    </div>
  );

  return (
    <div className="manage-exhibits-container">
      <header className="page-main-header">
        <div className="header-text">
          <h1>Tour & Exhibit Flow</h1>
          <p>Sequence your exhibits and manage visitor paths.</p>
        </div>
        <button className="button-primary" onClick={() => { 
          setEditingExhibition(null); 
          setIsExhibitionModalOpen(true); 
        }}>
          <PlusCircle size={18} /> New Tour
        </button>
      </header>

      {/* --- Filter Bar --- */}
      <div className="filter-bar">
        <div className="filter-group">
          <button 
            className={`filter-btn ${filterStatus === 'all' ? 'active' : ''}`}
            onClick={() => setFilterStatus('all')}
          >
            All Tours
          </button>
          <button 
            className={`filter-btn ${filterStatus === 'active' ? 'active' : ''}`}
            onClick={() => setFilterStatus('active')}
          >
            Active
          </button>
          <button 
            className={`filter-btn ${filterStatus === 'inactive' ? 'active' : ''}`}
            onClick={() => setFilterStatus('inactive')}
          >
            Inactive
          </button>
        </div>
        <div className="filter-stats">
            {processedData.length} Tour{processedData.length !== 1 ? 's' : ''} Listed
        </div>
      </div>

      <div className="tour-timeline-stack">
        {processedData.map((group) => {
          const isTourActive = group.status?.statusName.toLowerCase() === 'active';
          
          return (
            <div key={group.exhibitionId} className={`tour-card ${!isTourActive ? 'tour-inactive' : ''}`}>
              <div className="tour-card-header">
                <div className="tour-meta">
                  <div className={`tour-icon-box ${!isTourActive ? 'inactive' : ''}`}>
                    <MapPin size={20} />
                  </div>
                  <div className="tour-titles">
                    <h3>{group.title}</h3>
                    <StatusBadge statusName={group.status?.statusName} />
                  </div>
                </div>
                <div className="tour-actions">
                  <button className="btn-ghost" onClick={() => { 
                    setPreselectedExhibitionId(group.exhibitionId); 
                    setEditingExhibit(null); 
                    setIsExhibitModalOpen(true); 
                  }}>
                    <PlusCircle size={16} /> Add Exhibit
                  </button>
                  <button className="btn-ghost" onClick={() => { 
                    setEditingExhibition(group); 
                    setIsExhibitionModalOpen(true); 
                  }}>
                    <Edit size={16} /> Edit Tour
                  </button>
                  
                  {isTourActive ? (
                    <button 
                      className="btn-ghost danger" 
                      onClick={() => handleToggleExhibitionStatus(group.exhibitionId, group.title, 'active')}
                    >
                      <Trash2 size={16} /> Deactivate
                    </button>
                  ) : (
                    <button 
                      className="btn-ghost success" 
                      onClick={() => handleToggleExhibitionStatus(group.exhibitionId, group.title, 'inactive')}
                    >
                      <RotateCcw size={16} /> Reactivate
                    </button>
                  )}
                </div>
              </div>

              <div className="timeline-body">
                {group.exhibits.map((exhibit, index) => {
                  const primaryImage = exhibit.images.find(img => img.isPrimary) || exhibit.images[0];
                  const isFirst = index === 0;
                  const isLast = index === group.exhibits.length - 1;

                  return (
                    <div key={exhibit.exhibitId} className="timeline-row">
                      <div className="timeline-rail">
                        <div className={`timeline-dot ${index === 0 && isTourActive ? 'active' : ''}`}>
                          {exhibit.sequence}
                        </div>
                        {!isLast && <div className="timeline-bar"></div>}
                      </div>

                      <div className="timeline-content">
                        <div className="content-card">
                          <img src={buildImageUrl(primaryImage?.fileUrl)} alt="" className="content-img" />
                          <div className="content-text">
                            <h4>{exhibit.title}</h4>
                            <div className="content-stats">
                              <span><ImageIcon size={14} /> {exhibit._count.images}</span>
                              <span><Mic size={14} /> {exhibit._count.audio}</span>
                              <StatusBadge statusName={exhibit.status?.statusName} />
                            </div>
                          </div>
                          
                          <div className="content-actions">
                            <div className="reorder-controls">
                              <button disabled={isFirst} onClick={() => handleMove(exhibit.exhibitId, 'up', group.exhibits)} className="order-btn">
                                <ArrowUp size={14} />
                              </button>
                              <button disabled={isLast} onClick={() => handleMove(exhibit.exhibitId, 'down', group.exhibits)} className="order-btn">
                                <ArrowDown size={14} />
                              </button>
                            </div>
                            <div className="v-divider"></div>
                            <button className="icon-btn" onClick={() => { setEditingExhibit(exhibit); setIsExhibitModalOpen(true); }}><Edit size={18} /></button>
                            <button className="icon-btn" onClick={() => handleViewQRCode(exhibit.exhibitId)}><QrCode size={18} /></button>
                            <button className="icon-btn danger" onClick={() => { if(window.confirm('Deactivate Exhibit?')) apiClient.delete(`/exhibits/${exhibit.exhibitId}`).then(fetchAdminData); }}><Trash2 size={18} /></button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {group.exhibits.length === 0 && <p className="empty-msg">No exhibits added yet.</p>}
              </div>
            </div>
          );
        })}
        {processedData.length === 0 && (
            <div className="empty-filter-state">
                <p>No {filterStatus} tours found matching your criteria.</p>
            </div>
        )}
      </div>

      <Modal isOpen={isExhibitModalOpen} onClose={() => setIsExhibitModalOpen(false)} title={editingExhibit ? "Edit Exhibit" : "Add Exhibit"}>
        <ExhibitForm 
          exhibitToEdit={editingExhibit} 
          preselectedExhibitionId={preselectedExhibitionId} 
          onSave={() => { fetchAdminData(); setIsExhibitModalOpen(false); }} 
          onClose={() => setIsExhibitModalOpen(false)} 
        />
      </Modal>

      <Modal isOpen={isExhibitionModalOpen} onClose={() => setIsExhibitionModalOpen(false)} title={editingExhibition ? "Edit Tour" : "New Tour"}>
        <ExhibitionForm 
          exhibitionToEdit={editingExhibition} 
          onSave={() => { fetchAdminData(); setIsExhibitionModalOpen(false); }} 
          onClose={() => setIsExhibitionModalOpen(false)} 
        />
      </Modal>

      {isQRModalOpen && qrCodeData && (
        <Modal isOpen={isQRModalOpen} onClose={() => setIsQRModalOpen(false)} title="QR Access">
          <div className="qr-modal-body">
             <div className="qr-container"><img src={qrCodeData.qrCodeImage} alt="QR" /></div>
             <code className="qr-link">{qrCodeData.qrUrl}</code>
             <div className="qr-footer-btns">
                <a href={qrCodeData.qrCodeImage} download className="btn-download-primary"><Download size={16} /> Download PNG</a>
             </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ManageExhibitions;