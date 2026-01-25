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
  RotateCcw,
  List
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

// --- Standard Exhibit Row (No DND) ---
const ExhibitRow: FC<{ 
  exhibit: Exhibit, 
  index: number, 
  isLast: boolean, 
  isTourActive: boolean,
  onEdit: () => void,
  onQR: () => void,
  onDelete: () => void
}> = ({ exhibit, index, isLast, isTourActive, onEdit, onQR, onDelete }) => {
  
  // Primary image is now the first (and likely only) image from optimized query
  const primaryImage = exhibit.images[0];

  return (
    <div className="timeline-row">
      <div className="timeline-rail">
        <div className={`timeline-dot ${index === 0 && isTourActive ? 'active' : ''}`}>
          {index + 1}
        </div>
        {!isLast && <div className="timeline-bar"></div>}
      </div>

      <div className="timeline-content">
        <div className="content-card">
          <img 
            src={buildImageUrl(primaryImage?.fileUrl)} 
            alt={primaryImage?.title || exhibit.title} 
            className="content-img"
            loading="lazy"
          />
          
          <div className="content-text">
            <h4>{exhibit.title}</h4>
            <div className="content-stats">
              <span><ImageIcon size={14} /> {exhibit._count.images}</span>
              <span><Mic size={14} /> {exhibit._count.audio}</span>
              <StatusBadge statusName={exhibit.status?.statusName} />
            </div>
          </div>
          
          <div className="content-actions">
            <button className="icon-btn" onClick={onEdit} title="Edit"><Edit size={18} /></button>
            <button className="icon-btn" onClick={onQR} title="View QR"><QrCode size={18} /></button>
            <button className="icon-btn danger" onClick={onDelete} title="Delete"><Trash2 size={18} /></button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ManageExhibitions: React.FC = () => {
  const [exhibitionGroups, setExhibitionGroups] = useState<ExhibitionGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  
  const [isExhibitModalOpen, setIsExhibitModalOpen] = useState(false);
  const [isExhibitionModalOpen, setIsExhibitionModalOpen] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [isReorderModalOpen, setIsReorderModalOpen] = useState(false);
  
  const [editingExhibit, setEditingExhibit] = useState<Exhibit | null>(null);
  const [editingExhibition, setEditingExhibition] = useState<ExhibitionGroup | null>(null);
  const [preselectedExhibitionId, setPreselectedExhibitionId] = useState<string | null>(null);
  const [qrCodeData, setQRCodeData] = useState<{ qrUrl: string; qrCodeImage: string; exhibitId: string } | null>(null);
  
  // Reorder State
  const [reorderExhibitionId, setReorderExhibitionId] = useState<string | null>(null);
  const [reorderExhibits, setReorderExhibits] = useState<Exhibit[]>([]);
  const [isSavingOrder, setIsSavingOrder] = useState(false);

  const fetchAdminData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/exhibitions/admin/all');
      setExhibitionGroups(response.data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
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
        if (isActive) await apiClient.delete(`/exhibitions/${exhibitionId}`);
        else await apiClient.patch(`/exhibitions/${exhibitionId}/reactivate`);
        fetchAdminData();
      } catch (err) { alert(`Failed to ${action} the tour.`); }
    }
  };

  const handleViewQRCode = async (exhibitId: string) => {
    try {
      const response = await apiClient.get(`/exhibits/${exhibitId}/qr`);
      setQRCodeData({ ...response.data, exhibitId });
      setIsQRModalOpen(true);
    } catch (err) { alert('Failed to load QR.'); }
  };

  // Reorder Handlers
  const handleOpenReorderModal = (exhibitionId: string, exhibits: Exhibit[]) => {
    setReorderExhibitionId(exhibitionId);
    setReorderExhibits([...exhibits].sort((a, b) => (a.sequence || 0) - (b.sequence || 0)));
    setIsReorderModalOpen(true);
  };

  const handleSequenceChange = (exhibitId: string, newSequence: number) => {
    setReorderExhibits(prev => 
      prev.map(ex => ex.exhibitId === exhibitId ? { ...ex, sequence: newSequence } : ex)
    );
  };

  const handleSaveSequences = async () => {
    if (!reorderExhibitionId) return;
    setIsSavingOrder(true);
    try {
      const payload = reorderExhibits.map(ex => ({
        exhibitId: ex.exhibitId,
        sequence: ex.sequence
      }));
      await apiClient.put(`/exhibits/exhibition/${reorderExhibitionId}/reorder`, { exhibits: payload });
      await fetchAdminData();
      setIsReorderModalOpen(false);
    } catch (err) {
      console.error("Failed to save sequences:", err);
      alert('Failed to update exhibit sequences.');
    } finally {
      setIsSavingOrder(false);
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
          <p>Manage tour exhibits and sequence order.</p>
        </div>
        <button className="button-primary" onClick={() => { setEditingExhibition(null); setIsExhibitionModalOpen(true); }}>
          <PlusCircle size={18} /> New Tour
        </button>
      </header>

      <div className="filter-bar">
        <div className="filter-group">
          {(['all', 'active', 'inactive'] as const).map(status => (
            <button 
              key={status}
              className={`filter-btn ${filterStatus === status ? 'active' : ''}`}
              onClick={() => setFilterStatus(status)}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)} Tours
            </button>
          ))}
        </div>
        <div className="filter-stats">{processedData.length} Tours Listed</div>
      </div>

      <div className="tour-timeline-stack">
        {processedData.map((group) => {
          const isTourActive = group.status?.statusName.toLowerCase() === 'active';
          
          return (
            <div key={group.exhibitionId} className={`tour-card ${!isTourActive ? 'tour-inactive' : ''}`}>
              <div className="tour-card-header">
                <div className="tour-meta">
                  <div className={`tour-icon-box ${!isTourActive ? 'inactive' : ''}`}><MapPin size={20} /></div>
                  <div className="tour-titles">
                    <h3>{group.title}</h3>
                    <StatusBadge statusName={group.status?.statusName} />
                  </div>
                </div>
                <div className="tour-actions">
                  <button className="btn-ghost" onClick={() => { setPreselectedExhibitionId(group.exhibitionId); setEditingExhibit(null); setIsExhibitModalOpen(true); }}>
                    <PlusCircle size={16} /> Add Exhibit
                  </button>
                  {/* REORDER BUTTON RESTORED */}
                  <button className="btn-ghost" onClick={() => handleOpenReorderModal(group.exhibitionId, group.exhibits)}>
                    <List size={16} /> Reorder
                  </button>
                  <button className="btn-ghost" onClick={() => { setEditingExhibition(group); setIsExhibitionModalOpen(true); }}>
                    <Edit size={16} /> Edit Tour
                  </button>
                  <button 
                    className={`btn-ghost ${isTourActive ? 'danger' : 'success'}`} 
                    onClick={() => handleToggleExhibitionStatus(group.exhibitionId, group.title, isTourActive ? 'active' : 'inactive')}
                  >
                    {isTourActive ? <><Trash2 size={16} /> Deactivate</> : <><RotateCcw size={16} /> Reactivate</>}
                  </button>
                </div>
              </div>

              <div className="timeline-body">
                {group.exhibits.map((exhibit, index) => (
                  <ExhibitRow 
                    key={exhibit.exhibitId}
                    exhibit={exhibit}
                    index={index}
                    isLast={index === group.exhibits.length - 1}
                    isTourActive={isTourActive}
                    onEdit={() => { setEditingExhibit(exhibit); setIsExhibitModalOpen(true); }}
                    onQR={() => handleViewQRCode(exhibit.exhibitId)}
                    onDelete={() => { if(window.confirm('Deactivate Exhibit?')) apiClient.delete(`/exhibits/${exhibit.exhibitId}`).then(fetchAdminData); }}
                  />
                ))}
                {group.exhibits.length === 0 && <p className="empty-msg">No exhibits added yet.</p>}
              </div>
            </div>
          );
        })}
      </div>

      {/* MODALS */}
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

      {/* REORDER MODAL RESTORED */}
      {isReorderModalOpen && (
        <Modal isOpen={isReorderModalOpen} onClose={() => setIsReorderModalOpen(false)} title="Reorder Exhibits">
          <div style={{ padding: '20px', maxHeight: '500px', overflowY: 'auto' }}>
            <p style={{ marginBottom: '20px', color: '#64748b' }}>
              Set the sequence number for each exhibit. Lower numbers appear first.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {reorderExhibits.map((exhibit) => {
                const primaryImage = exhibit.images[0];
                return (
                  <div key={exhibit.exhibitId} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#f8fafc' }}>
                    <img 
                      src={buildImageUrl(primaryImage?.fileUrl)} 
                      alt={exhibit.title} 
                      style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '6px' }}
                      loading="lazy"
                    />
                    <div style={{ flex: 1 }}>
                      <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>{exhibit.title}</h4>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <label style={{ fontSize: '13px', color: '#64748b' }}>Sequence:</label>
                      <input
                        type="number"
                        min="1"
                        value={exhibit.sequence}
                        onChange={(e) => handleSequenceChange(exhibit.exhibitId, parseInt(e.target.value) || 1)}
                        style={{ width: '70px', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
              <button onClick={() => setIsReorderModalOpen(false)} style={{ padding: '10px 20px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
              <button 
                onClick={handleSaveSequences} 
                disabled={isSavingOrder}
                style={{ padding: '10px 24px', background: isSavingOrder ? '#94a3b8' : '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
              >
                {isSavingOrder ? 'Saving...' : 'Apply & Save'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ManageExhibitions;