import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Loader2, MapPin, Building2, Sparkles } from 'lucide-react';
import apiClient from '../utils/apiClient';
import '../styles/SmartExhibit.css';

const BACKEND_URL = import.meta.env.VITE_API_TARGET || '';
const DEFAULT_IMAGE_URL = `${BACKEND_URL}/public/images/SmartExhibit.avif`;

interface Tour {
  exhibitionId: string;
  title: string;
  description: string;
  _count: { exhibits: number };
  images: Array<{ fileUrl: string; isPrimary?: boolean }> | null;
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

const ToursPage: React.FC = () => {
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTours = async () => {
      try {
        const response = await fetch('/api/exhibitions');
        if (response.ok) {
          const data = await response.json();
          const rawTours: any[] = Array.isArray(data) ? data : [];

          // Enrich each tour with an averageRating computed from its exhibits' review stats
          const enriched = await Promise.all(rawTours.map(async (tour) => {
            try {
              // Fetch exhibition details to get exhibits list
              const exRes = await apiClient.get(`/exhibitions/${tour.exhibitionId}`);
              const exhibits = exRes.data?.exhibits || [];
              if (!Array.isArray(exhibits) || exhibits.length === 0) {
                return { ...tour, averageRating: 0 };
              }

              // Fetch stats for each exhibit
              const statsPromises = exhibits.map((ex: any) => apiClient.get(`/reviews/exhibit/${ex.exhibitId}/stats`).then(r => r.data?.data).catch(() => null));
              const stats = await Promise.all(statsPromises);

              // Compute weighted average by total_reviews when available
              let weightedSum = 0;
              let totalReviews = 0;
              stats.forEach((s: any) => {
                if (s && typeof s.average_rating === 'number' && s.total_reviews) {
                  weightedSum += Number(s.average_rating) * Number(s.total_reviews);
                  totalReviews += Number(s.total_reviews);
                }
              });

              let avg = 0;
              if (totalReviews > 0) {
                avg = weightedSum / totalReviews;
              } else {
                // fallback: average of averages where available
                const avgVals = stats.filter((s: any) => s && typeof s.average_rating === 'number').map((s: any) => Number(s.average_rating));
                if (avgVals.length > 0) avg = avgVals.reduce((a,b) => a+b, 0) / avgVals.length;
              }

              return { ...tour, averageRating: Number(avg.toFixed(1)) };
            } catch (err) {
              return { ...tour, averageRating: 0 };
            }
          }));

          setTours(enriched);
        } else {
          console.error('Failed to fetch tours');
          setTours([]);
        }
      } catch (err: any) {
        console.error('Error fetching tours:', err);
        setTours([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTours();
  }, []);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading SmartExhibit Tours...</p>
      </div>
    );
  }

  return (
    <div className="smart-exhibit-home">
      {/* Header Section with Stats */}
      <section className="tours-header">
        <div className="container">
          <div className="tours-header-content">
            <div className="tours-intro">
              <h1 className="tours-main-title">
                Explore <span className="smart-gradient">Virtual Tours</span>
              </h1>
              <p className="tours-description">
                Immerse yourself in our carefully curated collection of interactive virtual experiences. 
                Each tour features unique exhibits designed to educate, inspire, and entertain.
              </p>
              <div className="tours-stats">
                <div className="stat-item">
                  <span className="stat-number">{tours.length}</span>
                  <span className="stat-label">Available Tours</span>
                </div>
                <div className="stat-item">
                  <span className="stat-number">{tours.reduce((total, tour) => total + tour._count.exhibits, 0)}</span>
                  <span className="stat-label">Total Exhibits</span>
                </div>
              </div>
            </div>
            <div className="tours-visual">
              <div className="tours-preview-grid">
                {tours.slice(0, 4).map((tour, index) => (
                  <div key={tour.exhibitionId} className={`preview-card preview-${index + 1}`}>
                    <img 
                      src={getImageUrl(tour.images?.[0]?.fileUrl)} 
                      alt={tour.title}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tours Collection */}
      <section className="tours-collection">
        <div className="container">
          {tours.length === 0 ? (
            <div className="no-tours">
              <Building2 size={64} />
              <h3>No tours available</h3>
              <p>Check back soon for new exciting virtual tours!</p>
            </div>
          ) : (
            <>
              <div className="collection-header">
                <h2>Tour Collection</h2>
                <p>Browse all available virtual experiences</p>
              </div>
              <div className="tours-grid-enhanced">
                {tours.map((tour, index) => (
                  <Link 
                    to={`/exhibitions/${tour.exhibitionId}`} 
                    key={tour.exhibitionId} 
                    className="tour-card-enhanced"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="tour-card-inner">
                      <div className="card-image-enhanced">
                        <img 
                          src={getImageUrl(tour.images?.[0]?.fileUrl)} 
                          alt={tour.title} 
                          loading="lazy"
                        />
                        <div className="card-badge">
                          <span>{tour._count.exhibits} exhibits</span>
                        </div>
                        <div className="card-hover-overlay">
                          <div className="explore-btn">
                            <span>Explore Tour</span>
                            <ArrowRight size={20} />
                          </div>
                        </div>
                      </div>
                      <div className="card-content-enhanced">
                        <h3>{tour.title}</h3>
                          <p>{tour.description}</p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                            <div style={{ color: '#f5b301', fontSize: 18 }}>
                              {Array.from({ length: 5 }).map((_, i) => (
                                <span key={i} style={{ color: (tour as any).averageRating && i < (tour as any).averageRating ? '#FFD700' : '#ccc', fontSize: '1.1em' }}>★</span>
                              ))}
                            </div>
                            <div style={{ color: '#555', fontSize: '0.95em' }}>{(tour as any).averageRating ? (tour as any).averageRating.toFixed ? (tour as any).averageRating.toFixed(1) : String((tour as any).averageRating) : '—'} / 5</div>
                          </div>
                        <div className="tour-meta">
                          <div className="tour-type">
                            <Sparkles size={16} />
                            <span>Interactive Experience</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
};

export default ToursPage;