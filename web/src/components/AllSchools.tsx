// AllSchoolsPage.tsx - Displays a list of all schools in the polytechnic.

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, BookOpen, MapPin } from 'lucide-react';
import apiClient from '../utils/apiClient';

import '../css/AllSchools.css'; 
import '../css/HomePage.css'; // Re-use card styling from HomePage

// --- Constants ---
const BACKEND_URL = import.meta.env.VITE_API_TARGET || '';
const DEFAULT_IMAGE_URL = `${BACKEND_URL}/public/images/SP_Campus_Default.jpg`;

// --- Type Definitions (Minimal for Listing) ---
interface Image {
    imageId: string;
    fileUrl: string | null;
}
interface School {
    schoolId: string;
    title: string;
    shortDescription: string;
    images: Image[];
    courseCount: number; // Assuming the backend provides this count directly
}

const AllSchoolsPage: React.FC = () => {
    const navigate = useNavigate();
    const [schools, setSchools] = useState<School[]>([]);
    const [loading, setLoading] = useState(true);

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
    
    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                // Fetch the list of all schools
                const response = await apiClient.get('/schools');
                setSchools(response.data);
            } catch (err) {
                console.error('Error fetching all schools:', err);
                // In a real app, show an error message to the user
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    if (loading) {
        return <div className="loading-state"><p>Loading All Schools...</p></div>;
    }

    return (
        <div className="all-schools-page-container">
            <header className="page-header">
                <h1>Our Schools & Faculties</h1>
                <p>Find the perfect fit for your passion among our diverse range of faculties and their diploma offerings.</p>
            </header>

            <section className="school-grid-section">
                {schools.length === 0 ? (
                    <div className="no-schools-message">
                        <p>No schools found at this time.</p>
                    </div>
                ) : (
                    <div className="school-cards-container">
                        {schools.map(school => (
                            <div 
                                key={school.schoolId} 
                                className="modern-school-card"
                                onClick={() => navigate(`/schools/${school.schoolId}`)}
                            >
                                <div className="card-image-wrapper">
                                    <img 
                                        src={getImageUrl(school.images?.[0]?.fileUrl)} 
                                        alt={school.title}
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).onerror = null; 
                                            (e.target as HTMLImageElement).src = DEFAULT_IMAGE_URL; 
                                        }}
                                    />
                                </div>
                                <div className="card-info-content">
                                    <h3>{school.title}</h3>
                                    <div className="card-details-row">
                                        <span className="course-count-tag">
                                            <BookOpen size={16} />
                                            {school.courseCount || 0} Diplomas
                                        </span>
                                    </div>
                                    <p className="school-summary">
                                        {school.shortDescription}
                                    </p>
                                </div>
                                <div className="card-footer-link">
                                    View School Details
                                    <ArrowRight size={18} />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
};

export default AllSchoolsPage;