import React from 'react';
import { generateInitials, getAvatarStyles } from '../../utils/avatarUtils';

export interface AvatarProps {
  fullName?: string;
  username?: string;
  email?: string;
  size?: number;
  className?: string;
  onClick?: () => void;
  showTooltip?: boolean;
}

const Avatar: React.FC<AvatarProps> = ({
  fullName,
  username,
  email,
  size = 40,
  className = '',
  onClick,
  showTooltip = false
}) => {
  const initials = generateInitials(fullName, username, email);
  const styles = getAvatarStyles(fullName, username, email);
  
  const displayName = fullName || username || email?.split('@')[0] || 'Admin User';
  
  const avatarStyle = {
    ...styles,
    width: `${size}px`,
    height: `${size}px`,
    fontSize: `${Math.max(size * 0.4, 12)}px`,
    cursor: onClick ? 'pointer' : 'default',
    transition: 'all 0.2s ease'
  };

  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  return (
    <div
      className={`admin-avatar ${className}`}
      style={avatarStyle}
      onClick={handleClick}
      title={showTooltip ? displayName : undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {initials}
    </div>
  );
};

export default Avatar;