import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../utils/apiClient";
import toast from "react-hot-toast";
import "../css/ProfileSetupPage.css";


type Step = 0 | 1 | 2 | 3 | 4;


const ProfileSetupPage: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(0);
  const [loading, setLoading] = useState(false);


  const [formData, setFormData] = useState({
    gender: "",
    dateOfBirth: "",
    addressLine1: "",
    addressLine2: "",
    zipCode: "",
    phoneNumber: "",
    consents: {
      marketingConsent: false,
      pictureConsent: false,
    },
  });


  const updateProfile = async (
    payload: Record<string, any>,
    options?: { finish?: boolean },
  ) => {
    setLoading(true);
    try {
      await apiClient.patch("/auth/profile", payload);


      if (options?.finish) {
        toast.success("Profile setup complete!");
        navigate("/");
        return;
      }


      setStep((prev) => (prev + 1) as Step);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to save profile");
    } finally {
      setLoading(false);
    }
  };


  // NEW: use your consent controller route
  const updateConsents = async (
    payload: Record<string, any>,
    options?: { finish?: boolean },
  ) => {
    setLoading(true);
    try {
      await apiClient.put("/auth/consents", payload);


      if (options?.finish) {
        toast.success("Profile setup complete!");
        navigate("/profile");
        return;
      }


      setStep((prev) => (prev + 1) as Step);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to save consents");
    } finally {
      setLoading(false);
    }
  };


  const skipStep = () => setStep((prev) => (prev + 1) as Step);


  const finishSetup = () => {
    toast.success("Profile setup complete!");
    navigate("/profile");
  };


  return (
    <div className="profile-setup-page">
      <div className="setup-card">
        <h2 className="setup-title">Set up your profile</h2>


        <div className="setup-progress">Step {step + 1} of 5</div>


        {/* STEP 1 — GENDER */}
        {step === 0 && (
          <>
            <label>Gender</label>
            <select
              value={formData.gender}
              onChange={(e) =>
                setFormData({ ...formData, gender: e.target.value })
              }
            >
              <option value="" disabled>
                Select gender
              </option>
              <option value="Female">Female</option>
              <option value="Male">Male</option>
              <option value="Non-binary">Non-binary</option>
              <option value="">Prefer not to say</option>
            </select>


            <div className="setup-actions">
              <button onClick={skipStep} className="ghost-btn">
                Skip
              </button>
              <button
                onClick={() => updateProfile({ gender: formData.gender })}
                disabled={loading || !formData.gender}
                className="primary-btn"
              >
                Next
              </button>
            </div>
          </>
        )}


        {/* STEP 2 — DOB */}
        {step === 1 && (
          <>
            <label>Date of Birth</label>
            <input
              type="date"
              value={formData.dateOfBirth}
              onChange={(e) =>
                setFormData({ ...formData, dateOfBirth: e.target.value })
              }
              max={new Date().toISOString().split("T")[0]}
            />


            <div className="setup-actions">
              <button onClick={skipStep} className="ghost-btn">
                Skip
              </button>
              <button
                onClick={() =>
                  updateProfile({ dateOfBirth: formData.dateOfBirth })
                }
                disabled={loading || !formData.dateOfBirth}
                className="primary-btn"
              >
                Next
              </button>
            </div>
          </>
        )}


        {/* STEP 3 — ADDRESS */}
        {step === 2 && (
          <>
            <label>Address Line 1 (required)</label>
            <input
              value={formData.addressLine1}
              onChange={(e) =>
                setFormData({ ...formData, addressLine1: e.target.value })
              }
            />


            <label>Address Line 2</label>
            <input
              value={formData.addressLine2}
              onChange={(e) =>
                setFormData({ ...formData, addressLine2: e.target.value })
              }
            />


            <label>Zip Code (required)</label>
            <input
              type="number"
              value={formData.zipCode}
              onChange={(e) =>
                setFormData({ ...formData, zipCode: e.target.value })
              }
            />


            <div className="setup-actions">
              <button onClick={skipStep} className="ghost-btn">
                Skip
              </button>
              <button
                onClick={() =>
                  updateProfile({
                    addressLine1: formData.addressLine1,
                    addressLine2: formData.addressLine2,
                    zipCode: formData.zipCode,
                  })
                }
                disabled={
                  loading ||
                  !formData.addressLine1 ||
                  formData.zipCode.length !== 6
                }
                className="primary-btn"
              >
                Next
              </button>
            </div>
          </>
        )}


        {/* STEP 4 — PHONE */}
        {step === 3 && (
          <>
            <label>Phone Number</label>
            <input
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              value={formData.phoneNumber}
              onChange={(e) => {
                const digitsOnly = e.target.value.replace(/\D/g, "");
                setFormData({ ...formData, phoneNumber: digitsOnly });
              }}
              placeholder="81234567"
            />


            <div className="setup-actions">
              <button onClick={skipStep} className="ghost-btn">
                Skip
              </button>
              <button
                onClick={() =>
                  updateProfile({ phoneNumber: formData.phoneNumber })
                }
                disabled={loading || formData.phoneNumber.length !== 8}
                className="primary-btn"
              >
                Next
              </button>
            </div>
          </>
        )}


        {/* STEP 5 — CONSENTS */}
        {step === 4 && (
          <>
            <label>Consent Preferences</label>


            <div className = "consent-block">
              <label className = "consent-row">
                <input
                  type="checkbox"
                  checked={formData.consents.marketingConsent}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      consents: {
                        ...formData.consents,
                        marketingConsent: e.target.checked,
                      },
                    })
                  }
                />
                I agree to receive marketing updates.
              </label>


              <label className = "consent-row">
                <input
                  type="checkbox"
                  checked={formData.consents.pictureConsent}
                  onChange={(e) =>  
                    setFormData({
                      ...formData,
                      consents: {
                        ...formData.consents,
                        pictureConsent: e.target.checked,
                      },
                    })
                  }
                />
                I consent to my pictures being used for promotional purposes.
              </label>
            </div>


            <div className="setup-actions" style={{ marginTop: 16 }}>
              <button onClick={finishSetup} className="ghost-btn">
                Skip
              </button>


              <button
                onClick={() =>
                  updateConsents(
                    {
                      marketingConsent: formData.consents.marketingConsent,
                      pictureConsent: formData.consents.pictureConsent,
                    },
                    { finish: true },
                  )
                }
                disabled={loading}
                className="primary-btn"
              >
                Finish
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};


export default ProfileSetupPage;



