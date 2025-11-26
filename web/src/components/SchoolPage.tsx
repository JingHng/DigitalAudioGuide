import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BookOpen, Layers, MapPin, ArrowRight } from 'lucide-react';
import apiClient from '../utils/apiClient';

import '../css/SchoolPage.css';

// --- Constants (Reused from HomePage) ---
const BACKEND_URL = import.meta.env.VITE_API_TARGET || '';
const DEFAULT_IMAGE_URL = `${BACKEND_URL}/public/images/SP_Campus_Default.jpg`;

// --- Type Definitions ---
interface Image {
    imageId: string;
    fileUrl: string | null;
}
interface Course {
    courseId: string;
    title: string;
    shortDescription: string;
    images: Image[];
    // Assume we also fetch location and duration data for the course
    location?: string; 
    duration?: number; // In years
}
interface School {
    schoolId: string;
    title: string;
    description: string;
    images: Image[];
    contactEmail: string;
    locationBlock: string;
    courses: Course[];
}

const SchoolPage: React.FC = () => {
    const { schoolId } = useParams<{ schoolId: string }>();
    const navigate = useNavigate();
    const [school, setSchool] = useState<School | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            if (!schoolId) return;
            setLoading(true);
            try {
                // Fetch school details by ID, including nested courses
                const response = await apiClient.get(`/schools/${schoolId}`);
                setSchool(response.data);
            } catch (err) {
                console.error(`Error fetching school ${schoolId}:`, err);
                // Optionally navigate to a 404 page
            } finally {
                setLoading(false);
            }
        })();
    }, [schoolId]);

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
        return <div className="loading-state"><p>Loading School Data...</p></div>;
    }

    if (!school) {
        return <div className="error-state"><p>School not found.</p></div>;
    }

    // Use the first image for the banner, or a default fallback
    const bannerImageUrl = getImageUrl(school.images?.[0]?.fileUrl);

    return (
        <div className="school-page-container">
            {/* 1. School Banner Section */}
            <section className="school-banner" style={{ backgroundImage: `url(${bannerImageUrl})` }}>
                <div className="banner-overlay"></div>
                <div className="banner-content">
                    <span className="school-tagline">SP Faculty</span>
                    <h1>{school.title}</h1>
                    <p className="school-description-long">{school.description}</p>
                    
                    {/* Key Metrics/Facts */}
                    <div className="school-key-facts">
                        <div className="fact-item">
                            <BookOpen size={24} />
                            <span>**{school.courses.length}** Diplomas</span>
                        </div>
                        <div className="fact-item">
                            <MapPin size={24} />
                            <span>Block **{school.locationBlock}**</span>
                        </div>
                        <div className="fact-item">
                            <Layers size={24} />
                            <span>Established Expertise</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* 2. Course Grid Section */}
            <section className="course-grid-section">
                <div className="section-header-left">
                    <h2>Explore Our Diploma Courses</h2>
                    <p>Dive deep into the curriculum, career prospects, and entry requirements for each course.</p>
                </div>

                <div className="course-cards-container">
                    {school.courses.map(course => (
                        <div 
                            key={course.courseId} 
                            className="course-card"
                            onClick={() => navigate(`/courses/${course.courseId}`)}
                        >
                            <div className="course-card-image-wrapper">
                                <img 
                                    src={getImageUrl(course.images?.[0]?.fileUrl)} 
                                    alt={course.title}
                                />
                            </div>
                            <div className="course-card-content">
                                <h3>{course.title}</h3>
                                <p className="course-summary">{course.shortDescription || school.description}</p>
                                <div className="course-card-footer">
                                    <span>View Details</span>
                                    <ArrowRight size={18} />
                                </div>
                            </div>
                        </div>
                    ))}
                    {school.courses.length === 0 && (
                        <div className="no-courses-message">
                            <p>No diploma courses currently listed for this school.</p>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
};

export default SchoolPage;