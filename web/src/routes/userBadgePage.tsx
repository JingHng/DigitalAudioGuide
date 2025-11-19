import { useEffect, useState } from "react";
import apiClient from "../utils/apiClient";
import "../css/userBadgePage.css";

const BACKEND_URL = import.meta.env.VITE_API_TARGET || '';

const userBadgePage = () => {
    type Badge = {
        badgeId: string;
        name: string;
        description: string;
        imageUrl: string;
    };
  const [allBadges, setAllBadges] = useState<Badge[]>([]);
  const [userBadges, setUserBadges] = useState<Badge[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  useEffect(() => {
  const fetchBadges = async () => {
    try {
      const all = await apiClient.get("/badges/allBadges");
      const owned = await apiClient.get("/badges/userBadges");
      
      setAllBadges(Array.isArray(all.data) ? all.data : []);
      setUserBadges(Array.isArray(owned.data.data) ? owned.data.data : []);
    } catch (error) {
      console.error("Failed to fetch badges:", error);
      setAllBadges([]);
      setUserBadges([]);
    }
  };

  fetchBadges();
}, []);


  const isOwned = (badgeId: string) =>
    userBadges.some((b) => b.badgeId === badgeId);

  const openModal = (index: number) => {
    setSelectedIndex(index);
  };

  const closeModal = () => setSelectedIndex(null);

  const prevBadge = () => {
    setSelectedIndex((prev) => {
      if (prev === null || allBadges.length === 0) return 0;
      return (prev - 1 + allBadges.length) % allBadges.length;
    });
  };

  const nextBadge = () => {
    setSelectedIndex((prev) => {
      if (prev === null || allBadges.length === 0) return 0;
      return (prev + 1) % allBadges.length;
    });
  };

  return (
    <div className="min-h-screen flex flex-col px-4 font-sans">
      {/* Main Content */}
      <main className="py-12 px-4 md:px-12">
        <h1 className="text-4xl font-bold mb-6 text-center">Your Badge Collection</h1>
        {allBadges.length === 0 ? (
          <p className="no-badge-message text-center text-gray-500">No badges available yet.</p>
        ) : (
          <div className="badge-grid">
            {allBadges.map((badge, index) => {
              const owned = isOwned(badge.badgeId);
              return (
                <div key={badge.badgeId} className="badge-wrapper">
                  <img
                    src={`${BACKEND_URL}/public${badge.imageUrl}`}
                    alt={badge.name}
                    className={`badge-img ${owned ? "" : "grayscale"}`}
                    onClick={() => openModal(index)}
                    style={{ cursor: "pointer" }}
                  />
                  {!owned && <div className="badge-locked-text">Locked</div>}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Modal */}
      {selectedIndex !== null && (
        <div className="modal-overlay" onClick={closeModal}>
          <div
            className="modal-window modal-window-small"
            onClick={(e) => e.stopPropagation()}
          >
            <button className="modal-close" onClick={closeModal}>×</button>
            <img
              src={`${BACKEND_URL}/public${allBadges[selectedIndex].imageUrl}`}
              alt={allBadges[selectedIndex].name}
              className={`modal-img ${isOwned(allBadges[selectedIndex].badgeId) ? "" : "grayscale"}`}
            />
            {isOwned(allBadges[selectedIndex].badgeId) ? (
              <>
                <h2 className="modal-title">{allBadges[selectedIndex].name}</h2>
                <p className="modal-desc">{allBadges[selectedIndex].description}</p>
              </>
            ) : (
              <div className="modal-locked-text">This badge is locked</div>
            )}
            <div className="modal-nav">
              <button onClick={prevBadge}>←</button>
              <button onClick={nextBadge}>→</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default userBadgePage;
