import { Routes, Route, useLocation } from "react-router-dom";

// --- Context & Utilities ---
import { AuthProvider } from "./contexts/AuthContext";
import Navbar from "./components/Navbar.tsx";
import Homepage from "./components/HomePage.tsx";

// --- Auth & User Components ---
import LoginPage from "./components/LoginPage";
import RegisterPage from "./routes/RegisterPage";
import ForgotPasswordPage from "./components/ForgotPasswordPage";
import ResetPasswordPage from "./components/ResetPasswordPage";
import EmailVerificationPage from "./routes/EmailVerificationPage";
import ScanPage from "./components/ScanPage.tsx";
import UserBadgePage from "./routes/userBadgePage.tsx";
import AllBadgesShowcase from "./pages/BadgesPage.tsx";

// --- EXHIBITIONS & TOURS ---
import AllExhibitions from "./components/ExhibitionsPage.tsx";
import ExhibitionDetails from "./components/ExhibitionDetailsPage.tsx"; 
import ExhibitDetails from "./components/ExhibitDetails.tsx";
import ARPhotobooth from "./components/ARPhotobooth.tsx";
import TourView from "./components/TourView.tsx"; 
import TourSummary from "./components/TourSummary.tsx"; 
import ReviewsPage from "./pages/ReviewsPage"; 

// --- Admin Components ---
import ProtectedRoute, { AdminRoute } from "./components/ProtectedRoute";
import AdminDashboard from "./components/admin/AdminDashboard";
import ExhibitsPage from "./components/admin/ExhibitsPage";
import BadgesPage from "./components/admin/BadgesPage";
import BadgeAnalyticsPage from "./components/admin/BadgeAnalyticsPage";
import RolesPage from "./components/admin/RolesPage";
import UsersPage from "./components/admin/UsersPage";
import AuditLogsPage from "./components/admin/AuditLogsPage";
import AudioAnalyticsPage from "./components/admin/AudioAnalyticsPage";
import AudioManagement from "./components/admin/AudioManagement";
import SettingsPage from "./components/admin/SettingsPage";
import AssistantPage from "./components/admin/AssistantPage";
import AssistantHistoryPage from "./components/admin/AssistantHistoryPage";
import AdminReviewsPage from "./components/admin/AdminReviewsPage";
import AdminFloatingCards from "./components/admin/AdminFloatingCards";

import NotFoundPage from "./components/NotFoundPage.tsx";
import ProfilePage from "./components/ProfilePage.tsx";
import EditProfilePage from "./components/EditProfilePage.tsx";
import ProfileSetupPage from "./components/ProfileSetupPage.tsx";

function App() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith("/admin");

  return (
    <AuthProvider>
      {!isAdminRoute && <Navbar />}

      {/* Admin routes */}
      {isAdminRoute ? (
        <Routes>
          <Route path="/admin/dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/admin/assistant" element={<AdminRoute><AssistantPage /></AdminRoute>} />
          <Route path="/admin/assistant/history" element={<AdminRoute><AssistantHistoryPage /></AdminRoute>} />
          <Route path="/admin/exhibits" element={<AdminRoute><ExhibitsPage /></AdminRoute>} />
          <Route path="/admin/badges" element={<AdminRoute><BadgesPage /></AdminRoute>} />
          <Route path="/admin/badge-analytics" element={<BadgeAnalyticsPage />} />
          <Route path="/admin/audio" element={<AdminRoute><AudioManagement /></AdminRoute>} />
          <Route path="/admin/reviews" element={<AdminRoute><AdminReviewsPage /></AdminRoute>} />
          <Route path="/admin/floating-cards" element={<AdminRoute><AdminFloatingCards /></AdminRoute>} />
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
            <Route path="/" element={<Homepage />} />

            {/* --- Public Exhibition & Tour Routes --- */}
            <Route path="/exhibitions" element={<AllExhibitions />} />
            <Route path="/exhibitions/:id" element={<ExhibitionDetails />} />
            <Route path="/exhibitions/:id/tour" element={<TourView />} />
            <Route path="/exhibitions/:id/tour/summary" element={<TourSummary />} />
            <Route path="/exhibitions/:id/ar-photobooth" element={<ARPhotobooth />} />
            <Route path="/exhibit/:id" element={<ExhibitDetails />} />
            
            {/* TOUR PROGRESSION */}
            <Route path="/exhibitions/:exhibitionId/exhibit/:id" element={<ExhibitDetails />} />

            {/* --- REVIEWS (From Development - Owen Part) --- */}
            <Route path="/reviews" element={<ReviewsPage />} />
            <Route path="/exhibits/:exhibitId/reviews" element={<ReviewsPage />} />

            {/* --- Auth Routes --- */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/verify-email" element={<EmailVerificationPage />} />
            <Route path="/scan" element={<ScanPage />} />
            <Route path="/badges" element={<AllBadgesShowcase />} />
            <Route path="/user-badge" element={<UserBadgePage />} />
            <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/profile/setup" element={<ProtectedRoute><ProfileSetupPage /></ProtectedRoute>} />
            <Route path="/edit-profile" element={<ProtectedRoute><EditProfilePage /></ProtectedRoute>} />

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </div>
      )}
    </AuthProvider>
  );
}

export default App;