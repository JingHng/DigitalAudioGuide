import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import apiClient from "../utils/apiClient";
import "./css/LoginPage.css";

const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await apiClient.post("/auth/forgot-password", {
        email: email,
      });

      setMessage(response.data.message || "Password reset email sent!");
      toast.success(response.data.message || "Password reset email sent!");
      
      // Redirect to login after showing message
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.error || "Failed to send password reset email.";
      setMessage(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-container">
      <div className="form-wrapper">
        <h2 className="form-title">Reset Password</h2>

        <form onSubmit={handleSubmit}>
          {message && (
            <p className={message.includes("error") || message.includes("Failed") || message.includes("not found") ? "login-error-message" : "success-message"}>
              {message}
            </p>
          )}
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input"
              placeholder="Enter your email address"
              required
            />
          </div>
          <button type="submit" className="submit-button" disabled={loading}>
            {loading ? "Sending..." : "Send Reset Email"}
          </button>
        </form>

        <div className="alternative-actions">
          <p>
            <a href="/login">Back to Login</a>
          </p>
          <p>
            Don't have an account?{" "}
            <a href="/register">Register</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;








