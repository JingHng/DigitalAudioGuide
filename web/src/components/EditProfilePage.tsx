import { useEffect, useMemo, useState, ChangeEvent } from "react";
import { Link } from "react-router-dom";
import apiClient from "../utils/apiClient";
import { useAuth } from "../contexts/AuthContext";
import defaultAvatar from "../assets/defaultAvatar.jpg";
import toast from "react-hot-toast";
import "./css/EditProfilePage.css";


type GenderValue = "Male" | "Female" | "Non-binary" | "Prefer not to say" | "";


type ConsentState = {
  marketingConsent: boolean;
  pictureConsent: boolean;
};


interface UserProfile {
  userId: string;
  profilePictureUrl?: string | null;


  username: string;
  email: string;


  firstName?: string | null;
  lastName?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;


  phoneNumber?: string | null;


  addressLine1?: string | null;
  addressLine2?: string | null;
  zipCode?: string | null;


  roles?: string[];
}


interface FormState {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  gender: GenderValue;
  dateOfBirth: string;
  phoneNumber: string;
  addressLine1: string;
  addressLine2: string;
  zipCode: string;
}


const normalize = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const normalizeNullable = (v: unknown) => (typeof v === "string" ? v : "");
const toDateInputValue = (value: unknown) => {
  if (!value) return "";
  const d = new Date(value as string);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
};


const validatePhone = (phone: string) => {
  return /^\d{8}$/.test(phone);
};


const EditProfilePage: React.FC = () => {
  const { user, isAuthenticated, isLoading, refreshUserData } = useAuth();


  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "success" | "error"
  >("idle");
  const [loadingProfile, setLoadingProfile] = useState(true);


  const [profile, setProfile] = useState<UserProfile>({
    userId: "",
    profilePictureUrl: null,
    username: "",
    email: "",
    firstName: null,
    lastName: null,
    gender: null,
    phoneNumber: null,
    addressLine1: null,
    addressLine2: null,
    zipCode: null,
    roles: [],
  });


  const [original, setOriginal] = useState<FormState>({
    username: "",
    email: "",
    firstName: "",
    lastName: "",
    gender: "",
    dateOfBirth: "",
    phoneNumber: "",
    addressLine1: "",
    addressLine2: "",
    zipCode: "",
  });


  const [form, setForm] = useState<FormState>({
    username: "",
    email: "",
    firstName: "",
    lastName: "",
    gender: "",
    phoneNumber: "",
    dateOfBirth: "",
    addressLine1: "",
    addressLine2: "",
    zipCode: "",
  });


  const [currentPassword, setCurrentPassword] = useState("");


  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);


  const [loadingConsents, setLoadingConsents] = useState(true);


  const [originalConsent, setOriginalConsent] = useState<ConsentState>({
    marketingConsent: false,
    pictureConsent: false,
  });


  const [consent, setConsent] = useState<ConsentState>({
    marketingConsent: false,
    pictureConsent: false,
  });


  const consentChanged =
    consent.marketingConsent !== originalConsent.marketingConsent ||
    consent.pictureConsent !== originalConsent.pictureConsent;


  const changes = useMemo(() => {
    const diff = {
      usernameChanged: form.username !== original.username,
      emailChanged: form.email !== original.email,
      nameChanged:
        form.firstName !== original.firstName ||
        form.lastName !== original.lastName,
      genderChanged: form.gender !== original.gender,
      phoneChanged: form.phoneNumber !== original.phoneNumber,
      dobChanged: form.dateOfBirth !== original.dateOfBirth,
      addressChanged:
        form.addressLine1 !== original.addressLine1 ||
        form.addressLine2 !== original.addressLine2 ||
        form.zipCode !== original.zipCode,
      consentChanged: consentChanged,
    };


    return {
      ...diff,
      hasChanges:
        diff.usernameChanged ||
        diff.nameChanged ||
        diff.genderChanged ||
        diff.phoneChanged ||
        diff.dobChanged ||
        diff.addressChanged ||
        diff.consentChanged,
      needsPassword: diff.usernameChanged,
    };
  }, [form, original, consentChanged]);


  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const res = await apiClient.get("/auth/profile");
        const u = res.data.user as UserProfile;


        setProfile(u);


        const initial: FormState = {
          username: normalize(u.username),
          email: normalize(u.email),
          firstName: normalizeNullable(u.firstName),
          lastName: normalizeNullable(u.lastName),
          gender: (normalizeNullable(u.gender) as GenderValue) || "",
          phoneNumber: normalizeNullable(u.phoneNumber),
          dateOfBirth: toDateInputValue(u.dateOfBirth),
          addressLine1: normalizeNullable(u.addressLine1),
          addressLine2: normalizeNullable(u.addressLine2),
          zipCode: normalizeNullable(u.zipCode),
        };


        setOriginal(initial);
        setForm(initial);
      } catch (err) {
        console.error("Error fetching user profile:", err);
      } finally {
        setLoadingProfile(false);
      }
    };


    fetchUserProfile();
  }, []);


