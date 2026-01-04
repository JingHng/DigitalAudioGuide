import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link as RouterLink } from "react-router-dom";
import apiClient from "../utils/apiClient";
import { fetchExhibitRating, fetchExhibitReviews, submitExhibitReview } from "../utils/api";
import {
  Play,
  Pause,
  Volume2,
  Languages,
  ChevronLeft,
  ChevronRight,
  Headphones,
  Eye,
  ArrowLeft
} from "lucide-react";

import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay, EffectFade } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "swiper/css/effect-fade";
import "./ExhibitDetails.minimal.css";

import "../styles/SmartExhibit.css";
import EarnBadgeModal from "./earnBadgeModal";
import audioLogService from "../services/audioLogService";
import { useAuth } from "../contexts/AuthContext";

// --- Constants & Types  ---
const BACKEND_URL = import.meta.env.VITE_API_TARGET || "";
const DEFAULT_IMAGE_URL = `${BACKEND_URL}/public/images/Map.jpg`;

interface Word {
  word: string;
  start: number;
  end: number;
}
interface Subtitle {
  text: Word[];
}
interface Image {
  imageId: string;
  fileUrl: string | null;
  title: string | null;
  isPrimary?: boolean;
}
interface LanguageInfo {
  languageId: string;
  title: string;
}

interface AudioTrack {
  audioId: string;
  fileUrl: string | null;
  title: string | null;
  description: string | null;
  language: LanguageInfo | null;
  subtitles: Subtitle[];
}

interface Exhibit {
  exhibitId: string;
  title: string;
  description: string;
  additionalDescription?: string;
  images: Image[];
  audio: AudioTrack[];
}

const ExhibitDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  // --- Review system state ---
  const [rating, setRating] = useState<number>(0);
  const [reviews, setReviews] = useState<any[]>([]);
  const [userRating, setUserRating] = useState<number>(0);
  const [userDescription, setUserDescription] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewSuccess, setReviewSuccess] = useState<string | null>(null);

  // State management
  // Use authentication context to get current user
  const { user } = useAuth();
  const [exhibit, setExhibit] = useState<Exhibit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Badge modal states
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [badgeAssigned, setBadgeAssigned] = useState(false);
  const [badgeImageUrl, setBadgeImageUrl] = useState<string | undefined>(undefined);

  // Audio states
  const [selectedAudioId, setSelectedAudioId] = useState<string | null>(null);
  const [currentAudio, setCurrentAudio] = useState<AudioTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [activeWordIndex, setActiveWordIndex] = useState(-1);
  
  // Audio logging states
  const [currentPlaybackLogId, setCurrentPlaybackLogId] = useState<number | null>(null);
  const [playbackStartTime, setPlaybackStartTime] = useState<number>(0);

  // Image gallery states
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showImageGallery, setShowImageGallery] = useState(false);
  
  // TTS states
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [sentences, setSentences] = useState<string[]>([]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const activeWordRef = useRef<HTMLSpanElement | null>(null);

  // Load exhibit details
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    apiClient
      .get(`/exhibits/${id}`)
      .then((res) => {
        const data: Exhibit = res.data;
        setExhibit(data);
        const firstAvailableAudio = data.audio.find((a) => a.fileUrl);
        if (firstAvailableAudio) {
          setSelectedAudioId(firstAvailableAudio.audioId.toString());
        }
      })
      .catch(() => setError("Could not load exhibit information."))
      .finally(() => setLoading(false));
  }, [id]);

  // Fetch rating and reviews
  useEffect(() => {
    if (!id) return;
    fetchExhibitRating(id)
      .then(setRating)
      .catch((err) => {
        let backendMsg = "Failed to fetch exhibit rating.";
        if (err?.response?.data?.message) {
          backendMsg = err.response.data.message;
        } else if (err?.message) {
          backendMsg = err.message;
        }
        setRating(0);
        console.error("Fetch exhibit rating error:", err);
      });
    fetchExhibitReviews(id)
      .then(setReviews)
      .catch((err) => {
        let backendMsg = "Failed to fetch exhibit reviews.";
        if (err?.response?.data?.message) {
          backendMsg = err.response.data.message;
        } else if (err?.message) {
          backendMsg = err.message;
        }
        setReviews([]);
        console.error("Fetch exhibit reviews error:", err);
      });
  }, [id, reviewSuccess]);

  // Handle review submission
  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setReviewError(null);
    setReviewSuccess(null);
    try {
      if (!user || !user.userId) {
        setReviewError("You must be logged in to submit a review.");
        setSubmitting(false);
        return;
      }
      await submitExhibitReview(id!, userRating, userDescription, user.userId);
      setReviewSuccess("Review submitted!");
      setUserRating(0);
      setUserDescription('');
    } catch (err: any) {
      // Try to extract backend error message if available
      let backendMsg = "Failed to submit review.";
      if (err?.response?.data?.message) {
        backendMsg = err.response.data.message;
      } else if (err?.message) {
        backendMsg = err.message;
      }
      setReviewError(backendMsg);
      // Optionally log full error for debugging
      console.error("Review submission error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle audio selection changes & set audio src
  useEffect(() => {
    console.log("Audio selection changed:", {
      selectedAudioId,
      exhibit: exhibit?.title,
    });
    console.log("BACKEND_URL value:", BACKEND_URL);
    if (!exhibit || !selectedAudioId) {
      console.log("No exhibit or audio ID, clearing current audio");
      setCurrentAudio(null);
      return;
    }
    const newAudio = exhibit.audio.find(
      (a) => a.audioId.toString() === selectedAudioId
    );
    console.log(
      "Found audio:",
      newAudio?.title,
      "with subtitles:",
      newAudio?.subtitles?.length
    );
    console.log("Audio fileUrl from database:", newAudio?.fileUrl);
    setCurrentAudio(newAudio || null);
    setIsPlaying(false);
    setCurrentTime(0);
    setActiveWordIndex(-1);
    setDuration(0);

    if (audioRef.current && newAudio?.fileUrl) {
      // Ensure fileUrl starts with a slash for proper URL construction
      let cleanFileUrl = newAudio.fileUrl.startsWith("/")
        ? newAudio.fileUrl
        : `/${newAudio.fileUrl}`;
      // Convert /audios/ paths to /public/audios/ for correct static file serving
      if (cleanFileUrl.startsWith("/audios/")) {
        cleanFileUrl = cleanFileUrl.replace("/audios/", "/public/audios/");
      }
      const audioSrc = `${BACKEND_URL}${cleanFileUrl}`;
      console.log("Final audio source URL:", audioSrc);
      audioRef.current.src = audioSrc;
      audioRef.current.load();
    } else if (audioRef.current) {
      console.log("No audio file URL, clearing source");
      audioRef.current.removeAttribute("src");
    }
  }, [selectedAudioId, exhibit]);

  // Auto scroll transcript following active word
  useEffect(() => {
    if (activeWordRef.current) {
      activeWordRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [activeWordIndex]); // CHANGE: Remove audio logging cleanup

  // Cleanup audio logging when component unmounts or audio changes
  useEffect(() => {
    // Handle page unload/navigation away
    const handleBeforeUnload = () => {
      if (currentPlaybackLogId && user && audioRef.current) {
        const durationListened = Math.round(audioRef.current.currentTime - playbackStartTime);
        // Use sendBeacon for page unload to ensure it completes
        audioLogService.forceEndPlayback(currentPlaybackLogId, durationListened);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (currentPlaybackLogId && user && audioRef.current) {
        // End the current playback log if component unmounts
        const durationListened = Math.round(audioRef.current.currentTime - playbackStartTime);
        audioLogService.endPlayback(currentPlaybackLogId, durationListened)
          .catch((error: any) => console.error('Failed to cleanup audio log:', error));
      }
    };
  }, [currentPlaybackLogId, user, playbackStartTime]);

  // Reset logging state when audio track changes
  useEffect(() => {
    if (currentPlaybackLogId && user && audioRef.current) {
      // End previous audio log if switching tracks
      const durationListened = Math.round(audioRef.current.currentTime - playbackStartTime);
      audioLogService.endPlayback(currentPlaybackLogId, durationListened)
        .catch((error: any) => console.error('Failed to end previous audio log:', error));
    }
    setCurrentPlaybackLogId(null);
    setPlaybackStartTime(0);
  }, [currentAudio?.audioId]);

  // Call backend: /badges/assignBadges
  const assignBadge = async (exhibitId: string | undefined) => {
    if (!exhibitId) return;

    try {
      const res = await apiClient.post(`/badges/assignBadges/${exhibitId}`);

      const { message, image_url } = res.data || {};

      // Have already got this badge, do not show modal
      if (message === "Badge already claimed") {
        console.log("User already has this badge, not showing modal.");
        setBadgeAssigned(true);
        setShowBadgeModal(false);
        setBadgeImageUrl(undefined);
        return;
      }

      // Earned new badge, show modal
      if (image_url) {
        const fullUrl = image_url.startsWith("http")
          ? image_url
          : `${BACKEND_URL}/public${image_url}`;

        setBadgeImageUrl(fullUrl);
      } else {
        setBadgeImageUrl(undefined);
      }

      setShowBadgeModal(true);
    } catch (error: any) {
      console.error("Failed to assign badge:", error);

      const backendMsg = error?.response?.data?.message;
      if (backendMsg === "Badge already claimed") {
        console.log("User already has this badge (from error response), not showing modal.");
        setBadgeAssigned(true);
        setShowBadgeModal(false);
        setBadgeImageUrl(undefined);
        return;
      }

      setBadgeAssigned(false);
    }
  };

  // Listen for scrolling and trigger `assignBadge` when the scroller reaches the bottom
  useEffect(() => {
    const handleScroll = () => {
      if (!exhibit || badgeAssigned || !id) return;

      const scrollTop = window.scrollY;
      const windowHeight = window.innerHeight;
      const docHeight = document.documentElement.scrollHeight;

      const reachedBottom = scrollTop + windowHeight >= docHeight - 40;

      if (reachedBottom) {
        setBadgeAssigned(true); // prevent multiple triggers
        assignBadge(id);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [exhibit, badgeAssigned, id]);

  // Process transcript for current audio
  useEffect(() => {
    const transcript = currentAudio?.subtitles?.[0]?.text;
    let transcriptArray: Word[] = [];
    if (transcript) {
      if (Array.isArray(transcript)) {
        transcriptArray = transcript;
      } else if (typeof transcript === 'string') {
        try {
          const parsed = JSON.parse(transcript);
          transcriptArray = Array.isArray(parsed) ? parsed : [];
        } catch (error) {
          console.error('Error parsing transcript JSON:', error);
          transcriptArray = [];
        }
      }
    }
    
    // Convert words to sentences based on punctuation for display
    if (transcriptArray.length > 0) {
      const fullText = transcriptArray.map(word => word.word).join(' ');
      const sentenceArray = fullText.split(/[.!?]+/).filter(s => s.trim().length > 0);
      setSentences(sentenceArray.map(s => s.trim()));
    } else {
      setSentences([]);
    }
  }, [currentAudio]);

  // Reset TTS state when audio changes
  useEffect(() => {
    setActiveWordIndex(-1);
    setCurrentSentenceIndex(0);
    setCurrentTime(0);
  }, [currentAudio?.audioId]);

  const handleTimeUpdate = useCallback(() => {
    if (!audioRef.current) return;
    const time = audioRef.current.currentTime;
    setCurrentTime(time);
    
    // Find current word based on audio timing
    const transcript = currentAudio?.subtitles?.[0]?.text;
    let transcriptArray: Word[] = [];
    if (transcript) {
      if (Array.isArray(transcript)) {
        transcriptArray = transcript;
      } else if (typeof transcript === 'string') {
        try {
          const parsed = JSON.parse(transcript);
          transcriptArray = Array.isArray(parsed) ? parsed : [];
        } catch (error) {
          transcriptArray = [];
        }
      }
    }
    
    if (transcriptArray.length > 0) {
      // Find current word index
      const currentWordIndex = transcriptArray.findIndex((word) => {
        const startTime = word.start || 0;
        const endTime = word.end || word.start + 0.5;
        return time >= startTime && time < endTime;
      });
      
      if (currentWordIndex !== -1 && currentWordIndex !== activeWordIndex) {
        setActiveWordIndex(currentWordIndex);
        
        // Find which sentence this word belongs to
        const wordsUpToCurrent = transcriptArray.slice(0, currentWordIndex + 1);
        const textUpToCurrent = wordsUpToCurrent.map(w => w.word).join(' ');
        const sentenceMatches = textUpToCurrent.match(/[.!?]/g);
        const currentSentIdx = sentenceMatches ? sentenceMatches.length : 0;
        
        if (currentSentIdx < sentences.length && currentSentIdx !== currentSentenceIndex) {
          setCurrentSentenceIndex(currentSentIdx);
        }
      }
    }
  }, [currentAudio, activeWordIndex, sentences, currentSentenceIndex]);

  const handlePlayPause = () => {
    if (!currentAudio?.fileUrl || !audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch((e) => {
        console.error("Audio play failed:", e);
      });
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) audioRef.current.volume = newVolume;
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (audioRef.current) audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // Helper functions
  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getImageUrl = (fileUrl: string): string => {
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

  // Early returns
  if (loading)
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading SmartExhibit Experience...</p>
      </div>
    );
  if (error) return <div className="error-container">{error}</div>;
  if (!exhibit) return <div className="error-container">Exhibit not found.</div>;

  const availableAudio = exhibit.audio.filter((a) => a.fileUrl);
  const hasAudioContent = availableAudio.length > 0;
  // Separate primary and additional images
  const validImages = exhibit.images.filter((img) => img.fileUrl);
  const primaryImages = validImages.filter((img) => img.isPrimary);
  const additionalImages = validImages.filter((img) => !img.isPrimary);
  const displayImages = primaryImages.length > 0 ? primaryImages : validImages.slice(0, 1); // Fallback to first image if no primary

  return (
    <div className="smart-exhibit-home">
      {/* --- Exhibit Rating --- */}
      <div className="exhibit-rating" style={{ margin: '16px 0 8px 0', textAlign: 'center' }}>
        <span>
          {Array.from({ length: 5 }).map((_, i) => (
            <span key={i} style={{ color: i < rating ? '#FFD700' : '#ccc', fontSize: '1.5em' }}>★</span>
          ))}
          <span style={{ marginLeft: 8, fontSize: '1.1em', color: '#555' }}>
            {rating ? rating.toFixed(1) : '—'} / 5
          </span>
        </span>
      </div>

      {/* --- Review Submission Form --- */}
      <div className="exhibit-review-form" style={{ margin: '16px auto', maxWidth: 400, background: '#f9f9f9', padding: 16, borderRadius: 8 }}>
        <h3 style={{ marginBottom: 8 }}>Submit a Review</h3>
        <form onSubmit={handleReviewSubmit}>
          <div style={{ marginBottom: 8 }}>
            <label>Rating: </label>
            {Array.from({ length: 5 }).map((_, i) => (
              <span
                key={i}
                style={{ cursor: 'pointer', color: i < userRating ? '#FFD700' : '#ccc', fontSize: '1.3em' }}
                onClick={() => setUserRating(i + 1)}
                data-testid={`star-${i + 1}`}
              >★</span>
            ))}
          </div>
          <div style={{ marginBottom: 8 }}>
            <textarea
              placeholder="Optional description..."
              value={userDescription}
              onChange={e => setUserDescription(e.target.value)}
              rows={3}
              style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ddd' }}
            />
          </div>
          <button type="submit" disabled={submitting || userRating === 0} style={{ padding: '8px 16px', borderRadius: 4, background: '#007bff', color: '#fff', border: 'none' }}>
            {submitting ? 'Submitting...' : 'Submit Review'}
          </button>
          {reviewError && <div style={{ color: 'red', marginTop: 8 }}>{reviewError}</div>}
          {reviewSuccess && <div style={{ color: 'green', marginTop: 8 }}>{reviewSuccess}</div>}
        </form>
      </div>

      {/* --- Review List --- */}
      <div className="exhibit-review-list" style={{ margin: '24px auto', maxWidth: 600 }}>
        <h3 style={{ marginBottom: 8 }}>Reviews</h3>
        {reviews.length === 0 ? (
          <div style={{ color: '#888', fontStyle: 'italic' }}>No reviews yet.</div>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {reviews.map((review, idx) => (
              <li key={idx} style={{ marginBottom: 16, padding: 12, background: '#fff', borderRadius: 6, boxShadow: '0 1px 4px #eee' }}>
                <div>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i} style={{ color: i < review.rating ? '#FFD700' : '#ccc', fontSize: '1.1em' }}>★</span>
                  ))}
                  <span style={{ marginLeft: 8, color: '#555', fontSize: '0.95em' }}>{review.rating} / 5</span>
                </div>
                {review.description && <div style={{ marginTop: 4 }}>{review.description}</div>}
                <div style={{ fontSize: '0.85em', color: '#aaa', marginTop: 4 }}>{review.createdAt ? new Date(review.createdAt).toLocaleString() : ''}</div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Audio element */}
      <audio
        ref={audioRef}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onTimeUpdate={handleTimeUpdate}
        onPlay={() => setIsPlaying(true)}
        onPause={() => {
          setIsPlaying(false);
          setActiveWordIndex(-1); // Reset word highlighting when paused
        }}
        onEnded={() => {
          setIsPlaying(false);
          setActiveWordIndex(-1); // Reset word highlighting when ended
          setCurrentTime(0);
        }}
      />

      {/* Header Navigation */}
      <div className="exhibit-header">
        <div className="container">
          <RouterLink to="/exhibitions" className="back-button">
            <ArrowLeft size={20} />
            <span>Back to Tours</span>
          </RouterLink>
        </div>
      </div>

      {/* Main Content */}
      <div className="exhibit-content">
        <div className="container">
          {/* Hero Section with Image Gallery */}
          <section className="exhibit-hero">
            {/* Title at Top */}
            <h1 className="exhibit-main-title">{exhibit.title}</h1>
            
            {/* Centered Image Gallery */}
            <div className="exhibit-images-centered">
              {displayImages.length > 0 ? (
                <Swiper
                  modules={[Navigation, Pagination, EffectFade, Autoplay]}
                  effect="fade"
                  spaceBetween={0}
                  slidesPerView={1}
                  navigation={{
                    prevEl: '.custom-prev',
                    nextEl: '.custom-next'
                  }}
                  pagination={{ clickable: true }}
                  autoplay={{ delay: 5000, disableOnInteraction: false }}
                  loop={displayImages.length > 1}
                  className="exhibit-image-swiper"
                >
                  {displayImages.map((image: Image, index: number) => (
                    <SwiperSlide key={image.imageId}>
                      <div className="exhibit-image-container">
                        <img
                          src={getImageUrl(image.fileUrl || '')}
                          alt={image.title || exhibit.title}
                          className="exhibit-main-image"
                          onClick={() => {
                            setCurrentImageIndex(index);
                            setShowImageGallery(true);
                          }}
                        />
                        <div className="image-overlay">
                          <div className="image-counter">
                            {index + 1} / {displayImages.length}
                          </div>
                        </div>
                      </div>
                    </SwiperSlide>
                  ))}
                  {displayImages.length > 1 && (
                    <>
                      <div className="custom-prev">
                        <ChevronLeft size={24} />
                      </div>
                      <div className="custom-next">
                        <ChevronRight size={24} />
                      </div>
                    </>
                  )}
                </Swiper>
              ) : (
                <div className="no-images">
                  <div className="no-images-placeholder">
                    <Eye size={48} />
                    <p>No images available for this exhibit</p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Description Below Image */}
            <div className="exhibit-info-centered">
              <div className="description-box">
                <p>{exhibit.description}</p>
              </div>
              <div className="exhibit-meta">
                <div className="meta-item">
                  <Eye size={16} />
                  <span>Interactive Experience</span>
                </div>
              </div>
            </div>
          </section>

          {/* Text-to-Speech Section */}
          {hasAudioContent && (
            <section className="tts-section">
              <div className="tts-header">
                <div className="tts-title">
                  <Headphones size={20} />
                  <span>Audio Guide</span>
                </div>
                
                {availableAudio.length > 0 && (
                  <div className="language-selector">
                    <Languages size={16} />
                    <select
                      value={selectedAudioId || ''}
                      onChange={(e) => setSelectedAudioId(e.target.value)}
                      disabled={availableAudio.length === 1}
                    >
                      {availableAudio.map((audio) => (
                        <option key={audio.audioId} value={audio.audioId}>
                          {audio.language?.title || audio.title || 'Unknown Language'}
                        </option>
                      ))}
                    </select>
                    {availableAudio.length === 1 && (
                      <span className="single-language-note">
                        {availableAudio.length === 1 ? '(Only language available)' : `(${availableAudio.length} languages)`}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="tts-controls">
                <button
                  className="play-button"
                  onClick={handlePlayPause}
                  disabled={!currentAudio?.fileUrl}
                >
                  {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                </button>
                
                <div className="audio-progress">
                  <input
                    type="range"
                    min="0"
                    max={duration}
                    value={currentTime}
                    onChange={handleProgressChange}
                    className="progress-slider"
                  />
                  <div className="time-display">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                <div className="volume-control">
                  <Volume2 size={16} />
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={volume}
                    onChange={handleVolumeChange}
                    className="volume-slider"
                  />
                </div>
              </div>

              {/* Text-to-Speech Transcript Display */}
              <div className="current-sentence">
                {currentAudio?.subtitles?.[0]?.text ? (
                  <div className="transcript-text">
                    {(() => {
                      const transcript = currentAudio.subtitles[0].text;
                      let transcriptArray: Word[] = [];
                      if (Array.isArray(transcript)) {
                        transcriptArray = transcript;
                      } else if (typeof transcript === 'string') {
                        try {
                          const parsed = JSON.parse(transcript);
                          transcriptArray = Array.isArray(parsed) ? parsed : [];
                        } catch (error) {
                          return <p>Error loading transcript</p>;
                        }
                      }
                      
                      return transcriptArray.map((word, index) => (
                        <span
                          key={index}
                          ref={index === activeWordIndex ? activeWordRef : null}
                          className={`transcript-word ${
                            index === activeWordIndex ? 'active-word' : ''
                          }`}
                        >
                          {word.word}{' '}
                        </span>
                      ));
                    })()}
                  </div>
                ) : (
                  <p className="sentence-placeholder">No audio transcript available</p>
                )}
              </div>
            </section>
          )}

          {/* Additional Info Section */}
          <section className="additional-info">
            <div className="additional-content">
              {/* Additional Image Gallery */}
              <div className="admin-image-gallery">
                <h3>Additional Images</h3>
                {additionalImages.length > 0 ? (
                  <div className="additional-images-grid">
                    {additionalImages.map((image, index) => (
                      <div key={image.imageId} className="additional-image-item">
                        <img 
                          src={getImageUrl(image.fileUrl || '')}
                          alt={image.title || `Additional image ${index + 1}`}
                          onClick={() => {
                            const allImagesIndex = validImages.findIndex(img => img.imageId === image.imageId);
                            setCurrentImageIndex(allImagesIndex);
                            setShowImageGallery(true);
                          }}
                        />
                        <div className="image-overlay">
                          <span>{image.title || `Image ${index + 1}`}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="no-additional-images">
                    <p>No additional images available for this exhibit.</p>
                  </div>
                )}
              </div>

              <div className="additional-descriptions">
                <div className="description-block">
                  <h3>Detailed Information</h3>
                  <p className="centered-text">{exhibit.additionalDescription || "Additional information about this exhibit will be available soon. Our curators are working to provide more detailed insights into the historical significance, artifacts, and interactive features of this experience."}</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Image Gallery Modal */}
      {showImageGallery && (
        <div className="image-gallery-modal" onClick={() => setShowImageGallery(false)}>
          <div className="gallery-content" onClick={(e) => e.stopPropagation()}>
            <button 
              className="close-gallery"
              onClick={() => setShowImageGallery(false)}
            >
              ×
            </button>
            <Swiper
              modules={[Navigation, Pagination]}
              spaceBetween={20}
              slidesPerView={1}
              navigation
              pagination={{ clickable: true }}
              initialSlide={currentImageIndex}
              className="gallery-swiper"
            >
              {validImages.map((image: Image, index: number) => (
                <SwiperSlide key={image.imageId}>
                  <div className="gallery-slide">
                    <img
                      src={getImageUrl(image.fileUrl || '')}
                      alt={image.title || `Image ${index + 1}`}
                    />
                    {image.title && (
                      <div className="gallery-image-title">{image.title}</div>
                    )}
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        </div>
      )}

      {/* Badge Modal */}
      <EarnBadgeModal
        isOpen={showBadgeModal}
        onClose={() => setShowBadgeModal(false)}
        exhibitTitle={exhibit.title}
        badgeImageUrl={badgeImageUrl}
        className="responsive-badge-modal"
      />
    </div>
  );
};

export default ExhibitDetails;
