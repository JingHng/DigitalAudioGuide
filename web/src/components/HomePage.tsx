import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QrCode, Building2, Sparkles, ArrowRight, MapPin, Award, Music, Image, Users, Settings, Eye, Heart, Star, Bell } from 'lucide-react';
// import '../styles/SmartExhibit.css'; // Temporarily commented to fix deployment issue

// --- Constants for API and Default Image ---
const BACKEND_URL = import.meta.env.VITE_API_TARGET || '';
const DEFAULT_IMAGE_URL = `${BACKEND_URL}/public/images/SmartExhibit.avif`; 

// --- Type Definitions for API Data ---
interface TourImage {
  imageId: string;
  fileUrl: string | null;
  isPrimary?: boolean;
}

interface Tour {
  exhibitionId: string;
  title: string;
  description: string;
  images: TourImage[];
  _count: {
    exhibits: number;
  };
}

interface FloatingCard {
  cardId: string;
  title: string;
  icon: string;
  linkUrl: string;
  position: number;
  isActive: boolean;
}

const Homepage: React.FC = () => {
  const navigate = useNavigate();
  const [tours, setTours] = useState<Tour[]>([]);
  const [floatingCards, setFloatingCards] = useState<FloatingCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch tours and floating cards in parallel
        const [toursResponse, cardsResponse] = await Promise.all([
          fetch('/api/exhibitions'),
          fetch('/api/home/floating-cards/active')
        ]);

        if (toursResponse.ok) {
          const toursData = await toursResponse.json();
          setTours(toursData);
        } else {
          console.error('Failed to fetch tours');
          setTours([]);
        }

        if (cardsResponse.ok) {
          const cardsData = await cardsResponse.json();
          setFloatingCards(cardsData);
        } else {
          console.error('Failed to fetch floating cards');
          setFloatingCards([]);
        }
      } catch (err: any) {
        console.error('Error fetching data:', err);
        setTours([]);
        setFloatingCards([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Helper function to get icon component by name
  const getIconComponent = (iconName: string) => {
    const icons: { [key: string]: React.ReactNode } = {
      QrCode: <QrCode size={24} />,
      MapPin: <MapPin size={24} />,
      Sparkles: <Sparkles size={24} />,
      Award: <Award size={24} />,
      Music: <Music size={24} />,
      Image: <Image size={24} />,
      Users: <Users size={24} />,
      Settings: <Settings size={24} />,
      Eye: <Eye size={24} />,
      Heart: <Heart size={24} />,
      Star: <Star size={24} />,
      Bell: <Bell size={24} />,
    };
    return icons[iconName] || <QrCode size={24} />;
  };

  // Helper function to construct the correct image URL
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

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading SmartExhibit...</p>
      </div>
    );
  }

  return (
    <div className="smart-exhibit-home">
      {/* Hero Section */}
      <section className="hero-banner">
        <div className="container">
          <div className="hero-content">
          <div className="hero-text">
            <h1 className="hero-title">
              <span className="smart-gradient">SmartExhibit</span>
              <small style={{fontSize: '0.3em', opacity: 0.7}}> Build: Dec1-2025</small>
            </h1>
            <p className="hero-subtitle">
              Host your very own virtual tours today
            </p>
            <p className="hero-description">
              Discover, explore, and interact with cutting-edge virtual tours powered by smart technology. 
              Transform your museum experience with our innovative digital platform.
            </p>
            <div className="hero-actions">
              <button 
                className="primary-btn"
                onClick={() => navigate('/scan')}
              >
                <QrCode size={20} />
                Start Exploring
              </button>
              <button 
                className="secondary-btn"
                onClick={() => navigate('/exhibitions')}
              >
                View All Tours
                <ArrowRight size={20} />
              </button>
            </div>
          </div>
          <div className="hero-visual">
            <div className="hero-image-container">
              <img 
                src={DEFAULT_IMAGE_URL} 
                alt="Smart Exhibition Experience" 
                className="hero-image"
              />
              <div className="floating-elements">
                {floatingCards.map((card, index) => (
                  <div 
                    key={card.cardId} 
                    className={`float-card card-${index + 1}`}
                    onClick={() => navigate(card.linkUrl)}
                    style={{ cursor: 'pointer' }}
                  >
                    {getIconComponent(card.icon)}
                    <span>{card.title}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        </div>
      </section>

      {/* Tours Section */}
      <section className="tours-showcase">
        <div className="container">
          <div className="section-header">
            <h2>Discover Our Virtual Tours</h2>
            <p>Explore our curated collection of interactive virtual tours</p>
          </div>

          {tours.length === 0 ? (
            <div className="no-tours">
              <Building2 size={64} />
              <h3>No tours available</h3>
              <p>Check back soon for new exciting virtual tours!</p>
              <button 
                className="primary-btn"
                onClick={() => navigate('/admin')}
              >
                Create Tour
              </button>
            </div>
          ) : (
            <div className="tours-grid">
              {tours.map((tour) => (
                <div 
                  key={tour.exhibitionId} 
                  className="tour-card"
                  onClick={() => navigate(`/exhibitions/${tour.exhibitionId}/tour`)}
                >
                  <div className="card-image">
                    <img 
                      src={getImageUrl(tour.images?.[0]?.fileUrl)} 
                      alt={tour.title}
                    />
                    <div className="card-overlay">
                      <div className="exhibit-count">
                        <Building2 size={16} />
                        <span>{tour._count.exhibits} exhibits</span>
                      </div>
                    </div>
                  </div>
                  <div className="card-content">
                    <h3 className="card-title">{tour.title}</h3>
                    <p className="card-description">{tour.description}</p>
                    <div className="card-footer">
                      <span className="explore-text">Explore Tour</span>
                      <ArrowRight size={16} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tours.length > 0 && (
            <div className="view-all-section">
              <button 
                className="view-all-btn"
                onClick={() => navigate('/exhibitions')}
              >
                View All Tours
                <ArrowRight size={20} />
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="container">
          <h2>Why Choose SmartExhibit?</h2>
          <div className="features-grid">
            <div className="feature-item">
              <div className="feature-icon">
                <QrCode size={32} />
              </div>
              <h3>Instant Access</h3>
              <p>Scan QR codes to instantly access rich multimedia content and detailed information about any exhibit.</p>
            </div>
            <div className="feature-item">
              <div className="feature-icon">
                <MapPin size={32} />
              </div>
              <h3>Smart Navigation</h3>
              <p>Find your way around with intelligent wayfinding and personalized exhibition recommendations.</p>
            </div>
            <div className="feature-item">
              <div className="feature-icon">
                <Sparkles size={32} />
              </div>
              <h3>AI-Powered Insights</h3>
              <p>Get personalized insights and deeper understanding with our AI-powered content recommendations.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-content">
            <h2>Ready to Start Your Smart Journey?</h2>
            <p>Join thousands of visitors who have transformed their museum experience with SmartExhibit</p>
            <div className="cta-actions">
              <button 
                className="primary-btn large"
                onClick={() => navigate('/scan')}
              >
                <QrCode size={24} />
                Begin Your Experience
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Homepage;