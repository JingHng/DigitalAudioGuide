import { Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from "react";

// --- Context & Utilities ---
import { AuthProvider } from "./contexts/AuthContext";
// import { ensureLanguagePersistence } from "./utils/languageUtils";
import Navbar from "./components/Navbar.tsx";
import Homepage from "./components/HomePage.tsx";

// --- COMMENTED OUT: Auth & User Components ---
import LoginPage from "./components/LoginPage";
import RegisterPage from "./routes/RegisterPage";
import ForgotPasswordPage from "./components/ForgotPasswordPage";
import ResetPasswordPage from "./components/ResetPasswordPage";
import EmailVerificationPage from "./routes/EmailVerificationPage";
// import UserDashboard from "./components/UserDashboard";
import ScanPage from "./components/ScanPage.tsx";
import UserBadgePage from "./routes/userBadgePage.tsx";

// --- MODIFIED/NEW IMPORTS FOR EXHIBITIONS --- (KEEP ALL)
import AllExhibitions from "./components/ExhibitionsPage.tsx";
import ExhibitionDetails from "./components/ExhibitionDetailsPage.tsx"; 
import ExhibitDetails from "./components/ExhibitDetails.tsx";
import ARPhotobooth from "./components/ARPhotobooth.tsx";
import ReviewsPage from "./pages/ReviewsPage";

// --- COMMENTED OUT: Other Public/Protected Components ---
// import ReviewPage from "./components/reviewPage/ReviewPage";
import ProtectedRoute, { AdminRoute } from "./components/ProtectedRoute";

// --- Admin Components ---
import AdminDashboard from "./components/admin/AdminDashboard";
import ExhibitsPage from "./components/admin/ExhibitsPage";
import RolesPage from "./components/admin/RolesPage";
import UsersPage from "./components/admin/UsersPage";
import AuditLogsPage from "./components/admin/AuditLogsPage";
import AudioAnalyticsPage from "./components/admin/AudioAnalyticsPage";
import AudioManagement from "./components/admin/AudioManagement";
import SettingsPage from "./components/admin/SettingsPage";
import AssistantPage from "./components/admin/AssistantPage";
import AdminReviewsPage from "./components/admin/AdminReviewsPage";

import NotFoundPage from "./components/NotFoundPage.tsx"; // KEEP: Good practice for * route

// --- COMMENTED OUT: Loaders/Providers ---
// import GoogleTranslateLoader from "./components/GoogleTranslateLoader";

function App() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith("/admin");

  useEffect(() => {
    // ensureLanguagePersistence();
  }, []);

  return (
    <AuthProvider>
      {!isAdminRoute && <Navbar />}

      {/* Admin routes */}
      {isAdminRoute ? (
        <Routes>
          <Route path="/admin/dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/admin/assistant" element={<AdminRoute><AssistantPage /></AdminRoute>} />
          <Route path="/admin/exhibits" element={<AdminRoute><ExhibitsPage /></AdminRoute>} />
          <Route path="/admin/audio" element={<AdminRoute><AudioManagement /></AdminRoute>} />
          <Route path="/admin/reviews" element={<AdminRoute><AdminReviewsPage /></AdminRoute>} />
          <Route path="/admin/roles" element={<AdminRoute><RolesPage /></AdminRoute>} />
          <Route path="/admin/users" element={<AdminRoute><UsersPage /></AdminRoute>} />
          <Route path="/admin/audit-logs" element={<AdminRoute><AuditLogsPage /></AdminRoute>} />
          <Route path="/admin/audio-analytics" element={<AdminRoute><AudioAnalyticsPage /></AdminRoute>} />
          <Route path="/admin/settings" element={<AdminRoute><SettingsPage /></AdminRoute>} />
          <Route path="/admin/*" element={<NotFoundPage />} />
        </Routes>
      ) : (
        <div className="page-content">
          <Routes>
            {/* --- Public Visitor Routes (Enabled) --- */}
            <Route path="/" element={<Homepage />} />

            {/* --- NEW/MODIFIED Public Exhibition Routes (Enabled) --- */}
            { <Route path="/exhibitions" element={<AllExhibitions />} /> }
            { <Route path="/exhibitions/:id" element={<ExhibitionDetails />} /> }
            { <Route path="/exhibitions/:id/ar-photobooth" element={<ARPhotobooth />} /> }
            { <Route path="/exhibit/:id" element={<ExhibitDetails />} /> }
            <Route path="/reviews" element={<ReviewsPage />} />
            <Route path="/exhibits/:exhibitId/reviews" element={<ReviewsPage />} />

            {/* --- Other Public/Auth Routes --- */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/verify-email" element={<EmailVerificationPage />} />

            {
              // <Route path="/unauthorized" element={<UnauthorizedPage />} />
              <Route path="/scan" element={<ScanPage />} />
              // <Route path="/reviews" element={<ReviewPage />} />
              // <Route path="/exhibits/:exhibitId/reviews" element={<ReviewPage />} />
              // <Route path="/dashboard" element={<ProtectedRoute><UserDashboard /></ProtectedRoute>} />
            }

            <Route path="/user-badge" element={<UserBadgePage />} />

            {/* Catch-all route is kept */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </div>
      )}
    </AuthProvider>
  );
}

export default App;