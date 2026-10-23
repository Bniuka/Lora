import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { PageTransition } from '../components/ui';
import AppLogo from '../components/AppLogo';
import './signup-page.css';

function friendlyError(msg) {
  if (!msg) return 'Something went wrong. Please try again.';
  const lower = msg.toLowerCase();
  if (lower.includes('row-level security') || lower.includes('rls'))
    return 'Something went wrong. Please try again or contact support.';
  if (lower.includes('invalid login') || lower.includes('invalid email or password'))
    return 'Incorrect email or password. Please try again.';
  if (lower.includes('duplicate key') || lower.includes('already registered') || lower.includes('already been registered'))
    return 'An account with this email already exists. Try signing up.';
  if (lower.includes('email not confirmed'))
    return 'Your email has not been confirmed. Please check your inbox.';
  return 'Something went wrong. Please try again.';
}

export default function Login() {
  const { signIn, user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState(() => localStorage.getItem('lora_remembered_email') || '');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(() => localStorage.getItem('lora_remember_me') !== 'false');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState('');

  // Auto-redirect if already logged in so user never has to re-login repeatedly
  useEffect(() => {
    if (!authLoading && user && profile) {
      if (profile.role === 'creator') {
        navigate('/creator/dashboard', { replace: true });
      } else {
        navigate('/learner/dashboard', { replace: true });
      }
    }
  }, [user, profile, authLoading, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Save or clear remembered email
    if (rememberMe) {
      localStorage.setItem('lora_remembered_email', email.trim());
      localStorage.setItem('lora_remember_me', 'true');
    } else {
      localStorage.removeItem('lora_remembered_email');
      localStorage.setItem('lora_remember_me', 'false');
    }

    try {
      const result = await signIn({ email, password }, setStep);
      const role = result?.profile?.role;
      if (role === 'creator') navigate('/creator/dashboard');
      else navigate('/learner/dashboard');
    } catch (err) {
      setError(friendlyError(err.message));
    } finally {
      setLoading(false);
      setStep('');
    }
  };

  return (
    <PageTransition>
      <div className="lora-signup-page">
        {/* Top bar with Back and Logo */}
        <div className="top">
          <Link className="back" to="/">
            <svg className="ic" viewBox="0 0 24 24">
              <path d="M19 12H5M11 6l-6 6 6 6" />
            </svg>
            Home
          </Link>
          <div className="logo">
            <AppLogo to="/" height={52} />
          </div>
        </div>

        <div className="wrap">
          {/* Header */}
          <div className="hd">
            <h1>
              Welcome <em>Back</em>
            </h1>
            <p>Log in to your Lora account</p>
          </div>

          {/* Login Form Card */}
          <form className="card" onSubmit={handleSubmit} noValidate>
            <div className="g">
              {location.state?.verified && (
                <div
                  style={{
                    background: '#f0fdf4',
                    border: '1.5px solid #bbf7d0',
                    color: '#16a34a',
                    borderRadius: 14,
                    padding: '12px 16px',
                    fontSize: 14,
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <svg className="ic" viewBox="0 0 24 24" style={{ stroke: '#16a34a' }}>
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  <span>Email verified successfully! You can now log in.</span>
                </div>
              )}

              {error && (
                <div
                  style={{
                    background: '#fef2f2',
                    border: '1.5px solid #fecdd3',
                    color: '#be123c',
                    borderRadius: 14,
                    padding: '12px 16px',
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  {error}
                </div>
              )}

              {/* Email Address */}
              <div className="f">
                <label htmlFor="login-email">Email address</label>
                <div className="in">
                  <input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div className="f">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 7 }}>
                  <label htmlFor="login-password" style={{ margin: 0 }}>Password</label>
                  <Link
                    to="/reset-password"
                    style={{
                      fontSize: 13.5,
                      color: 'var(--brand)',
                      fontWeight: 600,
                    }}
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="in pw">
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    className="eye"
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <svg className="ic" viewBox="0 0 24 24">
                      {showPassword ? (
                        <>
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </>
                      ) : (
                        <>
                          <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
                          <circle cx="12" cy="12" r="3" />
                        </>
                      )}
                    </svg>
                  </button>
                </div>
              </div>

              {/* Remember Me Checkbox */}
              <label className="rem">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span className="bx">
                  <svg className="ic" viewBox="0 0 24 24">
                    <path d="m5 12 5 5 9-10" />
                  </svg>
                </span>
                Remember me on this device
              </label>

              {/* Submit Button */}
              <button className={`btn ${loading ? 'load' : ''}`} type="submit" disabled={loading}>
                {loading && <span className="sp"></span>}
                <span>{loading ? (step || 'Signing in…') : 'Log In'}</span>
              </button>
            </div>
          </form>

          {/* Sign up prompt */}
          <p className="have">
            Don't have an account? <Link to="/signup">Sign up</Link>
          </p>
        </div>
      </div>
    </PageTransition>
  );
}
