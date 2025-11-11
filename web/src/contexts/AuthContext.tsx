// contexts/AuthContext.tsx
// Authentication context for managing user state and authentication
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { getCurrentUser, logout } from "../utils/authUtils";
import type { UserData } from "../utils/authUtils";

interface AuthContextType {
  user: UserData | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasRole: (role: string) => boolean;
  hasPermission: (permission: string) => boolean;
  isAdmin: () => boolean;
  isSuperAdmin: () => boolean;
  isVisitor: () => boolean;
  login: (userData: UserData) => void;
  logout: () => void;
  refreshUserData: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUserData = () => {
    const userData = getCurrentUser();
    setUser(userData);
  };

  const login = (userData: UserData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    logout(); // Clear localStorage
    setUser(null);
  };

  const hasRole = (role: string): boolean => {
    return user?.roles?.includes(role) || false;
  };

  const hasPermission = (permission: string): boolean => {
    return user?.permissions?.includes(permission) || false;
  };

  const isAdmin = (): boolean => {
    return hasRole("admin") || hasRole("super admin");
  };

  const isSuperAdmin = (): boolean => {
    return hasRole("super admin");
  };

  const isVisitor = (): boolean => {
    return hasRole("visitor");
  };

  useEffect(() => {
    // Initialize user data on mount
    const userData = getCurrentUser();
    setUser(userData);
    setIsLoading(false);

    // Listen for login state changes
    const handleLoginStateChange = () => {
      const newUserData = getCurrentUser();
      setUser(newUserData);
    };

    window.addEventListener("loginStateChange", handleLoginStateChange);

    return () => {
      window.removeEventListener("loginStateChange", handleLoginStateChange);
    };
  }, []);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    hasRole,
    hasPermission,
    isAdmin,
    isSuperAdmin,
    isVisitor,
    login,
    logout: handleLogout,
    refreshUserData,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

