import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import apiClient from "../utils/apiClient";
import { useAuth } from "../contexts/AuthContext";
import defaultAvatar from "../assets/defaultAvatar.jpg";
import "./css/ProfilePage2.css";
import { Mars, Venus, CircleHelp, Pencil, Mail, Shield } from "lucide-react";


interface UserProfile {
  userId: string;
  profilePictureUrl?: string | null;
  username: string;
  firstName?: string | null;
  lastName?: string | null;
  gender?: string | null;
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
    firstName: "",
    lastName: "",
    gender: "",
    profilePictureUrl: "",
    username: "",
    email: "",
    roles: [],
    badges: [],
  });


  const [loadingProfile, setLoadingProfile] = useState(true);
  const [badges, setBadges] = useState<any[]>([]);
  const [loadingBadges, setLoadingBadges] = useState(true);


  const { fullName, showUsernameBelow } = useMemo(() => {
    const name = `${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim();


    if (name.length === 0) {
      return {
        fullName: profile.username,
        showUsernameBelow: false,
      };
    }


    return {
      fullName: name,
      showUsernameBelow: true,
    };
  }, [profile.firstName, profile.lastName, profile.username]);


  const genderKey = (profile.gender ?? "").toLowerCase().trim();


  const GenderIcon = () => {
    if (!genderKey) return null;
    if (genderKey === "male")
      return <Mars size={16} className="gender-icon" aria-label="Male" />;
    if (genderKey === "female")
      return <Venus size={16} className="gender-icon" aria-label="Female" />;
    return <CircleHelp size={16} className="gender-icon" aria-label="Gender" />;
  };


  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await apiClient.get("/auth/profile");
        setProfile({
          ...response.data.user,
          profilePictureUrl: response.data.user.profilePictureUrl ?? null,
          firstName: response.data.user.firstName ?? null,
          lastName: response.data.user.lastName ?? null,
          gender: response.data.user.gender ?? null,
          roles: response.data.user.roles ?? [],
          badges: response.data.user.badges ?? [],
        });
      } catch (error) {
        console.error("Error fetching user profile:", error);
      } finally {
        setLoadingProfile(false);
      }
    };


    fetchUserProfile();
  }, []);


  useEffect(() => {
    const fetchBadges = async () => {
      try {
        const response = await apiClient.get("/badges/userBadges");
        setBadges(response.data.data ?? []);
      } catch (error) {
        console.error("Error fetching user badges:", error);
      } finally {
        setLoadingBadges(false);
      }
    };


    fetchBadges();
  }, []);


  if (isLoading || loadingProfile) {
    return (
      <div className="page-shell">
        <div className="loading-state">Loading...</div>
      </div>
    );
  }


  if (!isAuthenticated || !user?.username) {
    return (
      <div className="page-shell">
        <div className="login-redirect-card">
          <h2>You’re not logged in.</h2>
          <p>Please log in to view your profile.</p>
          <Link to="/login" className="login-redirect-link">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }


  return (
    <div className="page-shell">
      <div className="profile-layout">
        {/* LEFT: PROFILE CARD */}
        <section className="profile-card">
          <div className="profile-card__header" />


          <div className="profile-card__body">
            <div className="avatar-wrap">
              <img
                src={profile.profilePictureUrl || defaultAvatar}
                alt={`${profile.username} avatar`}
                className="profile-avatar"
              />
            </div>


            <div className="name-row">
              <div className="name-stack">
                <h2 className="display-name">
                  {fullName}
                  {genderKey ? (
                    <span className="gender-pill" title={profile.gender ?? ""}>
                      <GenderIcon />
                    </span>
                  ) : null}
                </h2>


                {showUsernameBelow && (
                  <div className="username-handle">@{profile.username}</div>
                )}
              </div>


              <button
                onClick={() => navigate("/edit-profile")}
                className="edit-profile-btn"
              >
                <Pencil size={16} />
                Edit
              </button>
            </div>


            <div className="meta">
              <div className="meta-row">
                <Mail size={16} />
                <span>{profile.email}</span>
              </div>


              <div className="meta-row">
                <Shield size={16} />
                <span className="roles-inline">
                  {profile.roles?.length ? (
                    <span className="role-chips">
                      {profile.roles.map((r) => (
                        <span key={r} className="role-chip">
                          {r}
                        </span>
                      ))}
                    </span>
                  ) : (
                    <span className="muted">No roles assigned</span>
                  )}
                </span>
              </div>
            </div>
          </div>
        </section>


        {/* RIGHT: BADGES */}
        <section className="badges-card">
          <div className="badges-header">
            <h3 className="badges-title">Your Badges</h3>
            <p className="badges-subtitle">
              Keep exploring — you’ll unlock more as you go.
            </p>
          </div>


          {loadingBadges ? (
            <div className="loading-state small">Loading badges...</div>
          ) : !badges || badges.length === 0 ? (
            <p className="no-badges-text">You haven't earned any badges yet.</p>
          ) : (
            <div className="badges-grid">
              {badges.map((userBadge) => (
                <div
                  key={userBadge.badgeId ?? userBadge.id}
                  className="badge-item"
                >
                  <div className="badge-image-wrap">
                    <img
                      src={`${BACKEND_URL}/public${userBadge.badge?.imageUrl ?? ""}`}
                      alt={userBadge.badge?.name ?? "Badge"}
                      className="badge-image"
                    />
                  </div>
                  <p className="badge-name">
                    {userBadge.badge?.name ?? "Unnamed Badge"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}



