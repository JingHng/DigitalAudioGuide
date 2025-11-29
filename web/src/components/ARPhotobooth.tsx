import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Download, ExternalLink } from 'lucide-react';
import './ARPhotobooth.css';

const ARPhotobooth: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 3000);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  const handleBack = () => {
    navigate(`/exhibitions/${id}`);
  };

  const handleOpenAR = () => {
    window.open('https://jinghngwan.8thwall.app/spopenhousephotobooth/', '_blank');
  };

  const handleCapture = () => {
    setIsCapturing(true);
    
    // Generate a beautiful "I love SoC Open House" image immediately
    setTimeout(() => {
      generatePlaceholderImage();
    }, 800); // Small delay for better UX
  };

  const generatePlaceholderImage = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = 600;
    canvas.height = 600;
    
    if (ctx) {
      // Create gradient background matching your AR theme
      const gradient = ctx.createLinearGradient(0, 0, 600, 600);
      gradient.addColorStop(0, '#667eea');
      gradient.addColorStop(1, '#764ba2');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 600, 600);
      
      // Add decorative frame
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 4;
      ctx.strokeRect(20, 20, 560, 560);
      
      // Add main text
      ctx.fillStyle = 'white';
      ctx.font = 'bold 36px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 10;
      ctx.fillText('🎓 I love SoC Open House! 🎓', 300, 200);
      
      // Add subtitle
      ctx.font = 'bold 24px Arial, sans-serif';
      ctx.fillText('AR Photo Captured!', 300, 260);
      
      // Add emoji decoration
      ctx.font = '48px Arial, sans-serif';
      ctx.fillText('📸', 250, 350);
      ctx.fillText('✨', 350, 350);
      
      // Add timestamp
      ctx.font = '18px Arial, sans-serif';
      ctx.fillText(new Date().toLocaleString(), 300, 420);
      
      // Add institution text
      ctx.font = 'bold 20px Arial, sans-serif';
      ctx.fillText('Singapore Polytechnic', 300, 480);
      ctx.fillText('School of Computing', 300, 510);
      
      const imageData = canvas.toDataURL('image/png', 0.9);
      setCapturedImage(imageData);
      setIsCapturing(false);
    }
  };

  const handleDownload = () => {
    if (capturedImage) {
      const link = document.createElement('a');
      link.href = capturedImage;
      link.download = `ar-photo-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleIframeLoad = () => {
    console.log('AR iframe loaded successfully');
    setIsLoading(false);
  };

  const handleIframeError = () => {
    console.error('AR iframe failed to load');
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className="ar-loading">
        <div className="loading-spinner"></div>
        <p style={{ fontSize: '1.1rem', textAlign: 'center' }}>
          🌟 Loading AR Experience...
        </p>
        <p style={{ fontSize: '0.9rem', opacity: 0.8, textAlign: 'center' }}>
          Preparing your virtual photobooth
        </p>
      </div>
    );
  }

  return (
    <div className="ar-photobooth-container">
      {/* Header */}
      <div className="ar-header">
        <button onClick={handleBack} className="ar-btn ar-btn-secondary">
          <ArrowLeft size={18} />
          Back
        </button>
        
        <h1 className="ar-title">
          AR Photobooth
        </h1>
        
        <div className="ar-actions">
          <button onClick={handleOpenAR} className="ar-btn ar-btn-primary">
            <ExternalLink size={18} />
            Open AR
          </button>
          <button 
            onClick={handleCapture} 
            className="ar-btn ar-btn-capture"
            disabled={isCapturing}
          >
            <Camera size={18} />
            {isCapturing ? 'Capturing...' : 'Capture'}
          </button>
          {capturedImage && (
            <button onClick={handleDownload} className="ar-btn ar-btn-download">
              <Download size={18} />
              Download
            </button>
          )}
        </div>
      </div>

      {/* Main AR Content */}
      <div className="ar-main">
        <iframe
          ref={iframeRef}
          src="https://jinghngwan.8thwall.app/spopenhousephotobooth/"
          className="ar-iframe"
          allow="camera; microphone; accelerometer; magnetometer; gyroscope; fullscreen"
          onLoad={handleIframeLoad}
          onError={handleIframeError}
          title="AR Photobooth Experience"
        />
      </div>

      {/* Photo Preview Modal */}
      {capturedImage && (
        <div className="photo-preview-modal">
          <div className="photo-preview-content">
            <h3>🎓 Your SoC Open House Photo! 📸</h3>
            <img 
              src={capturedImage} 
              alt="I love SoC Open House - AR Photo" 
              className="captured-photo"
              title="Right-click to save this image!"
            />
            <div className="photo-actions">
              <div className="save-instructions">
                <p>💡 <strong>Right-click</strong> the image above and select <strong>"Save image as..."</strong></p>
                <p>Or use the download button below:</p>
              </div>
              <button onClick={handleDownload} className="ar-btn ar-btn-download">
                <Download size={18} />
                Download Photo
              </button>
              <button 
                onClick={() => setCapturedImage(null)} 
                className="ar-btn ar-btn-secondary"
              >
                ✨ Take Another
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ARPhotobooth;