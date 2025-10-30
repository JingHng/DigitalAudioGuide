import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';
import type { ReactNode } from 'react';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  // Don't redirect while checking auth state
  if (isLoading) {
    // Render a loading indicator but preserve layout
    return (
      <>
        <div className="flex items-center justify-center flex-1">
          <div className="text-slate-600">Loading...</div>
        </div>
      </>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
