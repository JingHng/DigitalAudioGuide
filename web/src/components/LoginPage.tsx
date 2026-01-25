import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Mail, Lock, User as UserIcon, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";
import apiClient from "../utils/apiClient";
import "./css/LoginPage.css";

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resendEmail, setResendEmail] = useState("");
  const [isResending, setIsResending] = useState(false);
  const [showVerificationSection, setShowVerificationSection] = useState(false);

  useEffect(() => {
    const state = location.state as any;
    if (state?.message) {
      toast.success(state.message);
      if (state.email) setResendEmail(state.email);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLoginSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await apiClient.post("/auth/login", { 
        username: formData.username, 
        password: formData.password 
      });
      localStorage.setItem("token", response.data.token);
      if (response.data.user) {
        localStorage.setItem("userData", JSON.stringify(response.data.user));
      }

      window.dispatchEvent(new Event("loginStateChange"));
      await new Promise(resolve => setTimeout(resolve, 100));

      const userRoles = response.data.user?.roles || [];
      navigate(userRoles.some((r: string) => r.toLowerCase().includes("admin")) ? "/admin/dashboard" : "/");
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || "Login failed.";
      setError(errorMessage);
      if (err.response?.data?.requiresEmailVerification || errorMessage.includes('verify')) {
        setShowVerificationSection(true);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="aesthetic-auth-container no-scroll">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="auth-card"
      >
        <div className="auth-header">
          <h2 className="auth-title">Welcome Back</h2>
          <p className="auth-subtitle">Sign in to your Smart Exhibit account</p>
        </div>

        <form onSubmit={handleLoginSubmit} className="auth-form">
          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="auth-error-pill"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>
          
          <div className="input-field-group">
            <label><UserIcon size={14} /> Username</label>
            <input type="text" name="username" value={formData.username} onChange={onChange} placeholder="Your username" required />
          </div>

          <div className="input-field-group">
            <label><Lock size={14} /> Password</label>
            <div className="password-wrapper">
              <input type={showPassword ? "text" : "password"} name="password" value={formData.password} onChange={onChange} placeholder="••••••••" required />
              <button type="button" className="eye-toggle" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="auth-meta">
            <Link to="/forgot-password">Forgot password?</Link>
          </div>

          <motion.button 
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            type="submit" 
            className="auth-submit-btn" 
            disabled={loading}
          >
            {loading ? "Verifying..." : "Sign In"}
            {!loading && <ArrowRight size={18} />}
          </motion.button>
        </form>

        <p className="auth-footer-text">
          New here? <Link to="/register">Create an account</Link>
        </p>

        <AnimatePresence>
          {showVerificationSection && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="verification-wrapper"
            >
              <div className="verification-toast">
                <div className="v-icon"><Mail size={20} /></div>
                <div className="v-content">
                  <h4>Verify Email</h4>
                  <p>Check your inbox for the link.</p>
                  <button className="v-resend-link">Resend email</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default LoginPage;