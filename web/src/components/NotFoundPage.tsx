import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft, AlertTriangle } from 'lucide-react';
import '../css/NotFoundPage.css';

const NotFoundPage: React.FC = () => {
  return (
    <div className="not-found-container">
      <div className="not-found-content">
        {/* 404 Icon */}
        <div className="not-found-icon">
          <AlertTriangle size={80} />
        </div>
        
        {/* 404 Text */}
        <div>
          <h1 className="not-found-number">404</h1>
          <h2 className="not-found-title">Page Not Found</h2>
          <p className="not-found-description">
            Sorry, the page you are looking for doesn't exist or has been moved. 
            Let's get you back on track!
          </p>
        </div>
        
        {/* Action Buttons */}
        <div className="not-found-actions">
          <button
            onClick={() => window.history.back()}
            className="not-found-btn not-found-btn-secondary"
          >
            <ArrowLeft size={20} />
            Go Back
          </button>
          
          <Link
            to="/"
            className="not-found-btn not-found-btn-primary"
          >
            <Home size={20} />
            Go Home
          </Link>
        </div>
        
        {/* Additional Help Text */}
        <div className="not-found-help">
          <p className="not-found-help-text">
            If you believe this is an error, please{' '}
            <a href="mailto:support@audiomuseum.com" className="not-found-help-link">
              contact support
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;