import { createContext } from "react";

export interface AuthContextType {
  isAuthenticated: boolean;
  user: { email: string; username: string } | null;
  login: (email: string, password: string, username: string) => Promise<void>;
  register: (email: string, password: string, username: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
