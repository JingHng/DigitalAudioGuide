import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  LogOut, 
  CheckCircle2, 
  Lock, 
  MapPin, 
  PlayCircle, 
  RotateCcw 
} from 'lucide-react';
import apiClient from '../utils/apiClient';
import '../styles/TourView.css';

interface Exhibit {
  id: number;
  name: string;
  description: string;
  mainImage: string;
  sequence: number;
}

const BACKEND_URL = import.meta.env.VITE_API_TARGET || "";
const DEFAULT_IMAGE_URL = `${BACKEND_URL}/public/images/Map.jpg`;

const getImageUrl = (fileUrl: string): string => {
  if (!fileUrl) return DEFAULT_IMAGE_URL;
  const cleaned = fileUrl.replace(/\\/g, '/');
  const parts = cleaned.split('/images/');
  return parts.length > 1 ? `${BACKEND_URL}/public/images/${parts[1]}` : DEFAULT_IMAGE_URL;
};

const TourView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [exhibition, setExhibition] = useState<{ title: string } | null>(null);
  const [exhibits, setExhibits] = useState<Exhibit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  // 1. Fetch Tour Data
  useEffect(() => {
    const fetchTour = async () => {
      setIsLoading(true);
      try {
        const response = await apiClient.get(`/exhibitions/${id}/tour`);
        const data = response.data;
        setExhibition(data);

        const mappedExhibits: Exhibit[] = (data.exhibits || []).map((e: any) => ({
          id: typeof e.exhibitId === 'string' ? parseInt(e.exhibitId, 10) : e.exhibitId,
          name: e.title,
          description: e.description,
          mainImage: e.images && e.images.length > 0 ? e.images[0].fileUrl : '',
          sequence: e.sequence
        }));
        
        setExhibits(mappedExhibits.sort((a, b) => a.sequence - b.sequence));
      } catch (err: any) {
        setError(err.message || 'Failed to fetch tour');
      } finally {
        setIsLoading(false);
      }
    };
    fetchTour();
  }, [id]);

  // 2. STATUS HELPER
  const getExhibitStatus = (exhibitId: number) => {
    const storageKey = `tour_progress_${id}`;
    const progress = JSON.parse(localStorage.getItem(storageKey) || '{"completed":[], "unlocked":[]}');
    
    const completed = progress.completed || [];

    // Rule 1: Always unlocked if already completed
    if (completed.includes(exhibitId)) return 'completed';

    // Rule 2: First exhibit in sequence is always unlocked
    if (exhibits.length > 0 && exhibits[0].id === exhibitId) return 'unlocked';

    // Rule 3: Unlock if the PREVIOUS exhibit in the sequence is completed
    const currentIdx = exhibits.findIndex(e => e.id === exhibitId);
    if (currentIdx > 0) {
        const prevExhibit = exhibits[currentIdx - 1];
        if (completed.includes(prevExhibit.id)) return 'unlocked';
    }

    return 'locked';
  };

  // 3. AUTO-SCROLL TO PROGRESS
  useEffect(() => {
    if (!isLoading && exhibits.length > 0) {
      const firstUnlockedIndex = exhibits.findIndex(e => getExhibitStatus(e.id) === 'unlocked');
      const targetIndex = firstUnlockedIndex >= 0 ? firstUnlockedIndex : 0;
      
      if (itemRefs.current[targetIndex]) {
        setTimeout(() => {
          itemRefs.current[targetIndex]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 500);
      }
    }
  }, [isLoading, exhibits]);

  const handleReset = () => {
    if (window.confirm('Reset all progress for this tour?')) {
      localStorage.removeItem(`tour_progress_${id}`);
      window.location.reload();
    }
  };

  const completedCount = exhibits.filter(e => getExhibitStatus(e.id) === 'completed').length;
  const progressPercent = Math.round((completedCount / (exhibits.length || 1)) * 100);

  if (isLoading) return <div className="loading-state">Loading Tour Roadmap...</div>;
  if (error) return <div className="error-state">{error}</div>;

  return (
    <div className="roadmap-container">
      <header className="roadmap-header">
        <div className="header-inner">
          <div className="header-left">
            <h1 className="header-title">{exhibition?.title || 'Museum Tour'}</h1>
            <div className="progress-pill">
              <div 
                className="progress-circle" 
                style={{ background: `conic-gradient(#3b82f6 ${progressPercent}%, #e2e8f0 0)` }} 
              />
              <span>{progressPercent}% Complete</span>
            </div>
          </div>

          <div className="header-right">
            <button onClick={() => navigate('/exhibitions')} className="header-action-btn">
              <LogOut size={18} /> Exit Tour
            </button>
            <button onClick={handleReset} className="reset-icon-btn" title="Clear Progress">
              <RotateCcw size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="roadmap-timeline">
        {exhibits.map((exhibit, index) => {
          const status = getExhibitStatus(exhibit.id);
          const isLocked = status === 'locked';
          const isCurrent = status === 'unlocked';
          const isCompleted = status === 'completed';

          return (
            <div 
              key={exhibit.id} 
              className={`timeline-row ${status}`} 
              ref={(el) => { itemRefs.current[index] = el; }}
            >
              <div className="timeline-track">
                <div className={`timeline-dot ${status}`}>
                  {isCompleted ? <CheckCircle2 size={20} /> : isCurrent ? <MapPin size={22} /> : <Lock size={16} />}
                </div>
                {index !== exhibits.length - 1 && (
                  <div className={`timeline-line ${isCompleted ? 'filled' : ''}`} />
                )}
              </div>

              <motion.div 
                className={`timeline-content ${status}`}
                initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
              >
                <div 
                  className="content-card" 
                  onClick={() => !isLocked && navigate(`/exhibitions/${id}/exhibit/${exhibit.id}`)}
                >
                  <div className="card-media">
                    <img src={getImageUrl(exhibit.mainImage)} alt={exhibit.name} loading="lazy" />
                    {isLocked && <div className="media-overlay"><Lock size={32} /></div>}
                  </div>
                  <div className="card-body">
                    <div className="card-meta">
                      <span className="step-label">STOP {index + 1}</span>
                      {isCurrent && <span className="current-badge">Next Stop</span>}
                      {isCompleted && <span className="completed-badge">Visited</span>}
                    </div>
                    <h3 className="card-name">{exhibit.name}</h3>
                    <p className="card-description">
                      {isLocked ? "Complete previous stops to unlock this exhibit." : exhibit.description}
                    </p>
                    {!isLocked && (
                      <button className={`card-btn ${isCurrent ? 'primary' : 'secondary'}`}>
                        {isCurrent ? <><PlayCircle size={18} /> Start Exploring</> : 'Review Stop'}
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          );
        })}
      </main>
    </div>
  );
};

export default TourView;