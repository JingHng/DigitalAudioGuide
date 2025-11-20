import React from "react";
import "./css/earnBadgeModal.css";

interface EarnBadgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  exhibitTitle: string;
  badgeImageUrl?: string;
  className?: string;
}

const EarnBadgeModal: React.FC<EarnBadgeModalProps> = ({
  isOpen,
  onClose,
  exhibitTitle,
  badgeImageUrl,
}) => {
  if (!isOpen) return null;

  // Placeholder image: you can replace it with a real badge image in /public
  const placeholderBadgeUrl = "/assets/badge-placeholder.png";

  // Prefer backend badge image, fall back to placeholder
  const displayBadgeUrl = badgeImageUrl || placeholderBadgeUrl;

  return (
    <div className="earn-badge-modal-overlay">
      <div className="earn-badge-modal">
        <div className="earn-badge-modal-image-wrapper">
          <img
            src={displayBadgeUrl}
            alt={`${exhibitTitle} badge`}
            className="earn-badge-image"
          />
        </div>

        <h2 className="earn-badge-title">Badge unlocked!</h2>
        <p className="earn-badge-text">
          You&apos;ve earned the <strong>&quot;{exhibitTitle}&quot;</strong> badge.
        </p>

        <button className="earn-badge-button" onClick={onClose}>
          Keep exploring
        </button>
      </div>
    </div>
  );
};

export default EarnBadgeModal;
