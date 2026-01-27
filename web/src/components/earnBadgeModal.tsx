import React, { useEffect, useMemo } from "react";
import "./css/earnBadgeModal.css";

interface EarnBadgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  exhibitTitle: string;
  badgeImageUrl?: string;
  autoCloseMs?: number;
}

const EarnBadgeModal: React.FC<EarnBadgeModalProps> = ({
  isOpen,
  onClose,
  exhibitTitle,
  badgeImageUrl,
  autoCloseMs = 3500,
}) => {
  // auto close
  useEffect(() => {
    if (!isOpen) return;
    const t = window.setTimeout(onClose, autoCloseMs);
    return () => window.clearTimeout(t);
  }, [isOpen, onClose, autoCloseMs]);

  const placeholderBadgeUrl = "/assets/badge-placeholder.png";
  const displayBadgeUrl = useMemo(() => badgeImageUrl || placeholderBadgeUrl, [badgeImageUrl]);

  if (!isOpen) return null;

  return (
    <div className="earn-badge-toast" role="status" aria-live="polite">
      <img src={displayBadgeUrl} alt="badge" className="earn-badge-toast-img" />

      <div className="earn-badge-toast-content">
        <div className="earn-badge-toast-title">You claimed a new badge!</div>
        <div className="earn-badge-toast-text">{exhibitTitle}</div>
      </div>

      <button className="earn-badge-toast-close" onClick={onClose} aria-label="close">
        x
      </button>
    </div>
  );
};

export default EarnBadgeModal;
