export interface UserData {
  userId: string;
  username: string;
  roles: string[];
  permissions: string[];
  timestamp: string;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: {
    userId: string;
    username: string;
    roles: string[];
    permissions: string[];
  };
}

/**
 * Decode JWT token to get user data
 */
export const decodeToken = (token: string): UserData | null => {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error("Error decoding token:", error);
    return null;
  }
};

/**
 * Get current user data from localStorage token
 */
export const getCurrentUser = (): UserData | null => {
  const token = localStorage.getItem("token");
  if (!token) return null;
  return decodeToken(token);
};

/**
 * Check if user has a specific role
 */
export const hasRole = (roleName: string): boolean => {
  const user = getCurrentUser();
  return user?.roles.includes(roleName) || false;
};

/**
 * Check if user has a specific permission
 */
export const hasPermission = (permissionName: string): boolean => {
  const user = getCurrentUser();
  return user?.permissions.includes(permissionName) || false;
};

/**
 * Check if user has any of the specified roles
 */
export const hasAnyRole = (roleNames: string[]): boolean => {
  const user = getCurrentUser();
  if (!user) return false;
  return roleNames.some((role) => user.roles.includes(role));
};

/**
 * Check if user has any of the specified permissions
 */
export const hasAnyPermission = (permissionNames: string[]): boolean => {
  const user = getCurrentUser();
  if (!user) return false;
  return permissionNames.some((permission) =>
    user.permissions.includes(permission)
  );
};

/**
 * Check if user is admin (has admin or super admin role)
 */
export const isAdmin = (): boolean => {
  return hasAnyRole(["admin", "super admin"]);
};

/**
 * Check if user is super admin
 */
export const isSuperAdmin = (): boolean => {
  return hasRole("super admin");
};

/**
 * Check if user is visitor
 */
export const isVisitor = (): boolean => {
  return hasRole("visitor");
};

/**
 * Get user's highest role priority
 * Returns: 0 = visitor, 1 = admin, 2 = super admin
 */
export const getUserRolePriority = (): number => {
  if (isSuperAdmin()) return 2;
  if (isAdmin()) return 1;
  if (isVisitor()) return 0;
  return -1; // No valid role
};

/**
 * Check if token is expired
 */
export const isTokenExpired = (): boolean => {
  const user = getCurrentUser();
  if (!user) return true;

  const now = new Date().getTime() / 1000;
  const tokenTime = new Date(user.timestamp).getTime() / 1000;

  // Check if token is older than configured expiration time
  // You might want to adjust this based on your JWT_EXPIRES_IN setting
  const expirationTime = 24 * 60 * 60; // 24 hours in seconds

  return now - tokenTime > expirationTime;
};

/**
 * Clear user session and all related data
 */
export const logout = (): void => {
  // Clear all auth-related data from localStorage
  localStorage.removeItem("token");
  localStorage.removeItem("userData");
  localStorage.removeItem("userType");

  // Clear any other app-specific data you might have stored
  // localStorage.removeItem('preferences');
  // localStorage.removeItem('cart');

  // Dispatch event to notify components
  window.dispatchEvent(new Event("loginStateChange"));
};



