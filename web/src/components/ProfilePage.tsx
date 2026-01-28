import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import apiClient from "../utils/apiClient";
import { useAuth } from "../contexts/AuthContext";
// import defaultAvatar from "../assets/defaultAvatar.png";
import "./css/ProfilePage2.css";

interface UserProfile {
  userId: string;
  profilePictureUrl?: string;
  username: string;
  email: string;
  roles?: string[];
  badges?: {
    badgeId: number;
    name: string;
    description: string;
    imageUrl: string;
  }[];
}

export default function ProfilePage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const BACKEND_URL = import.meta.env.VITE_API_TARGET || "";

  const [profile, setProfile] = useState<UserProfile>({
    userId: "",
    profilePictureUrl: "",
    username: "",
    email: "",
    roles: [],
    badges: [],
  });
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [badges, setBadges] = useState<any[]>([]);
  const [loadingBadges, setLoadingBadges] = useState(true);

  // fetch user from auth context
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await apiClient.get("/auth/profile");
        // refreshUserData(); // Update context user if needed
        setProfile({
          ...response.data.user,
          badges: response.data.user.badges ?? [], // safe default
        });
      } catch (error) {
        console.error("Error fetching user profile:", error);
      } finally {
        setLoadingProfile(false);
      }
    };

    fetchUserProfile();
  }, []);

  // fetch badges from backend
  useEffect(() => {
    const fetchBadges = async () => {
      try {
        const response = await apiClient.get("/badges/userBadges");
        setBadges(response.data.data);
        console.log(response.data.data);
        console.log("Fetched badges:", response.data.data);
      } catch (error) {
        console.error("Error fetching user badges:", error);
      } finally {
        setLoadingBadges(false);
      }
    };
    fetchBadges();
  }, []);


  // temporary loading state
  if (isLoading || loadingProfile) {
    return <div className="loading-state">Loading...</div>;
  }

  if (!isAuthenticated || !user!.username) {
    return (
      <div className="login-redirect-container">
        <h2>You’re not logged in.</h2>
        <p>Please log in to view your profile.</p>
        <Link to="/login" className="login-redirect-link">
          Go to Login
        </Link>
      </div>
    );
  }


  return (
    <div className="profile-page-container">
      <div className="profile-details-container">
        {/* FOR IMPLEMENTATION AFTER IMPLEMENTING PROFILE TABLE */}
        {/* <img
        src={profile.profilePictureUrl ?? defaultAvatar}
        alt={`${profile.username} avatar`}
        className="profile-avatar"
      /> */}

        <img
          src={profile.profilePictureUrl}
          alt="User avatar"
          className="profile-avatar"
        />

        <h2 className="username-container">
          Welcome, {profile!.username}!
        </h2>
        <p className="email-container">
          {profile!.email} 
        </p>
        <p className="role-container">
          Role:{" "}
          {profile?.roles?.length
            ? profile.roles.join(", ")
            : "No roles assigned"}
        </p>
        {/* <p className="dob-container">
          Date of Birth:{" "}
          {profile.dateOfBirth
            ? new Date(profile.dateOfBirth).toLocaleDateString("en-GB") // dd/mm/yyyy
            : "Not set"}
        </p> */}

        <div className="mt-6 text-center">
          <button
            onClick={() => navigate("/edit-profile")}
            className="edit-profile-btn font-medium text-blue-600 hover:text-blue-800 underline"
          >
            Edit Profile
          </button>
        </div>
      </div>

      <div className="badges-container">
        <h3 className="badges-title">Your Badges</h3>

        {loadingBadges ? (
          <div className="loading-state">Loading badges...</div>
        ) : !badges || badges.length === 0 ? (
          <p className="no-badges-text">You haven't earned any badges yet.</p>
        ) : (
          <div className="badges-grid">
            {badges.map((userBadge) => (
              <div
                key={userBadge.badgeId ?? userBadge.id}
                className="badge-item"
              >
                <img
                  src={`${BACKEND_URL}/public${
                    userBadge.badge?.imageUrl ?? ""
                  }`}
                  alt={userBadge.badge?.name ?? "Badge"}
                  className="badge-image"
                />
                <p className="badge-name">
                  {userBadge.badge?.name ?? "Unnamed Badge"}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
