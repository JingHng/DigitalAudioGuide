import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import apiClient from "../utils/apiClient";
import { useAuth } from "../contexts/AuthContext";
import "./css/ProfilePage2.css";

interface UserProfile {
  userId: string;
  profilePictureUrl?: string;
  username: string;
  email: string;
  roles?: string[];
}

const EditProfilePage: React.FC = () => {
  const { user, isAuthenticated, isLoading, refreshUserData } = useAuth();
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "success" | "error"
  >("idle");
  const [profile, setProfile] = useState<UserProfile>({
    userId: "",
    profilePictureUrl: "",
    username: "",
    email: "",
    roles: [],
  });
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [currentPassword, setCurrentPassword] = useState("");
  const [originalEmail, setOriginalEmail] = useState<string>("");

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // fetch user from auth context
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await apiClient.get("/auth/profile");
        setProfile(response.data.user);
        setOriginalEmail(response.data.user.email);
      } catch (error) {
        console.error("Error fetching user profile:", error);
      } finally {
        setLoadingProfile(false);
      }
    };

    fetchUserProfile();
  }, []);

  //   // Update emailChanged state when email input changes
  // useEffect(() => {
  //   if (user) {
  //     setEmailChanged(profile.email !== user.email);
  //   }
  // }, [profile.email, user]);

  // Handle profile picture selection
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPreviewUrl(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setPreviewUrl(null);
    }
  };

  // Upload profile picture
  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("profilePicture", selectedFile);

      const res = await apiClient.post("/auth/upload-profile-pic", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setProfile((prev) => ({
        ...prev,
        profilePictureUrl: res.data.profilePictureUrl,
      }));
      setSelectedFile(null);
      setPreviewUrl(null);
      alert("Profile picture uploaded successfully!");
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  // temporary loading state
  if (isLoading || loadingProfile) {
    return <div className="loading-state">Loading...</div>;
  }

  // redirect to login if not authenticated
  if (!isAuthenticated || !user?.username) {
    return (
      <div className="login-redirect-container">
        <h2>You’re not logged in.</h2>
        <p>Please log in to edit your profile.</p>
        <Link to="/login" className="login-redirect-link">
          Go to Login
        </Link>
      </div>
    );
  }

  // Email validation
  const validateEmail = (email: string): boolean => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email.toLowerCase());
  };

  // Determine what changed
  const usernameChanged = profile.username !== user?.username;
  const emailChanged = profile.email !== user?.email;
  const hasChanges = usernameChanged || emailChanged;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    const updates: Promise<any>[] = [];

    // Validate username
    if (usernameChanged) {
      if (profile.username.trim().length < 3) {
        alert("Username must be at least 3 characters.");
        return;
      }

      updates.push(
        apiClient.put("/auth/change-username", {
          username: profile.username,
        })
      );
    }

    // Validate email
    if (emailChanged) {
      if (!validateEmail(profile.email)) {
        alert("Please enter a valid email address.");
        return;
      }

      if (!currentPassword.trim()) {
        alert("Please enter your current password to change your email.");
        return;
      }

      updates.push(
        apiClient.put("/auth/change-email", {
          newEmail: profile.email,
          password: currentPassword,
        })
      );
    }


    setSaveStatus("saving");

    if (!hasChanges) {
      alert("No changes to save.");
      return;
    }

    setSaveStatus("saving");

    try {
      await Promise.all(updates);

      // Refresh context user so ProfilePage updates immediately
      await refreshUserData();

      const response = await apiClient.get("/auth/profile");
      setProfile(response.data.user);

      setSaveStatus("success");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (err) {
      console.error("Update failed:", err);
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  };

  const isEmailChanged = profile.email !== originalEmail;

  return (
    <div className="profile-page-container">
      <div className="profile-details-container">
        {/* Avatar */}
        <img
          src={previewUrl ?? profile.profilePictureUrl}
          alt="User avatar"
          className="profile-avatar"
        />

        {/* Upload Section */}
        <div className="mt-4 text-center">
          <input type="file" accept="image/*" onChange={handleFileChange} />
          <button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className="edit-profile-btn font-medium text-blue-600 hover:text-blue-800 underline mt-2"
          >
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </div>

        <h2 className="username-container">Edit Profile</h2>

        <form className="edit-profile-form" onSubmit={handleSaveProfile}>

          <div className="form-group">
            <label>Username</label>
            <input
              value={profile.username}
              onChange={(e) =>
                setProfile((prev) => ({ ...prev, username: e.target.value }))
              }
              required
            />
          </div>

          <div className="form-group">
            <label>Email</label>
            <input
              value={profile.email}
              onChange={(e) =>
                setProfile((prev) => ({ ...prev, email: e.target.value }))
              }
              required
            />
          </div>

          <div
            className="form-group email-password-group"
            style={{ display: isEmailChanged ? "block" : "none" }}
          >
            <label>Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />

            <label className="password-subtitle">
              (required to change email)
            </label>
            <div className="forgot-password-link">
              <Link to="/reset-password">Forgot password?</Link>
            </div>
          </div>

          <button
            type="submit"
            className="edit-profile-btn"
            disabled={saveStatus === "saving" || !hasChanges}
          >
            {saveStatus === "saving" ? "Saving..." : "Save Changes"}
          </button>
          {saveStatus === "success" && (
            <p className="success-message">Profile updated successfully!</p>
          )}
          {saveStatus === "error" && (
            <p className="error-message">Failed to update profile.</p>
          )}
        </form>

        <div className="back-to-profile-link mt-6 text-center">
          <Link to="/profile" className="login-redirect-link">
            Back to Profile
          </Link>
        </div>
      </div>
    </div>
  );
};

export default EditProfilePage;
