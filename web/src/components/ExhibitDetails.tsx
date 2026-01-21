import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import apiClient from "../utils/apiClient";
import {
  Play, Pause, ArrowLeft, Info, Headphones,
  Languages, BookOpen, RotateCcw, RotateCw, Volume2, VolumeX, Eye
} from "lucide-react";

import "../styles/exhibitDetails.css";
import "../styles/SmartExhibit.css"; 
import { useAuth } from "../contexts/AuthContext";
import { fetchExhibitRating, fetchExhibitReviews, submitExhibitReview } from "../utils/api";

const BACKEND_URL = import.meta.env.VITE_API_TARGET || "";
const DEFAULT_IMAGE_URL = `${BACKEND_URL}/public/images/Map.jpg`;

const ExhibitDetails: React.FC = () => {
  const { exhibitionId, id } = useParams<{ exhibitionId: string; id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  // --- YOUR STATE ---
  const [exhibit, setExhibit] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAudioId, setSelectedAudioId] = useState<string | null>(null);
  const [currentAudio, setCurrentAudio] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [activeWordIndex, setActiveWordIndex] = useState(-1);

  // --- REVIEWS STATE (From Development) ---
  const [rating, setRating] = useState<number>(0);
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewPage, setReviewPage] = useState(1);
  const [userRating, setUserRating] = useState<number>(0);
  const [userDescription, setUserDescription] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewSuccess, setReviewSuccess] = useState<string | null>(null);
  const [reviewsExpanded, setReviewsExpanded] = useState<boolean>(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  //Fetch Exhibit Data
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    apiClient.get(`/exhibits/${id}`)
      .then((res) => {
        setExhibit(res.data);
        const firstAudio = res.data.audio?.find((a: any) => a.fileUrl);
        if (firstAudio) setSelectedAudioId(firstAudio.audioId.toString());
      })
      .catch((err) => console.error('Error fetching exhibit:', err))
      .finally(() => setLoading(false));
  }, [id]);

  // ---  PROGRESS TRACKING LOGIC ---
  useEffect(() => {
    if (exhibit && id && exhibitionId) {
      const storageKey = `tour_progress_${exhibitionId}`;
      const rawProgress = localStorage.getItem(storageKey);
      const progress = rawProgress 
        ? JSON.parse(rawProgress) 
        : { completed: [], unlocked: [] };

      const currentId = parseInt(id, 10);
      if (!progress.completed.includes(currentId)) {
        progress.completed.push(currentId);
        localStorage.setItem(storageKey, JSON.stringify(progress));
      }
    }
  }, [exhibit, id, exhibitionId]);

  //Audio Logic
  useEffect(() => {
    if (!exhibit || !selectedAudioId) return;
    const newAudio = exhibit.audio.find((a: any) => a.audioId.toString() === selectedAudioId);
    setCurrentAudio(newAudio || null);
    setIsPlaying(false);

    if (audioRef.current && newAudio?.fileUrl) {
      const cleanUrl = newAudio.fileUrl.startsWith("/") ? newAudio.fileUrl : `/${newAudio.fileUrl}`;
      audioRef.current.src = `${BACKEND_URL}${cleanUrl.replace("/audios/", "/public/audios/")}`;
      audioRef.current.load();
    }
  }, [selectedAudioId, exhibit]);

  const handleTimeUpdate = useCallback(() => {
    if (!audioRef.current || !currentAudio) return;
    const time = audioRef.current.currentTime;
    setCurrentTime(time);
    const transcript = currentAudio.subtitles?.[0]?.text;
    if (Array.isArray(transcript)) {
      const idx = transcript.findIndex((w: any) => time >= w.start && time < (w.end || w.start + 0.5));
      if (idx !== -1 && idx !== activeWordIndex) setActiveWordIndex(idx);
    }
  }, [currentAudio, activeWordIndex]);

  // --- REVIEWS LOGIC (From Development - Owen Part) ---
  useEffect(() => {
    if (!id) return;
    const loadReviews = async () => {
      try {
        const avg = await fetchExhibitRating(id);
        setRating(Number(avg) || 0);
        const res = await fetchExhibitReviews(id, { page: reviewPage, limit: 5 });
        if (res && Array.isArray(res.reviews)) setReviews(res.reviews);
      } catch (err) { console.error('Failed to load reviews:', err); }
    };
    loadReviews();
  }, [id, reviewPage]);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !user) return;
    setSubmitting(true);
    try {
      await submitExhibitReview(id, userRating, userDescription || null, user.userId);
      setReviewSuccess('Review submitted successfully.');
      setUserRating(0); setUserDescription(''); setReviewPage(1);
      const avg = await fetchExhibitRating(id); setRating(Number(avg) || 0);
    } catch (error: any) { setReviewError('Failed to submit review'); }
    finally { setSubmitting(false); }
  };

  const getImageUrl = (url: string | null) => {
    if (!url) return DEFAULT_IMAGE_URL;
    return url.includes('/images/') ? `${BACKEND_URL}/public/images/${url.split('/images/')[1]}` : DEFAULT_IMAGE_URL;
  };

  if (loading) return <div className="loading-screen">Loading...</div>;
  if (!exhibit) return <div className="error-screen">Exhibit not found.</div>;

  return (
    <div className="exhibit-page-wrapper">
      <audio ref={audioRef} onTimeUpdate={handleTimeUpdate} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)} />

      <nav className="exhibit-nav">
        <button onClick={() => navigate(`/exhibitions/${exhibitionId}/tour`)} className="nav-back">
          <ArrowLeft size={18} /> <span>Back to Tour</span>
        </button>
        <div className="nav-title">{exhibit.title}</div>
        <div style={{width: '60px'}}></div>
      </nav>

      <main className="exhibit-main-container">
        <div className="exhibit-grid">
          {/*  IMAGE & INFO COLUMN */}
          <div className="info-column">
            <div className="image-container-full">
                <img src={getImageUrl(exhibit.images.find((img: any) => img.isPrimary)?.fileUrl || exhibit.images[0]?.fileUrl)} alt={exhibit.title} />
            </div>
            <div className="section-card">
              <div className="card-header"><Info size={20} /><h3>Description</h3></div>
              <p className="description-text">{exhibit.description}</p>
            </div>
            {exhibit.additionalDescription && (
              <div className="section-card no-margin">
                <div className="card-header"><BookOpen size={20} /><h3>Context & History</h3></div>
                <div className="additional-description-box">
                  <p className="description-text">{exhibit.additionalDescription}</p>
                </div>
              </div>
            )}
          </div>

          {/*  AUDIO COLUMN */}
          <div className="audio-column">
            <div className="audio-card matched-height">
              <div className="audio-header">
                <div className="header-left"><Headphones size={18} /><span>Audio Guide</span></div>
                {exhibit.audio?.length > 0 && (
                  <div className="lang-selector">
                    <Languages size={14} />
                    <select value={selectedAudioId || ''} onChange={(e) => setSelectedAudioId(e.target.value)}>
                      {exhibit.audio.map((a: any) => <option key={a.audioId} value={a.audioId}>{a.language?.title || 'Language'}</option>)}
                    </select>
                  </div>
                )}
              </div>

              {exhibit.audio?.length > 0 ? (
                <>
                  <div className="transcript-area">
                    {currentAudio?.subtitles?.[0]?.text.map((word: any, idx: number) => (
                      <span key={idx} className={`word ${activeWordIndex === idx ? 'active' : ''}`}>{word.word}{' '}</span>
                    ))}
                  </div>
                  <div className="player-footer">
                    <div className="progress-section">
                        <input type="range" max={duration} value={currentTime} className="seek-bar" onChange={(e) => audioRef.current && (audioRef.current.currentTime = parseFloat(e.target.value))} />
                        <div className="time-display"><span>{Math.floor(currentTime)}s</span><span>{Math.floor(duration)}s</span></div>
                    </div>
                    <div className="controls-section">
                        <div className="playback-btns">
                            <button onClick={() => audioRef.current && (audioRef.current.currentTime -= 10)} className="btn-skip"><RotateCcw size={18} /></button>
                            <button onClick={() => isPlaying ? audioRef.current?.pause() : audioRef.current?.play()} className="btn-play">
                                {isPlaying ? <Pause fill="white" size={20} /> : <Play fill="white" size={20} />}
                            </button>
                            <button onClick={() => audioRef.current && (audioRef.current.currentTime += 10)} className="btn-skip"><RotateCw size={18} /></button>
                        </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="no-audio-message"><VolumeX size={48} color="#cbd5e1" /><h3>No Audio Available</h3></div>
              )}
            </div>
          </div>
        </div>

        {/* --- REVIEWS SECTION (From Development - Owen Part) --- */}
        <div className="reviews-integration-container" style={{ marginTop: '40px', padding: '20px', borderTop: '1px solid #eee' }}>
            <div className="exhibit-rating" style={{ textAlign: 'center', marginBottom: '20px' }}>
                {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i} style={{ color: i < rating ? '#FFD700' : '#ccc', fontSize: '1.5em' }}>★</span>
                ))}
                <span style={{ marginLeft: 8 }}>{rating ? rating.toFixed(1) : '—'} / 5</span>
            </div>

            <div className="review-form-box" style={{ maxWidth: '500px', margin: '0 auto' }}>
                <form onSubmit={handleReviewSubmit}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '5px', marginBottom: '10px' }}>
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button key={star} type="button" onClick={() => setUserRating(star)} style={{ fontSize: '24px', background: 'none', border: 'none', cursor: 'pointer', color: userRating >= star ? '#FFD700' : '#ccc' }}>★</button>
                        ))}
                    </div>
                    <textarea value={userDescription} onChange={(e) => setUserDescription(e.target.value)} placeholder="Write a review..." style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }} />
                    <button type="submit" disabled={submitting || userRating === 0} style={{ width: '100%', marginTop: '10px', padding: '10px', background: '#007bff', color: 'white', border: 'none', borderRadius: '8px' }}>
                        {submitting ? 'Submitting...' : 'Submit Review'}
                    </button>
                </form>
            </div>
            
            <button onClick={() => setReviewsExpanded(!reviewsExpanded)} style={{ display: 'block', margin: '20px auto', background: 'none', border: 'none', color: '#007bff', cursor: 'pointer' }}>
                {reviewsExpanded ? 'Hide Reviews' : `Show Reviews (${reviews.length})`}
            </button>

            {reviewsExpanded && (
                <div className="reviews-list" style={{ maxWidth: '600px', margin: '0 auto' }}>
                    {reviews.map((r, i) => (
                        <div key={i} style={{ padding: '10px', borderBottom: '1px solid #eee' }}>
                            <div style={{ color: '#FFD700' }}>{'★'.repeat(r.rating)}</div>
                            <p>{r.comment}</p>
                            <small style={{ color: '#888' }}>— {r.user?.username || 'Visitor'}</small>
                        </div>
                    ))}
                </div>
            )}
        </div>
      </main>
    </div>
  );
};

export default ExhibitDetails;