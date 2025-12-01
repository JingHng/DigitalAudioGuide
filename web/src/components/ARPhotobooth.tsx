import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Camera, Smartphone } from 'lucide-react';
import './ARPhotobooth.css';

const ARPhotobooth: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const handleBack = () => {
    navigate(`/exhibitions/${id}`);
  };

  const handleOpenAR = () => {
    window.open('https://jinghngwan.8thwall.app/spopenhousephotobooth/', '_blank');
  };

  return (
    <div className="ar-photobooth-container">
      {/* Header */}
      <div className="ar-header">
        <button onClick={handleBack} className="ar-btn ar-btn-secondary">
          <ArrowLeft size={18} />
          Back
        </button>
        
        <h1 className="ar-title">
          AR Photobooth Experience
        </h1>
      </div>

      {/* Main Content */}
      <div className="ar-main">
        <div className="ar-preview">
          <div className="preview-content">
            <div className="preview-icon">
              <Camera size={64} color="#3b82f6" />
              <Smartphone size={48} color="#10b981" style={{ marginLeft: '-20px', marginTop: '10px' }} />
            </div>
            
            <h2 style={{ color: 'white', marginBottom: '1rem', textAlign: 'center' }}>
              🎓 SoC Open House AR Photobooth
            </h2>
            
            <p style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '1.1rem', textAlign: 'center', lineHeight: '1.6', marginBottom: '2rem' }}>
              Experience our interactive AR photobooth powered by 8th Wall! 
              Try on virtual graduation caps, glasses, and other fun effects while taking memorable photos.
            </p>

            <div className="features-grid">
              <div className="feature-card">
                <div className="feature-icon">👓</div>
                <h3>Virtual Accessories</h3>
                <p>Try on AR glasses, graduation caps, and other fun virtual accessories</p>
              </div>
              
              <div className="feature-card">
                <div className="feature-icon">📸</div>
                <h3>Photo Capture</h3>
                <p>Take screenshots directly from your device while wearing AR effects</p>
              </div>
              
              <div className="feature-card">
                <div className="feature-icon">🎉</div>
                <h3>Share & Celebrate</h3>
                <p>Capture and share your SoC Open House memories with friends</p>
              </div>
            </div>

            <div className="action-section">
              <button onClick={handleOpenAR} className="ar-btn ar-btn-primary ar-btn-large">
                <ExternalLink size={24} />
                Launch AR Photobooth
              </button>
              
              <div className="instructions">
                <h4>📱 How to Use:</h4>
                <ol>
                  <li>Click "Launch AR Photobooth" to open the 8th Wall experience</li>
                  <li>Allow camera access when prompted</li>
                  <li>Try on different AR effects and accessories</li>
                  <li>Take screenshots using your device's built-in screenshot feature</li>
                  <li>Share your photos with #SoCOpenHouse</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ARPhotobooth;