useEffect(() => {
  const fetchConsents = async () => {
    try {
      const res = await apiClient.get("/auth/consents");


      const map = res.data?.consents ?? {};


      const next: ConsentState = {
        marketingConsent: Boolean(map.MARKETING),
        pictureConsent: Boolean(map.PICTURE),
      };


      setOriginalConsent(next);
      setConsent(next);
    } catch (err) {
      console.error("Error fetching consents:", err);
    } finally {
      setLoadingConsents(false);
    }
  };


  fetchConsents();
}, []);




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
      const fd = new FormData();
      fd.append("profilePicture", selectedFile);


      const res = await apiClient.post("/auth/upload-profile-pic", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });


      setProfile((prev) => ({
        ...prev,
        profilePictureUrl: res.data.profilePictureUrl,
      }));


      setSelectedFile(null);
      setPreviewUrl(null);


      await refreshUserData();
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Upload failed");
    } finally {
      setUploading(false);
    }
  };


  // temp loading
  if (isLoading || loadingProfile) {
    return <div className="ep-loading">Loading...</div>;
  }


  // redirect to login if not authenticated
  if (!isAuthenticated || !user?.username) {
    return (
      <div className="ep-redirect">
        <h2>You’re not logged in.</h2>
        <p>Please log in to edit your profile.</p>
        <Link to="/login" className="ep-link">
          Go to Login
        </Link>
      </div>
    );
  }


  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();


    if (!changes.hasChanges) {
      toast.error("No changes to save.");
      return;
    }


    // Validate username if changed
    if (changes.usernameChanged && form.username.trim().length < 3) {
      toast.error("Username must be at least 3 characters.");
      return;
    }


    // Validate consent changes if any consent changed


    // Require password for sensitive changes
    if (changes.needsPassword && !currentPassword.trim()) {
      toast.error("Password is required to make changes.");
      return;
    }


    // Validate phone if provided (must be exactly 8 digits)
    if (form.phoneNumber.trim() && !validatePhone(form.phoneNumber)) {
      toast.error("Phone number must be exactly 8 digits.");
      return;
    }


    if (form.dateOfBirth) {
      const dob = new Date(form.dateOfBirth);
      const today = new Date();
      if (Number.isNaN(dob.getTime())) {
        toast.error("Please enter a valid date of birth.");
        return;
      }
      if (dob > today) {
        toast.error("Date of birth cannot be in the future.");
        return;
      }
    }


    // Address minimal validation (only if any address field changed or filled)
    if (
      (form.addressLine1.trim() || form.zipCode.trim()) &&
      (!form.addressLine1.trim() || !form.zipCode.trim())
    ) {
      toast.error(
        "Address Line 1 and Zip Code are required if you enter an address.",
      );
      return;
    }


    setSaveStatus("saving");


    try {
      const updates: Promise<any>[] = [];


      if (changes.usernameChanged) {
        updates.push(
          apiClient.put("/auth/change-username", {
            newUsername: form.username.trim(),
            password: currentPassword,
          }),
        );
      }


      if (changes.nameChanged) {
        updates.push(
          apiClient.put("/auth/change-name", {
            newFirstName: form.firstName.trim(),
            newLastName: form.lastName.trim(),
          }),
        );
      }


      if (changes.genderChanged) {
        updates.push(
          apiClient.put("/auth/change-gender", {
            newGender: form.gender,
          }),
        );
      }


      if (changes.phoneChanged) {
        const p = form.phoneNumber.trim();


        if (!p) {
          // skip request (can't clear with current backend)
        } else {
          updates.push(
            apiClient.put("/auth/change-phone", { newPhoneNumber: p }),
          );
        }
      }


      if (changes.dobChanged) {
        updates.push(
          apiClient.put("/auth/change-birthdate", {
            newDateOfBirth: form.dateOfBirth || null,
          }),
        );
      }


      if (changes.addressChanged) {
        updates.push(
          apiClient.put("/auth/change-address", {
            addressLine1: form.addressLine1.trim() || null,
            addressLine2: form.addressLine2.trim() || null,
            zipCode: form.zipCode.trim() || null,
          }),
        );
      }


      if (consentChanged) {
        updates.push(
          apiClient.put("/auth/consents", {
            marketingConsent: consent.marketingConsent,
            pictureConsent: consent.pictureConsent,
          }),
        );
      }


      await Promise.all(updates);


      await refreshUserData();


      const res = await apiClient.get("/auth/profile");
      const u = res.data.user as UserProfile;
      setProfile(u);


      const latest: FormState = {
        username: normalize(u.username),
        firstName: normalizeNullable(u.firstName),
        lastName: normalizeNullable(u.lastName),
        gender: (normalizeNullable(u.gender) as GenderValue) || "",
        phoneNumber: normalizeNullable(u.phoneNumber),
        dateOfBirth: normalizeNullable(u.dateOfBirth),
        addressLine1: normalizeNullable(u.addressLine1),
        addressLine2: normalizeNullable(u.addressLine2),
        zipCode: normalizeNullable(u.zipCode),
      };


      setOriginal(latest);
      setOriginalConsent(consent);
      setForm(latest);
      setCurrentPassword("");


      setSaveStatus("success");
      toast.success("Saved!");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        "Failed to save changes.";


      toast.error(msg);


      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  };


  const avatarSrc = previewUrl ?? profile.profilePictureUrl ?? defaultAvatar;


  return (
    <div className="ep-page">
      <div className="ep-card">
        <div className="ep-header">
          <div className="ep-title">
            <h1>Edit profile</h1>
            <p>Update your personal info and how others see you.</p>
          </div>


          <div className="ep-actions">
            <Link to="/profile" className="ep-btn ep-btn-ghost">
              Cancel
            </Link>
            <button
              className="ep-btn ep-btn-primary"
              onClick={handleSaveProfile as any}
              disabled={saveStatus === "saving" || !changes.hasChanges}
              type="button"
              aria-disabled={saveStatus === "saving" || !changes.hasChanges}
            >
              {saveStatus === "saving" ? "Saving..." : "Save changes"}
            </button>
          </div>
        </div>


        <div className="ep-body">
          {/* Left: avatar card */}
          <aside className="ep-side">
            <div className="ep-avatarCard">
              <img src={avatarSrc} alt="User avatar" className="ep-avatar" />
              <div className="ep-avatarMeta">
                <div className="ep-avatarName">
                  {form.firstName || form.lastName
                    ? `${form.firstName} ${form.lastName}`.trim()
                    : form.username}
                </div>
                <div className="ep-avatarSub">{form.email}</div>
              </div>


              <div className="ep-upload">
                <input
                  className="ep-file"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                />
                <button
                  className="ep-btn ep-btn-secondary"
                  onClick={handleUpload}
                  disabled={!selectedFile || uploading}
                  type="button"
                >
                  {uploading ? "Uploading..." : "Upload photo"}
                </button>
              </div>


              {selectedFile && (
                <div className="ep-hint">Previewing: {selectedFile.name}</div>
              )}
            </div>


            {/* status */}
            {!changes.hasChanges && (
              <div className="ep-toast ep-toast-muted">No unsaved changes</div>
            )}
          </aside>


          {/* Right: form */}
          <section className="ep-main">
            <form className="ep-form" onSubmit={handleSaveProfile}>
              {/* Account */}
              <div className="ep-section">
                <div className="ep-sectionHead">
                  <h2>Account</h2>
                </div>


                <div className="ep-grid">
                  <div className="ep-field">
                    <label>Username</label>
                    <input
                      value={form.username}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, username: e.target.value }))
                      }
                      minLength={3}
                      required
                    />
                  </div>
                </div>


                {changes.needsPassword && (
                  <div className="ep-field ep-field-full">
                    <label>Current password</label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Required to change username"
                    />
                    <div className="ep-fieldHelp">
                      <Link to="/forgot-password" className="ep-link">
                        Forgot password?
                      </Link>
                    </div>
                  </div>
                )}
              </div>


              {/* Personal */}
              <div className="ep-section">
                <div className="ep-sectionHead">
                  <h2>Personal</h2>
                  <p>Basic personal information.</p>
                </div>


                <div className="ep-grid">
                  <div className="ep-field">
                    <label>First name</label>
                    <input
                      value={form.firstName}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, firstName: e.target.value }))
                      }
                      placeholder="e.g. Julia"
                    />
                  </div>


                  <div className="ep-field">
                    <label>Last name</label>
                    <input
                      value={form.lastName}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, lastName: e.target.value }))
                      }
                      placeholder="e.g. Moe"
                    />
                  </div>


                  <div className="ep-field">
                    <label>Gender</label>
                    <select
                      value={form.gender}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          gender: e.target.value as GenderValue,
                        }))
                      }
                    >
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                      <option value="Non-binary">Non-binary</option>
                      <option value="Prefer not to say">
                        Prefer not to say
                      </option>
                    </select>
                  </div>


                  <div className="ep-field">
                    <label>Date of birth</label>
                    <input
                      type="date"
                      value={form.dateOfBirth}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, dateOfBirth: e.target.value }))
                      }
                      max={new Date().toISOString().split("T")[0]} // prevents future date via picker
                    />
                  </div>


                  <div className="ep-field">
                    <label>Phone number</label>
                    <input
                      value={form.phoneNumber}
                      onChange={(e) => {
                        const digitsOnly = e.target.value
                          .replace(/\D/g, "")
                          .slice(0, 8);
                        setForm((p) => ({ ...p, phoneNumber: digitsOnly }));
                      }}
                      placeholder="e.g. 91234567"
                      inputMode="numeric"
                      maxLength={8}
                    />
                  </div>
                </div>
              </div>


              {/* Address */}
              <div className="ep-section">
                <div className="ep-sectionHead">
                  <h2>Address</h2>
                  <p>Optional. Used for billing, if applicable.</p>
                </div>


                <div className="ep-grid">
                  <div className="ep-field ep-field-full">
                    <label>Address line 1</label>
                    <input
                      value={form.addressLine1}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, addressLine1: e.target.value }))
                      }
                      placeholder="Block / Street / Unit"
                    />
                  </div>


                  <div className="ep-field ep-field-full">
                    <label>Address line 2</label>
                    <input
                      value={form.addressLine2}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, addressLine2: e.target.value }))
                      }
                      placeholder="Optional (building, apartment, etc.)"
                    />
                  </div>


                  <div className="ep-field">
                    <label>Zip / Postal code</label>
                    <input
                      value={form.zipCode}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, zipCode: e.target.value }))
                      }
                      inputMode="numeric"
                      placeholder="e.g. 123456"
                    />
                  </div>
                </div>
              </div>


              {/* Preferences */}
              <div className="ep-section">
                <div className="ep-sectionHead">
                  <h2>Preferences</h2>
                  <p>Control how we use your data.</p>
                </div>


                {loadingConsents ? (
                  <div className="ep-toast ep-toast-muted">
                    Loading preferences…
                  </div>
                ) : (
                  <div className="ep-prefList">
                    <div className="ep-prefItem">
                      <div className="ep-prefText">
                        <div className="ep-prefTitle">
                          Profile details
                        </div>
                        <div className="ep-prefSub">
                          Allow us to use your contact details (email/phone) and
                          profile info for marketing purposes.
                        </div>
                      </div>


                      <label className="ep-switch">
                        <input
                          type="checkbox"
                          checked={consent.marketingConsent}
                          onChange={(e) =>
                            setConsent((p) => ({
                              ...p,
                              marketingConsent: e.target.checked,
                            }))
                          }
                        />
                        <span className="ep-slider" />
                      </label>
                    </div>


                    <div className="ep-prefItem">
                      <div className="ep-prefText">
                        <div className="ep-prefTitle">
                          AR Photobooth
                        </div>
                        <div className="ep-prefSub">
                          Allow us to share photos taken with the AR photobooth
                          feature on our social media.
                        </div>
                      </div>


                      <label className="ep-switch">
                        <input
                          type="checkbox"
                          checked={consent.pictureConsent}
                          onChange={(e) =>
                            setConsent((p) => ({
                              ...p,
                              pictureConsent: e.target.checked,
                            }))
                          }
                        />
                        <span className="ep-slider" />
                      </label>
                    </div>


                    {consentChanged && (
                      <div className="ep-toast ep-toast-muted">
                        You have unsaved preference changes — click{" "}
                        <b>Save changes</b>.
                      </div>
                    )}
                  </div>
                )}
              </div>


              {/* mobile-only save */}
              <div className="ep-footer">
                <button
                  className="ep-btn ep-btn-primary"
                  disabled={saveStatus === "saving" || !changes.hasChanges}
                  type="submit"
                >
                  {saveStatus === "saving" ? "Saving..." : "Save changes"}
                </button>
                <Link to="/profile" className="ep-btn ep-btn-ghost">
                  Back
                </Link>
              </div>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
};


export default EditProfilePage;



