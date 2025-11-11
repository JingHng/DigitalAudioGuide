import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import apiClient from '../utils/apiClient';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Check for success message from email verification
  useEffect(() => {
    const state = location.state as any;
    if (state?.message) {
      toast.success(state.message);
    }
  }, [location]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    if (!username || !password) {
      setError('Please enter your username/email and password');
      setLoading(false);
      return;
    }

    try {
      const response = await apiClient.post('/auth/login', {
        username: username.trim(),
        password: password,
      });

      // Store token
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        toast.success('Login successful!');
        navigate('/');
      } else {
        setError('Login failed: No token received');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Login failed. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center" style={{ padding: '2rem' }}>
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-lg" style={{ padding: '2rem' }}>
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Welcome Back</h1>
            <p className="text-sm text-slate-600">Sign in to your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-slate-700 mb-2">
                Username or Email <span className="text-red-500">*</span>
              </label>
              <input
                id="username"
                name="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  outline: 'none',
                  transition: 'all 0.2s',
                  fontSize: '16px',
                  boxSizing: 'border-box'
                }}
                placeholder="Enter your username or email"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
                Password <span className="text-red-500">*</span>
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  outline: 'none',
                  transition: 'all 0.2s',
                  fontSize: '16px',
                  boxSizing: 'border-box'
                }}
                placeholder="Enter your password"
                required
                disabled={loading}
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                backgroundColor: loading ? '#94a3b8' : '#1e293b',
                color: 'white',
                padding: '12px 24px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '16px',
                fontWeight: '500',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 space-y-2">
            <div className="text-center">
              <p className="text-sm text-slate-600">
                Don't have an account?{' '}
                <Link 
                  to="/register" 
                  className="font-medium text-slate-900 hover:text-slate-700 underline"
                >
                  Sign up here
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
