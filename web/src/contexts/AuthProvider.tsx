import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { AuthContext } from './AuthContext';
import type { AuthContextType } from './AuthContext';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    // Initialize from localStorage
    try {
      const stored = localStorage.getItem('auth');
      if (stored) {
        const data = JSON.parse(stored);
        return !!(data.accessToken && data.refreshToken);
      }
    } catch (error) {
      console.error('Error reading auth from localStorage:', error);
    }
    return false;
  });
  
  const [user, setUser] = useState<AuthContextType['user']>(() => {
    // Initialize from localStorage
    try {
      const stored = localStorage.getItem('auth');
      if (stored) {
        const data = JSON.parse(stored);
        return data.user || null;
      }
    } catch (error) {
      console.error('Error reading user from localStorage:', error);
    }
    return null;
  });

  // Mark loading as complete after initial state is set
  useEffect(() => {
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string, username: string) => {
    // JWT authentication with access and refresh tokens
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, username })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Login failed');
      }

      const userData = await response.json();
      const authData = {
        accessToken: userData.accessToken,
        refreshToken: userData.refreshToken,
        user: { 
          email: userData.email, 
          username: userData.username 
        }
      };
      
      // Persist tokens and user to localStorage
      localStorage.setItem('auth', JSON.stringify(authData));
      
      setIsAuthenticated(true);
      setUser(authData.user);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const register = async (email: string, password: string, username: string) => {
    // User registration with standard user role
    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, username })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Registration failed');
      }

      const userData = await response.json();
      const authData = {
        accessToken: userData.accessToken,
        refreshToken: userData.refreshToken,
        user: { 
          email: userData.email, 
          username: userData.username 
        }
      };
      
      // Persist tokens and user to localStorage
      localStorage.setItem('auth', JSON.stringify(authData));
      
      setIsAuthenticated(true);
      setUser(authData.user);
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  // Remove effect syncing isAuthenticated with localStorage

  const logout = () => {
    // Clear localStorage
    localStorage.removeItem('auth');
    setIsAuthenticated(false);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, register, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}
