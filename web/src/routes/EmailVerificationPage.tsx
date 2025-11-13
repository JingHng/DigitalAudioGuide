import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import apiClient from '../utils/apiClient';

const EmailVerificationPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [resendEmail, setResendEmail] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const hasVerifiedRef = useRef(false); // Track if verification has been attempted

  const token = searchParams.get('token');
  const state = location.state as any;

  // Auto-verify function
  const handleVerifyEmail = React.useCallback(async () => {
    const currentToken = searchParams.get('token');
    if (!currentToken || hasVerifiedRef.current) {
      return;
    }

    hasVerifiedRef.current = true;
    setIsVerifying(true);
    try {
        await apiClient.post('/auth/verify-email', {
        token: currentToken,
      });

      setVerificationStatus('success');
      toast.success('Email verified successfully! You can now log in.');
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate('/login', { 
          state: { message: 'Email verified! You can now log in.' }
        });
      }, 2000);

    } catch (error: any) {
      setVerificationStatus('error');
      let message = 'Email verification failed';
      
      if (error.response) {
        // Server responded with an error status
        if (error.response.data?.error) {
          message = error.response.data.error;
          // Handle already verified case
          if (error.response.data?.errorType === 'ALREADY_VERIFIED') {
            setVerificationStatus('success');
            toast.success('Your email is already verified! Redirecting to login...');
            setTimeout(() => {
              navigate('/login', { 
                state: { message: 'Your email is already verified. You can now log in.' }
              });
            }, 2000);
            return;
          }
        } else {
          message = `Server error (${error.response.status})`;
        }
      } else if (error.request) {
        // Network error - request was made but no response received
        message = 'Unable to connect to the server. Please check your internet connection and ensure the backend is running.';
      } else {
        // Something else happened
        message = 'An unexpected error occurred during verification.';
      }
      
      setErrorMessage(message);
      toast.error(message);
      console.error('Email verification error:', error);
    } finally {
      setIsVerifying(false);
    }
  }, [searchParams, navigate]);

  useEffect(() => {
    // Handle post-registration state
    if (state?.justRegistered && state?.email) {
      setResendEmail(state.email);
      if (state.message) {
        toast.success(state.message);
      }
      // Show email preview URL if available (for development/testing)
      if (state?.emailPreviewUrl) {
        setPreviewUrl(state.emailPreviewUrl);
        console.log('\n' + '='.repeat(80));
        console.log('📧 EMAIL VERIFICATION PREVIEW URL');
        console.log('='.repeat(80));
        console.log('⚠️  IMPORTANT: Using Ethereal Email (TEST SERVICE)');
        console.log('⚠️  No real email was sent to your inbox!');
        console.log('⚠️  Click the URL below to view the verification email:');
        console.log('🔗', state.emailPreviewUrl);
        console.log('='.repeat(80) + '\n');
        
        toast.success(
          `⚠️ TEST EMAIL: Click the preview URL shown below to verify your email.`,
          { 
            duration: 20000,
            icon: '📧'
          }
        );
      }
    }

    // Auto-verify email if token is present in URL (only once)
    if (token && !hasVerifiedRef.current) {
      handleVerifyEmail();
    }
  }, [token, state, handleVerifyEmail]);


  const handleResendVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail.trim()) {
      toast.error('Please enter your email address');
      return;
    }

    setIsResending(true);
    try {
      const response = await apiClient.post('/auth/resend-verification', {
        email: resendEmail.trim().toLowerCase(),
      });

      // Check if using Ethereal Email (test service)
      if (response.data?.previewUrl) {
        // Using Ethereal Email - show preview URL prominently
        setPreviewUrl(response.data.previewUrl);
        console.log('\n' + '='.repeat(80));
        console.log('📧 EMAIL VERIFICATION PREVIEW URL');
        console.log('='.repeat(80));
        console.log('⚠️  IMPORTANT: Using Ethereal Email (TEST SERVICE)');
        console.log('⚠️  No real email was sent to your inbox!');
        console.log('⚠️  Click the URL below to view the verification email:');
        console.log('🔗', response.data.previewUrl);
        console.log('='.repeat(80) + '\n');
        
        toast.success(
          `⚠️ TEST EMAIL: Click the preview URL shown below to view your verification email.`,
          { 
            duration: 20000,
            icon: '📧'
          }
        );
      } else {
        // Using real email service
        setPreviewUrl(null);
        toast.success('Verification email sent! Please check your inbox and spam folder.');
      }
    } catch (error: any) {
      let message = 'Failed to resend verification email';
      
      if (error.response) {
        // Server responded with an error status
        if (error.response.data?.error) {
          message = error.response.data.error;
        } else {
          message = `Server error (${error.response.status})`;
        }
      } else if (error.request) {
        // Network error - request was made but no response received
        message = 'Unable to connect to the server. Please check your internet connection and ensure the backend is running.';
      } else {
        // Something else happened
        message = 'An unexpected error occurred while sending email.';
      }
      
      toast.error(message);
      console.error('Resend verification error:', error);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="email-verification-container" style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f3f4f6',
      padding: '2rem'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '0.5rem',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        textAlign: 'center',
        maxWidth: '400px',
        width: '100%'
      }}>
        <h1 style={{
          fontSize: '1.5rem',
          fontWeight: 'bold',
          color: '#1f2937',
          marginBottom: '1rem'
        }}>
          Email Verification
        </h1>

        {token ? (
          // Scenario 1: User has token (came from email link) - Auto-verifying
          <div>
            {isVerifying && (
              <p style={{
                color: '#6b7280',
                marginBottom: '1.5rem'
              }}>
                Verifying your email address...
              </p>
            )}

            {verificationStatus === 'success' && (
              <>
                <p style={{
                  color: '#10b981',
                  marginBottom: '1.5rem',
                  fontSize: '1.125rem',
                  fontWeight: '600'
                }}>
                  ✓ Email Verified Successfully!
                </p>
                <p style={{
                  color: '#6b7280',
                  marginTop: '1rem',
                  fontSize: '0.875rem'
                }}>
                  Redirecting to login page...
                </p>
              </>
            )}

            {verificationStatus === 'error' && (
              <>
                <p style={{
                  color: '#ef4444',
                  marginBottom: '1.5rem',
                  fontWeight: '600'
                }}>
                  Verification Failed
                </p>
                <div style={{
                  backgroundColor: '#fee2e2',
                  border: '1px solid #ef4444',
                  borderRadius: '0.375rem',
                  padding: '0.75rem',
                  marginBottom: '1rem'
                }}>
                  <p style={{
                    color: '#991b1b',
                    fontSize: '0.875rem',
                    margin: 0
                  }}>
                    {errorMessage}
                  </p>
                </div>
                <button
                  onClick={handleVerifyEmail}
                  disabled={isVerifying}
                  style={{
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '0.375rem',
                    border: 'none',
                    fontSize: '1rem',
                    fontWeight: '500',
                    cursor: isVerifying ? 'not-allowed' : 'pointer',
                    opacity: isVerifying ? 0.7 : 1,
                    width: '100%',
                    marginTop: '1rem'
                  }}
                >
                  {isVerifying ? 'Retrying...' : 'Try Again'}
                </button>
              </>
            )}

            {verificationStatus === 'idle' && !isVerifying && (
              <p style={{
                color: '#6b7280',
                marginBottom: '1.5rem'
              }}>
                Preparing to verify your email...
              </p>
            )}
          </div>
        ) : (
          // Scenario 2: No token (user just registered or needs to resend)
          <div>
            <p style={{
              color: state?.justRegistered ? '#10b981' : '#6b7280',
              marginBottom: '1.5rem',
              fontSize: '0.875rem'
            }}>
              {state?.justRegistered 
                ? "We've sent a verification email to your address. Please check your inbox and click the verification link."
                : "Enter your email address to receive a verification link."}
            </p>
            
            {(previewUrl || state?.emailPreviewUrl) && (
              <div style={{
                backgroundColor: '#fef3c7',
                border: '2px solid #f59e0b',
                borderRadius: '0.375rem',
                padding: '1rem',
                marginBottom: '1.5rem',
                fontSize: '0.875rem'
              }}>
                <p style={{
                  color: '#92400e',
                  margin: '0 0 0.5rem 0',
                  fontWeight: '700',
                  fontSize: '0.875rem'
                }}>
                  ⚠️ TEST EMAIL SERVICE - No Real Email Sent!
                </p>
                <p style={{
                  color: '#78350f',
                  margin: '0 0 0.75rem 0',
                  fontSize: '0.8125rem'
                }}>
                  Using Ethereal Email (development mode). Click the link below to view your verification email:
                </p>
                <a 
                  href={previewUrl || state.emailPreviewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: '#1e40af',
                    wordBreak: 'break-all',
                    textDecoration: 'underline',
                    fontWeight: '500',
                    display: 'block',
                    marginBottom: '0.5rem',
                    backgroundColor: 'white',
                    padding: '0.5rem',
                    borderRadius: '0.25rem',
                    border: '1px solid #d1d5db'
                  }}
                >
                  {previewUrl || state.emailPreviewUrl}
                </a>
                <p style={{
                  color: '#78350f',
                  margin: '0',
                  fontSize: '0.75rem',
                  fontStyle: 'italic'
                }}>
                  The verification link in the email will automatically verify your account and redirect you to login.
                </p>
              </div>
            )}

            <form onSubmit={handleResendVerification} style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: '100%'
            }}>
              <input
                type="email"
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
                placeholder="Enter your email address"
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '1rem',
                  marginBottom: '1rem',
                  textAlign: 'center',
                  boxSizing: 'border-box'
                }}
              />

              <button
                type="submit"
                disabled={isResending}
                style={{
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '0.375rem',
                  border: 'none',
                  fontSize: '1rem',
                  fontWeight: '500',
                  cursor: isResending ? 'not-allowed' : 'pointer',
                  opacity: isResending ? 0.7 : 1,
                  width: '100%',
                  textAlign: 'center'
                }}
              >
                {isResending ? 'Sending...' : 'Send Verification Email'}
              </button>
            </form>

            <p style={{
              color: '#6b7280',
              fontSize: '0.75rem',
              marginTop: '1rem'
            }}>
              Already have a verification link? Check your email and click it to verify.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmailVerificationPage;

