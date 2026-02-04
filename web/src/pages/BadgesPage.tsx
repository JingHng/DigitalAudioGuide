import { useEffect, useState } from "react";
import apiClient from "../utils/apiClient";
import "../css/BadgesPage.css";

const BACKEND_URL = import.meta.env.VITE_API_TARGET || '';

interface Badge {
    badgeId: string;
    name: string;
    description: string;
    imageUrl: string;
    exhibit?: {
        exhibitId: string;
        title: string;
        exhibition?: {
            exhibitionId: string;
            title: string;
        };
    };
}

interface GroupedBadges {
    [exhibitionTitle: string]: Badge[];
}

const BadgesPage = () => {
    const [badges, setBadges] = useState<Badge[]>([]);
    const [groupedBadges, setGroupedBadges] = useState<GroupedBadges>({});
    const [loading, setLoading] = useState(true);
    const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);

    useEffect(() => {
        const fetchBadges = async () => {
            try {
                const response = await apiClient.get("/badges/allBadges");
                const badgeData = Array.isArray(response.data) ? response.data : [];
                setBadges(badgeData);
                
                // Group badges by exhibition/tour
                const grouped: GroupedBadges = {};
                badgeData.forEach((badge: Badge) => {
                    const tourName = badge.exhibit?.exhibition?.title || "General Badges";
                    if (!grouped[tourName]) {
                        grouped[tourName] = [];
                    }
                    grouped[tourName].push(badge);
                });
                
                setGroupedBadges(grouped);
            } catch (error) {
                console.error("Failed to fetch badges:", error);
                setBadges([]);
            } finally {
                setLoading(false);
            }
        };

        fetchBadges();
    }, []);

    const openModal = (badge: Badge) => {
        setSelectedBadge(badge);
    };

    const closeModal = () => {
        setSelectedBadge(null);
    };

    if (loading) {
        return (
            <div className="badges-page">
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p>Loading badges...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="badges-page">
            {/* Hero Section */}
            <div className="badges-hero">
                <h1 className="badges-title">Badge Collection</h1>
                <p className="badges-subtitle">
                    Explore all the amazing badges you can unlock during your museum journey!
                </p>
            </div>

            {/* Badges Grid */}
            <main className="public-badges-container">
                {badges.length === 0 ? (
                    <div className="no-badges-message">
                        <p>No badges available yet. Check back soon!</p>
                    </div>
                ) : (
                    <>
                        {Object.entries(groupedBadges).map(([tourName, tourBadges]) => (
                            <div key={tourName} className="tour-section">
                                <h2 className="tour-title">{tourName}</h2>
                                <p className="tour-badge-count">
                                    {tourBadges.length} {tourBadges.length === 1 ? 'badge' : 'badges'} to collect
                                </p>
                                
                                <div className="public-badges-grid">
                                    {tourBadges.map((badge) => (
                                        <div 
                                            key={badge.badgeId} 
                                            className="public-badge-card"
                                            onClick={() => openModal(badge)}
                                        >
                                            <div className="public-badge-image-wrapper">
                                                <img
                                                    src={`${BACKEND_URL}/public${badge.imageUrl}`}
                                                    alt={badge.name}
                                                    className="public-badge-image"
                                                />
                                            </div>
                                            <div className="public-badge-info">
                                                <h3 className="public-badge-name">{badge.name}</h3>
                                                <p className="public-badge-description">{badge.description}</p>
                                                {badge.exhibit && (
                                                    <div className="public-badge-unlock-info">
                                                        <span className="unlock-icon">🎯</span>
                                                        <span className="unlock-text">Visit: {badge.exhibit.title}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </>
                )}
            </main>

            {/* Modal for Badge Details */}
            {selectedBadge && (
                <div 
                    className="badge-modal-overlay"
                    onClick={closeModal}
                >
                    <div 
                        className="badge-modal-content"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button className="modal-close-btn" onClick={closeModal}>
                            ×
                        </button>
                        <div className="modal-badge-image">
                            <img
                                src={`${BACKEND_URL}/public${selectedBadge.imageUrl}`}
                                alt={selectedBadge.name}
                            />
                        </div>
                        <h2 className="modal-badge-name">{selectedBadge.name}</h2>
                        <p className="modal-badge-description">{selectedBadge.description}</p>
                        
                        {selectedBadge.exhibit && (
                            <div className="modal-unlock-details">
                                <h3>How to Unlock</h3>
                                <div className="unlock-requirement">
                                    <span className="requirement-label">Exhibit:</span>
                                    <span className="requirement-value">{selectedBadge.exhibit.title}</span>
                                </div>
                                {selectedBadge.exhibit.exhibition && (
                                    <div className="unlock-requirement">
                                        <span className="requirement-label">Tour:</span>
                                        <span className="requirement-value">{selectedBadge.exhibit.exhibition.title}</span>
                                    </div>
                                )}
                            </div>
                        )}
                        
                        <div className="modal-hint">
                            <p>💡 Visit the exhibit during your museum tour to unlock this badge!</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BadgesPage;
