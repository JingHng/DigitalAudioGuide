/**
 * Avatar utility functions for generating user avatars
 */

export interface AvatarProps {
  fullName?: string;
  username?: string;
  email?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

/**
 * Generate initials from user information
 */
export const generateInitials = (fullName?: string, username?: string, email?: string): string => {
  // Try to get initials from username first
  if (username && username.trim()) {
    return username.substring(0, 2).toUpperCase();
  }
  
  // Fall back to full name
  if (fullName && fullName.trim()) {
    const names = fullName.trim().split(' ').filter(name => name.length > 0);
    if (names.length >= 2) {
      return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    } else if (names.length === 1) {
      return names[0].substring(0, 2).toUpperCase();
    }
  }
  
  // Fall back to email
  if (email && email.trim()) {
    const emailPrefix = email.split('@')[0];
    return emailPrefix.substring(0, 2).toUpperCase();
  }
  
  // Default fallback
  return 'AD';
};

/**
 * Generate a consistent color based on user information
 */
export const generateAvatarColor = (fullName?: string, username?: string, email?: string): string => {
  const text = username || fullName || email || 'default';
  
  // Simple hash function to generate consistent colors
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Generate colors with good contrast and professional appearance
  const colors = [
    'linear-gradient(135deg, #3b82f6, #1d4ed8)', // Blue
    'linear-gradient(135deg, #10b981, #059669)', // Green
    'linear-gradient(135deg, #f59e0b, #d97706)', // Orange
    'linear-gradient(135deg, #ef4444, #dc2626)', // Red
    'linear-gradient(135deg, #8b5cf6, #7c3aed)', // Purple
    'linear-gradient(135deg, #06b6d4, #0891b2)', // Cyan
    'linear-gradient(135deg, #84cc16, #65a30d)', // Lime
    'linear-gradient(135deg, #f97316, #ea580c)', // Orange-red
    'linear-gradient(135deg, #ec4899, #db2777)', // Pink
    'linear-gradient(135deg, #6366f1, #4f46e5)', // Indigo
  ];
  
  return colors[Math.abs(hash) % colors.length];
};

/**
 * Get size classes for avatar
 */
export const getAvatarSizeClasses = (size: 'sm' | 'md' | 'lg' | 'xl' = 'md'): { container: string; text: string } => {
  const sizeMap = {
    sm: { container: 'w-8 h-8 text-xs', text: 'text-xs' },
    md: { container: 'w-10 h-10 text-sm', text: 'text-sm' },
    lg: { container: 'w-16 h-16 text-lg', text: 'text-lg' },
    xl: { container: 'w-20 h-20 text-xl', text: 'text-xl' }
  };
  
  return sizeMap[size];
};

/**
 * Get CSS styles for avatar
 */
export const getAvatarStyles = (fullName?: string, username?: string, email?: string) => {
  return {
    background: generateAvatarColor(fullName, username, email),
    color: 'white',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    border: '2px solid rgba(255, 255, 255, 0.2)',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
  };
};