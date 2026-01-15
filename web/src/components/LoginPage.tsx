import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import apiClient from "../utils/apiClient";
import "./css/LoginPage.css";

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // State to hold form data and errors
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resendEmail, setResendEmail] = useState("");
  const [isResending, setIsResending] = useState(false);
  const [showVerificationSection, setShowVerificationSection] = useState(false);

  // Handle messages from registration or email verification
  useEffect(() => {
    const state = location.state as any;
    if (state?.message) {
      toast.success(state.message);
      if (state.email) {
        setResendEmail(state.email);
      }
      // Clear the state to prevent message from showing again on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const { username, password } = formData;

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLoginSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Use your configured apiClient to make the login request
      const response = await apiClient.post("/auth/login", {
        username,
        password,
      });

      // On success, save the token to localStorage
      localStorage.setItem("token", response.data.token);

      // Store user data for easy access
      if (response.data.user) {
        localStorage.setItem("userData", JSON.stringify(response.data.user));
      }

      // You can also dispatch a custom event to notify other components (like Navbar)
      window.dispatchEvent(new Event("loginStateChange"));

      // Small delay to ensure AuthContext has time to update
      await new Promise(resolve => setTimeout(resolve, 100));

      // Redirect based on user role
      const userRoles = response.data.user?.roles || [];

      if (userRoles.includes("super admin")) {
        navigate("/admin/dashboard"); // Super admin dashboard
      } else if (userRoles.includes("admin")) {
        navigate("/admin/dashboard"); // Admin dashboard
      } else {
        navigate("/"); // Visitor/regular user dashboard
      }
      
      // Reset verification section on successful login
      setShowVerificationSection(false);
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.error || "Login failed. Please check credentials.";
      setError(errorMessage);

      // If it's an email verification error, show the resend section
      if (err.response?.data?.requiresEmailVerification || errorMessage.includes('verify your email')) {
        setShowVerificationSection(true);
        
        // Use email from backend response, or extract from username, or leave empty
        const backendEmail = err.response?.data?.email;
        if (backendEmail) {
          setResendEmail(backendEmail);
        } else {
          const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (emailPattern.test(username)) {
            setResendEmail(username);
          } else {
            // If username isn't email format, still show the resend section with empty email
            setResendEmail("");
          }
        }
        toast.error("Please verify your email address first.");
      } else {
        // Reset verification section for other errors
        setShowVerificationSection(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail.trim()) {
      toast.error('Please enter your email address');
      return;
    }

    setIsResending(true);
    try {
      await apiClient.post('/auth/resend-verification', {
        email: resendEmail,
      });

      toast.success('Verification email sent! Please check your inbox.');
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to resend verification email';
      toast.error(message);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="login-page-container">
      <div className="form-wrapper">
        <h2 className="form-title">Login</h2>

        <form onSubmit={handleLoginSubmit}>
          {error && <p className="login-error-message">{error}</p>}
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              value={username}
              onChange={onChange}
              className="form-input"
              placeholder="Enter your username"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                value={password}
                onChange={onChange}
                className="form-input"
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M2.99902 3L20.999 21M9.8433 9.91364C9.32066 10.4536 8.99902 11.1892 8.99902 12C8.99902 13.6569 10.3422 15 11.999 15C12.8215 15 13.5667 14.669 14.1086 14.133M6.49902 6.64715C4.59972 7.90034 3.15305 9.78394 2.45703 12C3.73128 16.0571 7.52159 19 11.9992 19C13.9881 19 15.8414 18.4194 17.3988 17.4184M10.999 5.04939C11.328 5.01673 11.6617 5 11.9992 5C16.4769 5 20.2672 7.94291 21.5414 12C21.2607 12.894 20.8577 13.7338 20.3522 14.5"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M2.45703 12C3.73128 7.94288 7.52159 5 11.9992 5C16.4769 5 20.2672 7.94291 21.5414 12C20.2672 16.0571 16.4769 19 11.9992 19C7.52159 19 3.73128 16.0571 2.45703 12Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M11.9992 15C13.6561 15 14.9992 13.6569 14.9992 12C14.9992 10.3431 13.6561 9 11.9992 9C10.3424 9 8.99924 10.3431 8.99924 12C8.99924 13.6569 10.3424 15 11.9992 15Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>
          <button type="submit" className="submit-button" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <div className="alternative-actions">
          <p>
            <a href="/forgot-password" className="forgot-password-link">
              Forgot Password?
            </a>
          </p>
          <p>
            Don't have an account?{" "}
            <a href="/register">Register</a>
          </p>
        </div>

        {/* Email Verification Section */}
        {showVerificationSection && (
          <div className="email-verification-section" style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f0f9ff', border: '1px solid #bfdbfe', borderRadius: '8px' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#1e40af', fontSize: '14px' }}>
              Need to verify your email?
            </h4>
            <p style={{ margin: '0 0 15px 0', fontSize: '13px', color: '#64748b' }}>
              Check your email for a verification link, or request a new one below.
            </p>
            <form onSubmit={handleResendVerification} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="email"
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
                placeholder="Enter your email"
                style={{ 
                  flex: 1, 
                  padding: '6px 10px', 
                  border: '1px solid #d1d5db', 
                  borderRadius: '4px', 
                  fontSize: '13px'
                }}
                required
              />
              <button
                type="submit"
                disabled={isResending}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '13px',
                  cursor: isResending ? 'not-allowed' : 'pointer',
                  opacity: isResending ? 0.6 : 1
                }}
              >
                {isResending ? 'Sending...' : 'Resend'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginPage;

