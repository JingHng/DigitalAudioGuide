import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link as RouterLink } from "react-router-dom";
import apiClient from "../utils/apiClient";
import {
  Play,
  Pause,
  Rewind,
  FastForward,
  Volume2,
  Loader2,
  Pin,
  Languages,
  MicOff,
} from "lucide-react";

//  import { useAuth } from '../contexts/AuthContext';
//  import audioLogService from '../services/audioLogService';

import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, A11y } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

import "../css/ExhibitDetails.css";

import EarnBadgeModal from "./earnBadgeModal";

// --- Constants & Types  ---
const BACKEND_URL = import.meta.env.VITE_API_TARGET || "";
const DEFAULT_IMAGE_URL = `${BACKEND_URL}/public/images/Exhibit.jpg`;

const getImageUrl = (fileUrl: string | null): string => {
  if (!fileUrl) return DEFAULT_IMAGE_URL;

  const cleanedPath = fileUrl.replace(/\\/g, "/");
  const imagePrefix = "/images/";
  const pathIndex = cleanedPath.indexOf(imagePrefix);

  if (pathIndex !== -1) {
    const filename = cleanedPath.substring(pathIndex + imagePrefix.length);
    return `${BACKEND_URL}/public/images/${filename}`;
  }
  return DEFAULT_IMAGE_URL;
};

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
  images: Image[];
  audio: AudioTrack[];
}

const formatTime = (time: number) => {
  if (isNaN(time)) return "00:00";
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
};

const ExhibitDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  // Only temporary till admin dashboard is up
  const user = null; // Forces all user-dependent logic to be skipped // const { user } = useAuth();
  const [exhibit, setExhibit] = useState<Exhibit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Control badge modal & prevent multiple triggering
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [badgeAssigned, setBadgeAssigned] = useState(false); // Removed unused state 'selectedLanguageId' (Temporary)

  // Store badge image URL returned from backend
  const [badgeImageUrl, setBadgeImageUrl] = useState<string | undefined>(undefined);

  const [selectedAudioId, setSelectedAudioId] = useState<string | null>(null);
  const [currentAudio, setCurrentAudio] = useState<AudioTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [activeWordIndex, setActiveWordIndex] = useState(-1);
  const [userHasScrolled, setUserHasScrolled] = useState(false); // Audio Logging states (kept but logging logic disabled)
  const [currentPlaybackLogId, setCurrentPlaybackLogId] = useState<number | null>(null);
  const [playbackStartTime, setPlaybackStartTime] = useState<number>(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const activeWordRef = useRef<HTMLSpanElement | null>(null);
  const scrollTimeoutRef = useRef<number | null>(null);

  // Load exhibit details
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    apiClient
      .get(`/exhibits/${id}`)
      .then((res) => {
        const data: Exhibit = res.data;
        console.log("📡 API Response for exhibit:", id);
        console.log("🎵 Audio array:", data.audio);
        console.log("🎵 Audio count:", data.audio?.length || 0);
        setExhibit(data);
        const firstAvailableAudio = data.audio.find((a) => a.fileUrl);
        if (firstAvailableAudio) {
          console.log(
            "Setting initial audio:",
            firstAvailableAudio.title,
            firstAvailableAudio.audioId
          );
          setSelectedAudioId(firstAvailableAudio.audioId.toString()); // Removed setting of unused selectedLanguageId
        }
      })
      .catch(() => setError("Could not load exhibit information."))
      .finally(() => setLoading(false));
  }, [id]);

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
    if (!userHasScrolled && activeWordRef.current) {
      activeWordRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [activeWordIndex, userHasScrolled]); // CHANGE: Remove audio logging cleanup

  // Cleanup on unmount (audio logging removed for guest access)
  useEffect(() => {
    return () => {
      // Audio logging removed for guest access
      // if (currentPlaybackLogId && user && audioRef.current) {
      //   const durationListened = Math.round(audioRef.current.currentTime - playbackStartTime);
      //   audioLogService.endPlayback(currentPlaybackLogId, durationListened)
      //     .catch((error: any) => console.error('Failed to cleanup audio log:', error));
      // }
    };
  }, [currentPlaybackLogId, user, playbackStartTime]); // CHANGE: Remove audio logging state reset

  // Reset logging state when audio changes (logging removed for guest access)
  useEffect(() => {
    // Audio logging reset removed for guest access
    // if (currentPlaybackLogId && user && audioRef.current) {
    //   const durationListened = Math.round(audioRef.current.currentTime - playbackStartTime);
    //   audioLogService.endPlayback(currentPlaybackLogId, durationListened)
    //     .catch((error: any) => console.error('Failed to end previous audio log:', error));
    // }
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

  const transcript = currentAudio?.subtitles?.[0]?.text;
  let transcriptArray: Word[] = [];
  if (transcript) {
    console.log("Raw transcript data:", transcript, typeof transcript);
    if (Array.isArray(transcript)) {
      transcriptArray = transcript;
      console.log("Using parsed array:", transcriptArray.length, "words");
    } else if (typeof transcript === "string") {
      try {
        const parsed = JSON.parse(transcript);
        transcriptArray = Array.isArray(parsed) ? parsed : [];
        console.log("Parsed transcript:", transcriptArray.length, "words");
      } catch (error) {
        console.error("Error parsing transcript JSON:", error);
        transcriptArray = [];
      }
    }
  } else {
    console.log("No transcript data available for current audio");
  }

  const handleTimeUpdate = useCallback(() => {
    if (!audioRef.current) return;
    const time = audioRef.current.currentTime;
    setCurrentTime(time);
    if (!transcriptArray.length) return;
    const currentIndex = transcriptArray.findIndex(
      (word) => time >= word.start && time < word.end
    );
    if (currentIndex !== -1 && currentIndex !== activeWordIndex) {
      setActiveWordIndex(currentIndex);
    }
  }, [transcriptArray, activeWordIndex]);

  const getHighlightClass = (currentIndex: number): string => {
    if (activeWordIndex === -1) return "";
    const isInWindow =
      currentIndex >= activeWordIndex - 1 &&
      currentIndex <= activeWordIndex + 1;
    return isInWindow ? "highlight" : "";
  };

  const handlePlayPause = async () => {
    if (!currentAudio?.fileUrl) return;
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      // Pause audio (Logging removed)
      audio.pause();
    } else {
      // Start audio (Logging removed)
      try {
        await audio.play();
      } catch (e) {
        console.error("Audio play failed:", e);
        return;
      }
    }
    setIsPlaying(!isPlaying);
  };

  const handleRewind = () => {
    if (audioRef.current) audioRef.current.currentTime -= 10;
  };

  const handleForward = () => {
    if (audioRef.current) audioRef.current.currentTime += 10;
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

  const handleManualScroll = () => {
    setUserHasScrolled(true);
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = window.setTimeout(
      () => setUserHasScrolled(false),
      3000
    );
  };

  const reEnableAutoScroll = () => setUserHasScrolled(false);

  // ---- Early returns (no hooks below this line) ----
  if (loading)
    return (
      <div className="page-status">
        <Loader2 className="animate-spin" size={48} /> Loading Exhibit...
      </div>
    );
  if (error) return <div className="page-status error">{error}</div>;
  if (!exhibit) return <div className="page-status">Exhibit not found.</div>;

  const availableAudio = exhibit.audio.filter((a) => a.fileUrl);
  const hasAudioContent = availableAudio.length > 0;

  const validImages = exhibit.images.filter((img) => img.fileUrl);

  return (
    <>
      <div className="exhibit-detail-container">
        <audio
          ref={audioRef}
          onLoadedMetadata={() => {
            console.log("Audio metadata loaded successfully");
            setDuration(audioRef.current?.duration || 0);
          }}
          onTimeUpdate={handleTimeUpdate}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onError={(e) => {
            console.error("Audio loading error:", e);
            console.error("Audio error details:", audioRef.current?.error);
          }}
          onLoadStart={() => console.log("Audio load started")}
          onCanPlay={() => console.log("Audio can start playing")}
          onEnded={async () => {
            setIsPlaying(false);
          }}
        />

        <div className="exhibit-main-content">
          <RouterLink to="/exhibitions" className="back-link">
            ← Back to All Exhibits
          </RouterLink>

          <section className="image-gallery-section">
            <Swiper
              modules={[Navigation, Pagination, A11y]}
              spaceBetween={50}
              slidesPerView={1}
              navigation
              pagination={{ clickable: true }}
              loop={validImages.length > 1}
              className="exhibit-swiper"
            >
              {validImages.length > 0 ? (
                validImages.map((image) => (
                  <SwiperSlide key={image.imageId}>
                    {/* FIX: Use the robust getImageUrl function */}
                    <img
                      src={getImageUrl(image.fileUrl)}
                      alt={image.title || exhibit.title}
                    />
                  </SwiperSlide>
                ))
              ) : (
                <SwiperSlide>
                  <img
                    src={DEFAULT_IMAGE_URL}
                    alt="Default placeholder for exhibit"
                  />
                </SwiperSlide>
              )}
            </Swiper>
          </section>

          <header className="exhibit-header">
            <div className="exhibit-title-section">
              <h1>{exhibit.title}</h1>
              {/*<RouterLink to={`/exhibits/${id}/reviews`} className="review-button" title="View Reviews">
                <MessageSquare size={24} />
                <span>Reviews</span>
              </RouterLink> */}
            </div>
            <p className="exhibit-description">{exhibit.description}</p>
          </header>

          <section className="audio-guide-section">
            <div className="audio-section-header">
              <h2>Audio Guide</h2>
              {hasAudioContent && (
                <div className="language-selector">
                  <Languages size={20} />
                  <select
                    value={selectedAudioId || ""}
                    onChange={(e) => setSelectedAudioId(e.target.value)}
                  >
                    {availableAudio.map((audio) => (
                      <option key={audio.audioId} value={audio.audioId}>
                        {audio.description ||
                          audio.title ||
                          `Audio ${audio.audioId}`}
                        {audio.language ? ` (${audio.language.title})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="audio-player">
              <div className="player-controls">
                <button
                  onClick={handleRewind}
                  className="control-button"
                  title="Rewind 10s"
                  disabled={!hasAudioContent}
                >
                  <Rewind />
                </button>
                <button
                  onClick={handlePlayPause}
                  className="control-button play-pause"
                  title={isPlaying ? "Pause" : "Play"}
                  disabled={!hasAudioContent}
                >
                  {isPlaying ? <Pause size={36} /> : <Play size={36} />}
                </button>
                <button
                  onClick={handleForward}
                  className="control-button"
                  title="Forward 10s"
                  disabled={!hasAudioContent}
                >
                  <FastForward />
                </button>
              </div>
              <div className="progress-and-volume">
                <span className="time-label">{formatTime(currentTime)}</span>
                <input
                  type="range"
                  min="0"
                  max={duration || 1}
                  value={currentTime}
                  onChange={handleProgressChange}
                  className="progress-bar"
                  style={
                    {
                      "--progress": `${(currentTime / duration) * 100}%`,
                    } as React.CSSProperties
                  }
                  disabled={!hasAudioContent}
                />
                <span className="time-label">{formatTime(duration)}</span>
                <div className="volume-control">
                  <Volume2 />
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={volume}
                    onChange={handleVolumeChange}
                    className="volume-slider"
                    style={
                      {
                        "--progress": `${volume * 100}%`,
                      } as React.CSSProperties
                    }
                    disabled={!hasAudioContent}
                  />
                </div>
              </div>
            </div>

            <div className="transcript-section">
              <div className="transcript-header">
                <h3>
                  Transcript{" "}
                  {hasAudioContent ? `(${currentAudio?.language?.title})` : ""}
                </h3>
                {userHasScrolled && (
                  <button
                    className="follow-button"
                    onClick={reEnableAutoScroll}
                  >
                    <Pin size={16} /> Follow Text
                  </button>
                )}
              </div>
              {hasAudioContent ? (
                transcriptArray && transcriptArray.length > 0 ? (
                  <div
                    className="transcript-text"
                    onWheel={handleManualScroll}
                    onTouchStart={handleManualScroll}
                  >
                    {transcriptArray.map((word, index) => (
                      <span
                        key={index}
                        ref={index === activeWordIndex ? activeWordRef : null}
                        className={getHighlightClass(index)}
                      >
                        {word.word}{" "}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="transcript-unavailable">
                    <p>No transcript is available for this language.</p>
                  </div>
                )
              ) : (
                <div className="transcript-unavailable">
                  <MicOff size={24} />
                  <p>No audio guides have been created for this exhibit yet.</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Badge modal */}
      <EarnBadgeModal
        isOpen={showBadgeModal}
        onClose={() => setShowBadgeModal(false)}
        exhibitTitle={exhibit.title}
        badgeImageUrl={badgeImageUrl}
        className="responsive-badge-modal"
      />
    </>
  );
};

export default ExhibitDetails;
