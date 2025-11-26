import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BookOpen, MapPin, Clock, ArrowLeft } from 'lucide-react';
import apiClient from '../utils/apiClient';

// Assuming you have a separate CSS file for this page
import '../css/CoursePage.css';

// --- Constants (Reused from HomePage) ---
const BACKEND_URL = import.meta.env.VITE_API_TARGET || '';
const DEFAULT_IMAGE_URL = `${BACKEND_URL}/public/images/SP_Course_Default.jpg`;

// --- Type Definitions ---
interface Image {
    imageId: string;
    fileUrl: string | null;
}

interface CourseDetail {
    courseId: string;
    title: string;
    description: string;
    shortDescription: string;
    images: Image[];
    location?: string;
    duration?: number; // In years
    schoolTitle: string; // Detail fetched from backend
    schoolId: string; // Detail fetched from backend
    entryRequirements: string;
    careerProspects: string;
}

const CoursePage: React.FC = () => {
    // Note: The URL uses '/courses/:courseId'
    const { courseId } = useParams<{ courseId: string }>(); 
    const navigate = useNavigate();
    
    // Using a more descriptive name for the course state
    const [courseDetail, setCourseDetail] = useState<CourseDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchCourseData = async () => {
            if (!courseId) {
                setLoading(false);
                setError("Invalid course ID provided.");
                return;
            }
            
            setLoading(true);
            setError(null);

            try {
                // Assuming the API endpoint is structured like /courses/:courseId
                const response = await apiClient.get(`/courses/${courseId}`);
                
                // IMPORTANT: Ensure the data structure returned by your API matches CourseDetail
                // If it doesn't match, you'll need to transform the response.
                setCourseDetail(response.data); 

            } catch (err) {
                console.error(`Error fetching course ${courseId}:`, err);
                setError("Failed to load course details. Please try again later.");
            } finally {
                setLoading(false);
            }
        };

        fetchCourseData();
    }, [courseId]);

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

    // --- RENDER CHECKS TO PREVENT TypeError ---

    if (loading) {
        return (
            <div className="course-page-loading flex items-center justify-center min-h-screen">
                <p>Loading Course Details...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="course-page-error p-8 text-center bg-red-100 text-red-700 rounded-lg m-10">
                <h2>Error Loading Data</h2>
                <p>{error}</p>
                <button 
                    onClick={() => navigate(-1)} 
                    className="mt-4 px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                >
                    Go Back
                </button>
            </div>
        );
    }

    // THIS CHECK IS CRUCIAL: Prevents the "Cannot read properties of undefined" error
    if (!courseDetail) {
        return (
            <div className="course-page-not-found p-8 text-center bg-yellow-100 text-yellow-700 rounded-lg m-10">
                <h2>Course Not Found</h2>
                <p>The requested course could not be located.</p>
                <button 
                    onClick={() => navigate('/')} 
                    className="mt-4 px-4 py-2 bg-yellow-200 rounded-lg hover:bg-yellow-300 transition-colors"
                >
                    Go to Home
                </button>
            </div>
        );
    }
    
    // After all checks, we can safely destructure or access properties
    const bannerImageUrl = getImageUrl(courseDetail.images?.[0]?.fileUrl);

    // --- MAIN RENDER LOGIC (Line 91 in your original file likely started here) ---
    return (
        <div className="course-page-container">
            {/* 1. Course Header/Banner */}
            <section className="course-header" style={{ backgroundImage: `url(${bannerImageUrl})` }}>
                <div className="header-overlay"></div>
                <div className="header-content">
                    {/* Button to go back to the school page */}
                    <button onClick={() => navigate(`/schools/${courseDetail.schoolId}`)} className="back-button">
                        <ArrowLeft size={16} /> Back to {courseDetail.schoolTitle || 'School'}
                    </button>
                    
                    <h1>{courseDetail.title}</h1>
                    <p className="course-short-description">{courseDetail.shortDescription}</p>

                    {/* Key Course Metrics */}
                    <div className="course-metrics">
                        <div className="metric-item">
                            <Clock size={20} />
                            <span>**{courseDetail.duration || 3}** Years Full-Time</span>
                        </div>
                        <div className="metric-item">
                            <MapPin size={20} />
                            <span>Location: **{courseDetail.location || 'Central Campus'}**</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* 2. Main Content Area (Description, Requirements, Career) */}
            <section className="course-body">
                <div className="content-wrapper">
                    <div className="main-content">
                        <h2>Course Overview</h2>
                        <p>{courseDetail.description}</p>

                        <div className="content-block">
                            <h3><BookOpen size={20} /> Entry Requirements</h3>
                            <div className="requirements-content" dangerouslySetInnerHTML={{ __html: courseDetail.entryRequirements }} />
                        </div>
                        
                        <div className="content-block">
                            <h3><Clock size={20} /> Career Prospects</h3>
                            <div className="prospects-content" dangerouslySetInnerHTML={{ __html: courseDetail.careerProspects }} />
                        </div>
                    </div>

                    {/* Sidebar / Call to Action (Optional, included for completeness) */}
                    <aside className="course-sidebar">
                        <h4>Ready to Apply?</h4>
                        <p>Applications are now open for the next intake. Don't miss out on your spot!</p>
                        <button className="apply-button">Apply Now</button>
                    </aside>
                </div>
            </section>
        </div>
    );
};

export default CoursePage;