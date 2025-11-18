// components/ProtectedRoute.tsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
  requiredPermissions?: string[];
  requireAuth?: boolean;
  fallbackPath?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRoles = [],
  requiredPermissions = [],
  requireAuth = true,
  fallbackPath = "/login",
}) => {
  const { user, isAuthenticated, hasRole, hasPermission, isLoading } =
    useAuth();
  const location = useLocation();

  // Show loading while checking auth status
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // Check if authentication is required and user is not authenticated
  if (requireAuth && !isAuthenticated) {
    return <Navigate to={fallbackPath} state={{ from: location }} replace />;
  }

  // Check if user has required roles
  if (requiredRoles.length > 0) {
    const hasRequiredRole = requiredRoles.some((role) => hasRole(role));
    if (!hasRequiredRole) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  // Check if user has required permissions
  if (requiredPermissions.length > 0) {
    const hasRequiredPermission = requiredPermissions.some((permission) =>
      hasPermission(permission)
    );
    if (!hasRequiredPermission) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <>{children}</>;
};

// Specific route components for common use cases
export const AdminRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <ProtectedRoute requiredRoles={["admin", "super admin"]}>
    {children}
  </ProtectedRoute>
);

export const SuperAdminRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <ProtectedRoute requiredRoles={["super admin"]}>{children}</ProtectedRoute>
);

export const VisitorRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => <ProtectedRoute requiredRoles={["visitor"]}>{children}</ProtectedRoute>;

export default ProtectedRoute;
