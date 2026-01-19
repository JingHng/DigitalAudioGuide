import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import apiClient from "../utils/apiClient";
import {
  Play, Pause, ArrowLeft, Info, Headphones,
  Languages, BookOpen, RotateCcw, RotateCw, Volume2, VolumeX
} from "lucide-react";

import "../styles/exhibitDetails.css";

const BACKEND_URL = import.meta.env.VITE_API_TARGET || "";
const DEFAULT_IMAGE_URL = `${BACKEND_URL}/public/images/Map.jpg`;

const ExhibitDetails: React.FC = () => {
  const { exhibitionId, id } = useParams<{ exhibitionId: string; id: string }>();
  const navigate = useNavigate();

  const [exhibit, setExhibit] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAudioId, setSelectedAudioId] = useState<string | null>(null);
  const [currentAudio, setCurrentAudio] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [activeWordIndex, setActiveWordIndex] = useState(-1);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    apiClient.get(`/exhibits/${id}`)
      .then((res) => {
        setExhibit(res.data);
        const firstAudio = res.data.audio.find((a: any) => a.fileUrl);
        if (firstAudio) setSelectedAudioId(firstAudio.audioId.toString());
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [id]);

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
      if (idx !== -1 && idx !== activeWordIndex) {
        setActiveWordIndex(idx);
      }
    }
  }, [currentAudio, activeWordIndex]);

  const getImageUrl = (url: string | null) => {
    if (!url) return DEFAULT_IMAGE_URL;
    return url.includes('/images/') ? `${BACKEND_URL}/public/images/${url.split('/images/')[1]}` : DEFAULT_IMAGE_URL;
  };

  if (loading) return <div className="loading-screen">Loading...</div>;
  if (!exhibit) return <div className="error-screen">Exhibit not found.</div>;

  return (
    <div className="exhibit-page-wrapper">
      <audio 
        ref={audioRef} 
        onTimeUpdate={handleTimeUpdate}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
      />

      <nav className="exhibit-nav">
        <button onClick={() => navigate(`/exhibitions/${exhibitionId}/tour`)} className="nav-back">
          <ArrowLeft size={18} /> <span>Back</span>
        </button>
        <div className="nav-title">{exhibit.title}</div>
        <div style={{width: '60px'}}></div>
      </nav>

      <main className="exhibit-main-container">
        <div className="exhibit-grid">
          <div className="info-column">
            <div className="image-container-full">
                <img 
                  src={getImageUrl(exhibit.images.find((img: any) => img.isPrimary)?.fileUrl || exhibit.images[0]?.fileUrl)} 
                  alt={exhibit.title} 
                />
            </div>

            <div className="section-card">
              <div className="card-header"><Info size={20} /><h3>Description</h3></div>
              <p className="description-text">{exhibit.description}</p>
            </div>

            {exhibit.additionalDescription && (
              <div className="section-card no-margin">
                <div className="card-header"><BookOpen size={20} /><h3>Additional Description</h3></div>
                <div className="additional-description-box">
                  <p className="description-text">{exhibit.additionalDescription}</p>
                </div>
              </div>
            )}
          </div>

          <div className="audio-column">
            <div className="audio-card matched-height">
              <div className="audio-header">
                <div className="header-left">
                  <Headphones size={18} />
                  <span>Audio Guide</span>
                </div>
                <div className="lang-selector">
                  <Languages size={14} />
                  <select value={selectedAudioId || ''} onChange={(e) => setSelectedAudioId(e.target.value)}>
                    {exhibit.audio.map((a: any) => <option key={a.audioId} value={a.audioId}>{a.language?.title || 'Language'}</option>)}
                  </select>
                </div>
              </div>

              <div className="transcript-area">
                {currentAudio?.subtitles?.[0]?.text.map((word: any, idx: number) => (
                  <span key={idx} className={`word ${activeWordIndex === idx ? 'active' : ''}`}>
                    {word.word}{' '}
                  </span>
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

                    <div className="volume-section">
                        <Volume2 size={16} color="#64748b" />
                        <input type="range" min="0" max="1" step="0.1" value={volume} className="vol-slider" onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            setVolume(v);
                            if (audioRef.current) audioRef.current.volume = v;
                        }} />
                    </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ExhibitDetails;