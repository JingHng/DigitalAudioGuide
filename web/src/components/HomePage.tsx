import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QrCode, Headphones, Compass, ArrowRight } from 'lucide-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';
import axios from 'axios';

// --- Swiper CSS Imports ---
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

import '../css/HomePage.css'; 

// --- Constants for API and Default Image ---
const BACKEND_URL = import.meta.env.VITE_API_TARGET || '';
const DEFAULT_IMAGE_URL = `${BACKEND_URL}/public/images/SingaporeDiscoveryCentre.jpg`; 

// --- Type Definitions for API Data ---
interface Image {
  imageId: string;
  fileUrl: string | null; // e.g., '/images/adaptable.jpg'
}
interface Exhibit {
  exhibitId: string;
  title: string;
  description: string;
  images: Image[];
}

const Homepage: React.FC = () => {
  const navigate = useNavigate();
  const [featuredExhibits, setFeaturedExhibits] = useState<Exhibit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const response = await axios.get(`${BACKEND_URL}/api/exhibits`);
        // Add safety check to ensure response.data is an array
        const data = Array.isArray(response.data) ? response.data : [];
        const fetchedExhibits = data.slice(0, 6); 
        setFeaturedExhibits(fetchedExhibits);
      } catch (err) {
        console.error('Error fetching data:', err);
        // Ensure state remains an empty array on error
        setFeaturedExhibits([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // --- Loading State Check ---
  if (loading) {
    return (
      <div className="loading-state">
        <p>Loading the future of discovery...</p>
      </div>
    );
  }

  // Helper function to construct the correct image URL
  const getImageUrl = (fileUrl: string | null): string => {
    if (!fileUrl) return DEFAULT_IMAGE_URL;

    const cleanedPath = fileUrl.replace(/\\/g, '/');
    const imagePrefix = '/images/';
    const pathIndex = cleanedPath.indexOf(imagePrefix);

    if (pathIndex !== -1) {
      const filename = cleanedPath.substring(pathIndex + imagePrefix.length);
      // Final verified working URL structure
      return `${BACKEND_URL}/public/images/${filename}`;
    }
    return DEFAULT_IMAGE_URL;
  };

  return (
    <div className="homepage-container">
      <main>
        {/* ----------------------------------------------------- */}
        {/* --- 1. IMPACT HERO  --- */}
        <section className="hero-section split-hero">
          <div className="hero-text-content">
            <h1 className="minimal-h1">Unlock the Next Chapter of History.</h1>
            <p className="minimal-p">
              Experience the Singapore Story through interactive exhibits and personalized digital content. Your journey of discovery starts now.
            </p>
            <button className="hero-cta-button" onClick={() => navigate('/scan')}>
              <QrCode size={24} />
              <span>Scan to Start</span>
            </button>
            
            {/* --- Integrated Feature Blocks  --- */}
            <div className="feature-blocks-grid">
              <div className="feature-block">
                <div className="icon-wrapper"><QrCode size={28} /></div>
                <span>**Instant Scan**</span>
              </div>
              <div className="feature-block">
                <div className="icon-wrapper"><Headphones size={28} /></div>
                <span>**Audio Guide**</span>
              </div>
              <div className="feature-block">
                <div className="icon-wrapper"><Compass size={28} /></div>
                <span>**Map & Explore**</span>
              </div>
            </div>
          </div>
          
          {/* --- Image Half of the Split Hero --- */}
          <div className="hero-image-half">
            <img 
              src={DEFAULT_IMAGE_URL} 
              alt="Modern museum display" 
              className="hero-display-image" 
            />
          </div>
        </section>

        {/* ----------------------------------------------------- */}
        {/* --- 2. Featured Exhibits --- */}
        <section id="exhibits" className="exhibits-section">
          <div className="section-header-centered">
            <h2>Explore Our Featured Collections</h2>
          </div>

          <div className="exhibits-content">
            <a href="/exhibitions" className="view-all-link mobile-only">
                <span>View All Exhibits</span>
                <ArrowRight size={18} />
            </a>
            
            {!Array.isArray(featuredExhibits) || featuredExhibits.length === 0 ? (
              <div className="no-exhibits-message">
                <p>No featured exhibits are currently available.</p>
              </div>
            ) : (
              <Swiper
                modules={[Navigation, Pagination, Autoplay]}
                spaceBetween={25}
                loop={featuredExhibits.length > 3}
                navigation={true}
                pagination={{ clickable: true }}
                autoplay={{ delay: 4000, disableOnInteraction: false }}
                breakpoints={{
                  640: { slidesPerView: 1.1 },
                  768: { slidesPerView: 2.2 },
                  1024: { slidesPerView: 3.3 },
                }}
                className="exhibit-swiper"
              >
                {featuredExhibits.map((exhibit) => (
                  <SwiperSlide 
                    key={exhibit.exhibitId} 
                    onClick={() => navigate(`/exhibit/${exhibit.exhibitId}`)}
                  >
                    <div className="exhibit-card">
                      <div className="image-container">
                        <img 
                          src={getImageUrl(exhibit.images?.[0]?.fileUrl)} 
                          alt={exhibit.title} 
                        />
                      </div>
                      <div className="card-content">
                        <h3>{exhibit.title}</h3>
                        <p>{exhibit.description}</p>
                      </div>
                    </div>
                  </SwiperSlide>
                ))}
              </Swiper>
            )}

            <div className="view-all-button-wrapper">
                 <a href="/exhibitions" className="view-all-link desktop-only">
                    <span>View All Collections</span>
                    <ArrowRight size={18} />
                </a>
            </div>
          </div>
        </section>
        
        {/* ----------------------------------------------------- */}
        {/* --- 3. Simple Call to Action  --- */}
        <section className="cta-section">
            <div className="cta-content">
                <h3>Ready to Start Your Discovery?</h3>
                <p>Unlock deeper insights and personalized guidance as you explore the Centre.</p>
                <button className="cta-button" onClick={() => navigate('/scan')}>
                    <QrCode size={20} />
                    Begin Scanning Now
                </button>
            </div>
        </section>

      </main>

      {/* ----------------------------------------------------- */}
      {/* --- Footer  --- */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-brand">
            <h3>SDC Digital Guide</h3>
            <p>A seamless guide to the Singapore Discovery Centre.</p>
          </div>
          <div className="footer-links">
            <h4>Navigation</h4>
            <a href="/exhibitions">Exhibits</a>
            <a href="/map">Virtual Map</a>
          </div>
          <div className="footer-contact">
            <h4>Legal & Info</h4>
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Use</a>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} Singapore Discovery Centre. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Homepage;