import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import apiClient from "../utils/apiClient";
import {
  Play, Pause, ArrowLeft, RotateCcw, RotateCw, Share2, Info, Globe
} from "lucide-react";

import "./css/ExhibitDetails.css";
import { useAuth } from "../contexts/AuthContext";
import { fetchExhibitRating, fetchExhibitReviews, submitExhibitReview } from "../utils/api";

const BACKEND_URL = import.meta.env.VITE_API_TARGET || "";
const DEFAULT_IMAGE_URL = `${BACKEND_URL}/public/images/Map.jpg`;

const ExhibitDetails: React.FC = () => {
  const { exhibitionId, id } = useParams<{ exhibitionId: string; id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Core Exhibit State
  const [exhibit, setExhibit] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showDesc, setShowDesc] = useState(false);
  
  // Audio & Language State
  const [selectedAudioId, setSelectedAudioId] = useState<string | null>(null);
  const [currentAudio, setCurrentAudio] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [activeWordIndex, setActiveWordIndex] = useState(-1);

  // Reviews & Rating State
  const [rating, setRating] = useState<number>(0);
  const [reviews, setReviews] = useState<any[]>([]);
  const [userRating, setUserRating] = useState<number>(0);
  const [userDescription, setUserDescription] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 1. Fetch Exhibit Data
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    apiClient.get(`/exhibits/${id}`)
      .then((res) => {
        setExhibit(res.data);
        const firstAudio = res.data.audio?.find((a: any) => a.fileUrl);
        if (firstAudio) setSelectedAudioId(firstAudio.audioId.toString());
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [id]);

  // 2. Handle Tour Progress 
  useEffect(() => {
    if (exhibit && id && exhibitionId) {
      const storageKey = `tour_progress_${exhibitionId}`;
      const rawProgress = localStorage.getItem(storageKey);
      const progress = rawProgress ? JSON.parse(rawProgress) : { completed: [], unlocked: [] };
      const currentId = parseInt(id, 10);
      if (!progress.completed.includes(currentId)) {
        progress.completed.push(currentId);
        localStorage.setItem(storageKey, JSON.stringify(progress));
      }
    }
  }, [exhibit, id, exhibitionId]);

  // 3. Audio & Transcript Switching Logic
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

  // 4. Word Highlighting (No Auto-Scroll)
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

  // 5. Load Ratings and Reviews
  useEffect(() => {
    if (!id) return;
    fetchExhibitRating(id).then(res => setRating(Number(res) || 0));
    fetchExhibitReviews(id, { page: 1, limit: 10 }).then(res => res?.reviews && setReviews(res.reviews));
  }, [id]);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !user) return;
    setSubmitting(true);
    try {
      await submitExhibitReview(id, userRating, userDescription || null, user.userId);
      setUserRating(0); setUserDescription('');
      const freshReviews = await fetchExhibitReviews(id, { page: 1, limit: 10 });
      if (freshReviews?.reviews) setReviews(freshReviews.reviews);
      const avg = await fetchExhibitRating(id); setRating(Number(avg) || 0);
    } catch (err) { console.error(err); }
    finally { setSubmitting(false); }
  };

  const getImageUrl = (url: string | null) => {
    if (!url) return DEFAULT_IMAGE_URL;
    return url.includes('/images/') ? `${BACKEND_URL}/public/images/${url.split('/images/')[1]}` : DEFAULT_IMAGE_URL;
  };

  if (loading) return <div className="loading-minimal" />;

  return (
    <div className="aesthetic-page">
      <audio ref={audioRef} onTimeUpdate={handleTimeUpdate} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)} />

      <nav className="aesthetic-nav">
        <button onClick={() => navigate(-1)} className="nav-icon-btn"><ArrowLeft size={20} /></button>
        <div className="nav-actions">
          {/* DYNAMIC LANGUAGE DROPDOWN */}
          {exhibit?.audio?.length > 1 && (
            <div className="lang-pill">
              <Globe size={16} />
              <select value={selectedAudioId || ''} onChange={(e) => setSelectedAudioId(e.target.value)}>
                {exhibit.audio.map((a: any) => (
                  <option key={a.audioId} value={a.audioId}>{a.language?.title || 'Language'}</option>
                ))}
              </select>
            </div>
          )}
          
          <div className="info-popover-container" onMouseEnter={() => setShowDesc(true)} onMouseLeave={() => setShowDesc(false)}>
            <button className="nav-icon-btn"><Info size={20} /></button>
            <AnimatePresence>
              {showDesc && (
                <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="description-popup">
                  <p>{exhibit.description}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button className="nav-icon-btn"><Share2 size={20} /></button>
        </div>
      </nav>

      <main className="immersive-container">
        {/* CENTERED HEADER */}
        <div className="header-block centered">
          <h1>{exhibit.title}</h1>
          <div className="meta-row">
            <span className="rating-pill">★ {rating.toFixed(1)}</span>
            <span className="dot">•</span>
            <span className="author">Museum Exhibit</span>
          </div>
        </div>

        {/* MEDIA INTERACTION ROW */}
        <div className="media-interaction-row">
          <div className="media-hero-box">
            <img src={getImageUrl(exhibit.images[0]?.fileUrl)} alt={exhibit.title} />
          </div>

          <div className="guide-box">
            <div className="transcript-scroll-area no-cloud">
              {currentAudio?.subtitles?.[0]?.text.map((word: any, idx: number) => (
                <span key={idx} className={`word-fade ${activeWordIndex === idx ? 'active' : ''}`}>
                  {word.word}{' '}
                </span>
              ))}
            </div>

            <div className="player-controls-bottom">
              <div className="progress-minimal">
                <div className="progress-fill" style={{ width: `${(currentTime / duration) * 100}%` }}></div>
              </div>
              <div className="buttons-minimal">
                <button onClick={() => audioRef.current && (audioRef.current.currentTime -= 10)}><RotateCcw size={18} /></button>
                <button className="play-toggle" onClick={() => isPlaying ? audioRef.current?.pause() : audioRef.current?.play()}>
                  {isPlaying ? <Pause size={20} fill="black" /> : <Play size={20} fill="black" style={{ marginLeft: '2px' }} />}
                </button>
                <button onClick={() => audioRef.current && (audioRef.current.currentTime += 10)}><RotateCw size={18} /></button>
              </div>
            </div>
          </div>
        </div>

        {/* CENTERED REVIEWS AREA */}
        <div className="lower-content-area centered">
          <h3>Visitor Thoughts</h3>
          
          {user ? (
            <form className="clean-input-form centralized-form" onSubmit={handleReviewSubmit}>
              <div className="star-input">
                {[1,2,3,4,5].map(s => (
                  <button key={s} type="button" onClick={() => setUserRating(s)} className={userRating >= s ? 'active' : ''}>★</button>
                ))}
              </div>
              <input type="text" placeholder="Add a comment..." value={userDescription} onChange={(e) => setUserDescription(e.target.value)} />
              <button type="submit" disabled={!userRating || submitting} className="send-btn">Post</button>
            </form>
          ) : (
            <div className="login-prompt-box">
              <p>Login now to leave a review!</p>
              <button onClick={() => navigate('/login')} className="login-link-btn">Login</button>
            </div>
          )}

          <div className="reviews-stack-central">
            {reviews.length > 0 ? (
              reviews.map((r, i) => (
                <div key={i} className="mini-review-centered">
                  <div className="stars">{'★'.repeat(r.rating)}</div>
                  <p>{r.comment}</p>
                  <span className="user">— {r.user?.username || 'Visitor'}</span>
                </div>
              ))
            ) : (
              user && <div className="empty-reviews">No reviews yet! Leave one login and leave one now!</div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ExhibitDetails;