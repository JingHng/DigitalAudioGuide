import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Trophy, Award, CheckCircle, Home, RotateCcw, Share2 } from 'lucide-react';
import '../styles/TourSummary.css';

const BACKEND_URL = import.meta.env.VITE_API_TARGET || '';

interface Badge {
  badgeId: string;
  name: string;
  description: string;
  iconUrl: string | null;
}

interface LocationState {
  badges: Badge[];
  exhibitionTitle: string;
  totalStops: number;
}

const TourSummary: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState;

  const { badges = [], exhibitionTitle = 'Tour', totalStops = 0 } = state || {};

  const handleRestartTour = () => {
    const exhibitionId = window.location.pathname.split('/')[2];
    navigate(`/exhibitions/${exhibitionId}/tour`);
  };

  const handleBackToExhibitions = () => {
    navigate('/exhibitions');
  };

  const handleShare = async () => {
    const exhibitionId = window.location.pathname.split('/')[2];
    const shareData = {
      title: `I completed the ${exhibitionTitle}!`,
      text: `I just finished exploring ${totalStops} exhibits and earned ${badges.length} badges! 🏆`,
      url: `${window.location.origin}/exhibitions/${exhibitionId}`
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Share cancelled or failed');
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(shareData.text + ' ' + shareData.url);
      alert('Tour achievement copied to clipboard!');
    }
  };

  return (
    <div className="tour-summary-container">
      <div className="summary-content">
        {/* Completion Header */}
        <div className="completion-header">
          <div className="completion-icon">
            <CheckCircle size={72} className="check-icon" />
          </div>
          <h1>Tour Complete!</h1>
          <p className="completion-subtitle">
            Congratulations on completing <strong>{exhibitionTitle}</strong>
          </p>
        </div>

        {/* Tour Statistics */}
        <div className="tour-stats">
          <div className="stat-card">
            <div className="stat-icon">
              <Trophy size={32} />
            </div>
            <div className="stat-info">
              <span className="stat-number">{totalStops}</span>
              <span className="stat-label">Exhibits Explored</span>
            </div>
          </div>
          
          <div className="stat-card highlight">
            <div className="stat-icon">
              <Award size={32} />
            </div>
            <div className="stat-info">
              <span className="stat-number">{badges.length}</span>
              <span className="stat-label">Badges Earned</span>
            </div>
          </div>
        </div>

        {/* Badges Earned Section */}
        {badges.length > 0 ? (
          <div className="badges-earned-section">
            <h2>
              <Award size={24} />
              Your Achievements
            </h2>
            <div className="badges-grid">
              {badges.map(badge => (
                <div key={badge.badgeId} className="badge-card">
                  <div className="badge-icon-container">
                    {badge.iconUrl ? (
                      <img 
                        src={`${BACKEND_URL}${badge.iconUrl}`} 
                        alt={badge.name}
                        className="badge-icon-img"
                      />
                    ) : (
                      <Trophy size={40} className="badge-icon-fallback" />
                    )}
                  </div>
                  <h3>{badge.name}</h3>
                  <p>{badge.description}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="no-badges">
            <Award size={48} className="no-badges-icon" />
            <p>Complete more activities to earn badges!</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="summary-actions">
          <button onClick={handleRestartTour} className="btn-secondary">
            <RotateCcw size={20} />
            Restart Tour
          </button>
          
          <button onClick={handleShare} className="btn-accent">
            <Share2 size={20} />
            Share Achievement
          </button>
          
          <button onClick={handleBackToExhibitions} className="btn-primary">
            <Home size={20} />
            Explore More Tours
          </button>
        </div>

        {/* Motivational Message */}
        <div className="motivational-message">
          <p>
            ✨ Ready for your next adventure? Explore more tours to expand your knowledge 
            and earn exclusive badges!
          </p>
        </div>
      </div>
    </div>
  );
};

export default TourSummary;
