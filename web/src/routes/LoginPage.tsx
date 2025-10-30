import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';

import { useEffect } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email) {
      setError('Please enter your email');
      return;
    }

    try {
      await login(email, password, username);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'User not found in database');
    }
  };

  useEffect(() => {
    document.title = 'Vite + React';
  }, []);

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center" style={{ padding: '0 16px' }}>
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-lg" style={{ padding: '32px' }}>
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Welcome Back</h1>
            <p className="text-sm text-slate-600">Sign in to access your dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                placeholder="admin@example.com"
                required
              />
            </div>

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-slate-500 mb-2">
                Username <span className="text-slate-400 text-xs">(optional)</span>
              </label>
              <input
                id="username"
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
                  backgroundColor: '#f8fafc',
                  fontSize: '16px',
                  boxSizing: 'border-box'
                }}
                placeholder="For display only"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-500 mb-2">
                Password <span className="text-slate-400 text-xs">(optional)</span>
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
                  backgroundColor: '#f8fafc',
                  fontSize: '16px',
                  boxSizing: 'border-box'
                }}
                placeholder="Not validated yet"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-slate-900 text-white py-2.5 px-4 rounded-md hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 transition font-medium"
            >
              Sign In
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
            
            <div className="border-t border-slate-200 pt-4">
              <p className="text-xs text-slate-500 text-center">
                Placeholder authentication • Only email is validated against database
              </p>
              <p className="text-xs text-slate-500 text-center">
                Password/username fields are optional for now • Will integrate with SSO in later sessions
              </p>
              <p className="text-xs font-medium text-slate-600 text-center">
                Try: admin@example.com
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
