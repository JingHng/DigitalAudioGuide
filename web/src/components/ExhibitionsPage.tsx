import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Loader2, Info } from 'lucide-react'; // Added Info icon
import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_API_TARGET || '';
const DEFAULT_IMAGE_URL = `${BACKEND_URL}/public/images/ThroughTheLensOfTime.jpg`;
const HERO_IMAGE_URL = `${BACKEND_URL}/public/images/SingaporeDiscoveryCentre.jpg`; // Ensure this is available or defined
import '../css/ExhibitionsPage.css';

interface Exhibition {
  exhibitionId: string;
  title: string;
  description: string;
  _count: { exhibits: number; };
  images: Array<{ fileUrl: string }> | null; // Allow images to be null
}

// Helper function to construct the correct image URL
const getImageUrl = (fileUrl: string | null | undefined): string => {
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

const ExhibitionsPage: React.FC = () => {
  const [exhibitions, setExhibitions] = useState<Exhibition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null); // State for error handling

  useEffect(() => {
    // Clear error state before new fetch
    setError(null); 
    
    axios.get(`${BACKEND_URL}/api/exhibitions`)
      .then((res) => {
        // Ensure data is an array before setting state
        if (Array.isArray(res.data)) {
          setExhibitions(res.data);
        } else {
          // Handle non-array response gracefully
          setExhibitions([]);
          console.warn('API returned non-array data:', res.data);
        }
      })
      .catch((err) => {
        console.error('Error fetching exhibitions:', err);
        // Set a user-friendly error message
        setError('Failed to load exhibitions. Please check your network connection or try again later.');
      })
      .finally(() => setLoading(false));
  }, []); // Empty dependency array means this runs once on mount

  // --- RENDERING LOGIC ---

  if (loading) {
    return (
      <div className="status-message-container">
        <Loader2 className="animate-spin" size={48} color="#3b82f6" />
        <p>Loading exhibitions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="status-message-container error-message">
        <Info size={40} color="#ef4444" />
        <h2>Error Loading Content</h2>
        <p>{error}</p>
      </div>
    );
  }

  // Handle case where API is successful but returns no exhibitions
  const hasExhibitions = exhibitions.length > 0;

  return (
    <div className="exhibitions-page-container">
      <section className="hero-section-exhibitions" style={{ backgroundImage: `url('${HERO_IMAGE_URL}')` }}>
        <div className="hero-content-exhibitions">
          <h1>Discover Our World</h1>
          <p>A showcase of Singapore's rich history and vibrant future.</p>
        </div>
      </section>

      <section className="exhibitions-grid-section">
        {hasExhibitions ? (
          <div className="exhibitions-grid">
            {exhibitions.map((exhibition) => {
              // Safely access the first image URL
              const imageFileUrl = exhibition.images?.[0]?.fileUrl; 
              
              return (
                <Link 
                  to={`/exhibitions/${exhibition.exhibitionId}`} 
                  key={exhibition.exhibitionId} 
                  className="exhibition-card-link"
                >
                  <div className="exhibition-card">
                    <img 
                      src={getImageUrl(imageFileUrl)} 
                      alt={exhibition.title} 
                      className="exhibition-card-image" 
                      // Add loading strategy for better UX
                      loading="lazy"
                    />
                    <div className="exhibition-card-overlay">
                      <h3>{exhibition.title}</h3>
                      <p>{exhibition.description}</p>
                      <div className="exhibition-card-footer">
                        <span>
                          {exhibition._count.exhibits}{' '}
                          {exhibition._count.exhibits === 1 ? 'Exhibit' : 'Exhibits'}
                        </span>
                        <div className="view-exhibition-btn">
                          <span>View Exhibition</span>
                          <ArrowRight size={16} />
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          // Display message if no exhibitions are found
          <div className="no-exhibitions-message">
            <Info size={32} color="#9ca3af" />
            <p>No exhibitions are currently available. Check back soon!</p>
          </div>
        )}
      </section>
    </div>
  );
};

export default ExhibitionsPage;