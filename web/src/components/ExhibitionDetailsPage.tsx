import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowRight, Loader2, Camera, Sparkles, PlayCircle } from 'lucide-react';
import apiClient from '../utils/apiClient';

const BACKEND_URL = import.meta.env.VITE_API_TARGET || '';
const DEFAULT_IMAGE_URL = `${BACKEND_URL}/public/images/Exhibit.jpg`;
import "../css/ExhibitionDetailsPage.css";

interface Exhibit {
  exhibitId: string;
  title: string;
  description: string;
  images: Array<{ fileUrl: string; isPrimary?: boolean; }>;
}

interface Exhibition {
  exhibitionId: string;
  title: string;
  description: string;
  exhibits: Exhibit[];
}

// Helper function to construct the correct image URL (same as HomePage)
const getImageUrl = (fileUrl: string | null): string => {
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

const ExhibitionDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [exhibition, setExhibition] = useState<Exhibition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
        setError("No exhibition ID provided.");
        setLoading(false);
        return;
    }

    // Use apiClient which handles authentication headers
    apiClient.get(`/exhibitions/${id}`)
      .then((res) => {
        setExhibition(res.data);
      })
      .catch((err: any) => {
        // Only log error if it's not a 401 (which might be expected for public endpoints)
        if (err.response?.status !== 401) {
          console.error(`Error fetching exhibition ${id}:`, err);
          setError("Could not load the collection. It may not exist or there was a server error.");
        } else {
          setError("Could not load the collection. Please check your authentication.");
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="page-status-container">
        <Loader2 className="animate-spin" size={48} />
        <p>Loading Collection...</p>
      </div>
    );
  }
  
  if (error) {
    return <div className="page-status-container error-message">{error}</div>;
  }

  if (!exhibition) {
    return <div className="page-status-container">Exhibition not found.</div>
  }

  return (
    <div className="exhibits-page-container">
      <header className="exhibition-header">
        <div className="exhibition-header-content">
          <div className="exhibition-info">
            <h1>{exhibition.title}</h1>
            <p>{exhibition.description}</p>
          </div>
          <div className="exhibition-actions">
            <button 
              onClick={() => navigate(`/exhibitions/${id}/tour`)}
              className="start-tour-btn-main"
            >
              <PlayCircle size={20} />
              <span>Start Tour</span>
            </button>
            <button 
              onClick={() => navigate(`/exhibitions/${id}/ar-photobooth`)}
              className="ar-photobooth-btn"
            >
              <Camera size={20} />
              <Sparkles size={16} className="sparkle-icon" />
              <span>AR Photobooth</span>
            </button>
          </div>
        </div>
      </header>

      <section className="exhibits-grid-section">
        <div className="exhibits-grid">
          {exhibition.exhibits.length > 0 ? (
            exhibition.exhibits.map((exhibit) => {
              // Prioritize primary image, fallback to first image
              const primaryImage = exhibit.images.find(img => img.isPrimary);
              const imageToDisplay = primaryImage || exhibit.images[0] || null;
              
              return (
                <Link to={`/exhibit/${exhibit.exhibitId}`} key={exhibit.exhibitId} className="exhibit-card-link">
                  <div className="exhibit-card">
                    <div className="exhibit-image-container">
                      <img 
                        src={getImageUrl(imageToDisplay?.fileUrl)} 
                        alt={exhibit.title}
                        onError={(e) => {
                          console.error(`Failed to load image: ${getImageUrl(imageToDisplay?.fileUrl)}`);
                          const target = e.target as HTMLImageElement;
                          target.src = DEFAULT_IMAGE_URL;
                        }}
                      />
                    </div>
                    <div className="exhibit-card-content">
                      <h3>{exhibit.title}</h3>
                      <p className="exhibit-description">{exhibit.description}</p>
                      <div className="exhibit-learn-more-btn">
                        <span>Learn More</span>
                        <ArrowRight size={16} />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })
          ) : (
            <p>No exhibits available in this collection.</p>
          )}
        </div>
      </section>
    </div>
  );
};

export default ExhibitionDetailsPage;