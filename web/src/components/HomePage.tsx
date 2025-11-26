import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QrCode, ArrowRight, BookOpen, Clock, Layers } from 'lucide-react';
import apiClient from '../utils/apiClient';

import '../css/HomePage.css';

const BACKEND_URL = import.meta.env.VITE_API_TARGET || '';
const HERO_BACKGROUND_URL = `${BACKEND_URL}/public/images/BackgroundImage.jpg`;
const DEFAULT_IMAGE_URL = `${BACKEND_URL}/public/images/BackgroundImage.jpg`;

interface Image {
  imageId: string;
  fileUrl: string | null;
}
interface Course {
  courseId: string;
  title: string;
  description: string;
  images: Image[];
}
interface School {
  schoolId: string;
  title: string;
  description: string;
  images: Image[];
  courses: Course[];
}

const Homepage: React.FC = () => {
  const navigate = useNavigate();
  const [allSchools, setAllSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const response = await apiClient.get('/schools');
        setAllSchools(response.data);
      } catch (err: any) {
        if (err.response?.status !== 401) {
          console.error('Error fetching schools:', err);
        }
        setAllSchools([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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
      <div className="loading-state">
        <p>Loading the SP Open House Experience...</p>
      </div>
    );
  }

  return (
    <div className="homepage-container">
      <main>
        <section className="modern-hero-section" style={{ backgroundImage: `url(${HERO_BACKGROUND_URL})` }}>
          <div className="hero-overlay"></div>
          <div className="hero-content-left-aligned">
            <span className="hero-tagline">JANUARY 2026 OPEN HOUSE</span>
            <h1>Ready to Define Your Future?</h1>
            <p>
              Welcome to Singapore Polytechnic. <br />Explore our 11 Schools and 32+ Diplomas with the official digital guide.
            </p>
            <button className="main-cta-button" onClick={() => navigate('/scan')}>
              <QrCode size={24} />
              <span>Scan to View Course Details</span>
            </button>
          </div>
        </section>

        <section className="quick-action-section">
          <div className="action-block primary-action" onClick={() => navigate('/scan')}>
            <div className="icon-large"><QrCode size={40} /></div>
            <h3>Start Scanning</h3>
            <p>Use your camera to scan booth QR codes for course deep dives.</p>
          </div>
          <div className="action-block secondary-action" onClick={() => navigate('/schools')}>
            <div className="icon-large"><Layers size={40} /></div>
            <h3>Potential AR Content</h3>
            <p>Potential AR Content.</p>
          </div>
          <div className="action-block secondary-action" onClick={() => navigate('/map')}>
            <div className="icon-large"><Clock size={40} /></div>
            <h3>Potential AR Content</h3>
            <p>Might Implement AR Photobooth Here</p>
          </div>
        </section>

        <section id="schools" className="dynamic-school-grid-section">
          <div className="section-header-centered">
            <h2>Explore SP's Schools 🎓</h2>
            <p className="minimal-p">Click on a School to see a breakdown of all diploma courses under their expertise.</p>
          </div>

          <div className="school-cards-container">
            {allSchools.length === 0 ? (
              <div className="no-schools-message">
                <p>No Schools are currently listed for the Open House.</p>
              </div>
            ) : (
              allSchools.map((school) => (
                <div
                  key={school.schoolId}
                  className="modern-school-card"
                  onClick={() => navigate(`/schools/${school.schoolId}`)}
                >
                  <div className="card-image-wrapper">
                    <img src={getImageUrl(school.images?.[0]?.fileUrl)} alt={school.title} />
                  </div>
                  <div className="card-info-content">
                    <h3>{school.title}</h3>
                    <div className="card-details-row">
                      <span className="course-count-tag">
                        <BookOpen size={14} /> {school.courses?.length || 0} Diplomas
                      </span>
                    </div>
                    <p className="school-summary">{school.description}</p>
                  </div>
                  <div className="card-footer-link">
                    <span>View School</span>
                    <ArrowRight size={18} />
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="footer-content">
          <div className="footer-brand">
            <h3>SP Open House Guide</h3>
            <p>Your seamless guide to Singapore Polytechnic.</p>
          </div>
          <div className="footer-links">
            <h4>Navigation</h4>
            <a href="/schools">Schools</a>
            <a href="/map">Virtual Map</a>
          </div>
          <div className="footer-contact">
            <h4>Legal & Info</h4>
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Use</a>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} Singapore Polytechnic. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Homepage;
