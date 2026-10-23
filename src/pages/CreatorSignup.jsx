import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { useAuth } from '../hooks/useAuth';
import { PageTransition } from '../components/ui';
import AppLogo from '../components/AppLogo';
import './signup-page.css';

const CATEGORIES = ['Technology', 'Design', 'Business', 'Language', 'Music', 'Fitness', 'Other'];

const schema = z.object({
  firstName: z.string().min(1, 'Enter your first name'),
  lastName: z.string().min(1, 'Enter your last name'),
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'At least 6 characters required'),
  category: z.string().min(1, 'Please select your category'),
  about: z.string().min(10, 'At least 10 characters required').max(300, 'Max 300 characters'),
});

function getPasswordStrength(pw) {
  let score = 0;
  if (!pw) return 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}

function friendlyError(msg) {
  if (!msg) return 'Something went wrong. Please try again.';
  const lower = msg.toLowerCase();
  if (lower.includes('row-level security') || lower.includes('rls'))
    return 'Something went wrong creating your account. Please try again or contact support.';
  if (lower.includes('duplicate key') || lower.includes('already registered') || lower.includes('already been registered'))
    return 'An account with this email already exists. Try logging in.';
  if (lower.includes('invalid login') || lower.includes('invalid email or password'))
    return 'Incorrect email or password. Please try again.';
  return msg;
}

export default function CreatorSignup() {
  const { signUp, user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => localStorage.getItem('lora_remember_me') !== 'false');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Auto-redirect if already logged in
  useEffect(() => {
    if (!authLoading && user && profile) {
      if (profile.role === 'creator') navigate('/creator/dashboard', { replace: true });
      else navigate('/learner/dashboard', { replace: true });
    }
  }, [user, profile, authLoading, navigate]);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      email: localStorage.getItem('lora_remembered_email') || '',
      category: '',
      about: '',
    },
  });

  const password = watch('password', '');
  const strength = getPasswordStrength(password);
  const aboutLength = (watch('about') || '').length;

  const meterClass = !password
    ? ''
    : strength <= 1
    ? 'l1'
    : strength === 2
    ? 'l2'
    : strength === 3
    ? 'l3'
    : 'l4';

  const strengthText = !password
    ? ''
    : strength <= 1
    ? 'Weak'
    : strength === 2
    ? 'Fair'
    : strength === 3
    ? 'Good'
    : 'Strong';

  const onSubmit = async (data) => {
    if (!phone) {
      setPhoneError(true);
      setError('Phone number is required');
      return;
    }
    setPhoneError(false);
    setLoading(true);
    setError('');

    if (rememberMe) {
      localStorage.setItem('lora_remembered_email', data.email.trim());
      localStorage.setItem('lora_remember_me', 'true');
    }

    try {
      await signUp({
        email: data.email,
        password: data.password,
        role: 'creator',
        firstName: data.firstName,
        lastName: data.lastName,
        contactNumber: phone,
        countryCode: phone ? phone.slice(0, phone.length - 10) : '',
        about: data.about,
        category: data.category,
      });

      navigate('/verify-email', { state: { email: data.email, role: 'creator' } });
    } catch (err) {
      console.error('[CreatorSignup] error:', err.message, err);
      setError(friendlyError(err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageTransition>
      <div className="lora-signup-page">
        {/* Top bar with Back and Logo */}
        <div className="top">
          <Link className="back" to="/signup">
            <svg className="ic" viewBox="0 0 24 24">
              <path d="M19 12H5M11 6l-6 6 6 6" />
            </svg>
            Back
          </Link>
          <div className="logo">
            <AppLogo role="creator" to="/" height={52} />
          </div>
        </div>

        <div className="wrap">
          {/* Header */}
          <div className="hd">
            <h1>
              Create your <em>Creator</em> account
            </h1>
            <p>Start teaching and earning on Lora</p>
          </div>

          {/* Signup Form Card */}
          <form className="card" onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="g">
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

              {/* First Name & Last Name */}
              <div className="g g2">
                <div className="f">
                  <label htmlFor="fn">First name</label>
                  <div className={`in ${errors.firstName ? 'err' : ''}`}>
                    <input
                      id="fn"
                      {...register('firstName')}
                      placeholder="John"
                      autoComplete="given-name"
                      required
                    />
                  </div>
                  {errors.firstName && <div className="msg">{errors.firstName.message}</div>}
                </div>

                <div className="f">
                  <label htmlFor="ln">Last name</label>
                  <div className={`in ${errors.lastName ? 'err' : ''}`}>
                    <input
                      id="ln"
                      {...register('lastName')}
                      placeholder="Doe"
                      autoComplete="family-name"
                      required
                    />
                  </div>
                  {errors.lastName && <div className="msg">{errors.lastName.message}</div>}
                </div>
              </div>

              {/* Phone number */}
              <div className="f">
                <label htmlFor="ph">Phone number</label>
                <div className={`PhoneInput ${phoneError ? 'err' : ''}`}>
                  <PhoneInput
                    id="ph"
                    international
                    defaultCountry="LK"
                    value={phone}
                    onChange={(val) => {
                      setPhone(val || '');
                      if (val) setPhoneError(false);
                    }}
                    placeholder="70 123 4567"
                  />
                </div>
                {phoneError && <div className="msg" style={{ display: 'block' }}>Phone number is required</div>}
              </div>

              {/* Email address */}
              <div className="f">
                <label htmlFor="em">Email address</label>
                <div className={`in ${errors.email ? 'err' : ''}`}>
                  <input
                    id="em"
                    {...register('email')}
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                  />
                </div>
                {errors.email && <div className="msg">{errors.email.message}</div>}
                <div className="info">
                  <svg className="ic" viewBox="0 0 24 24">
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <path d="m4 8 8 6 8-6" />
                  </svg>
                  We will send a verification email to this address. Please make sure it's correct.
                </div>
              </div>

              {/* Password */}
              <div className="f">
                <label htmlFor="pw">Password</label>
                <div className={`in pw ${errors.password ? 'err' : ''}`}>
                  <input
                    id="pw"
                    {...register('password')}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Create a password"
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
                {errors.password && <div className="msg">{errors.password.message}</div>}

                <div className={`meter ${meterClass}`}>
                  <i></i>
                  <i></i>
                  <i></i>
                  <i></i>
                </div>
                <div className={`lvl ${meterClass}`}>
                  <span>Password strength</span>
                  <b>{strengthText}</b>
                </div>
              </div>

              {/* Category */}
              <div className="f">
                <label htmlFor="cat">Category</label>
                <div className={`in ${errors.category ? 'err' : ''}`}>
                  <select id="cat" {...register('category')} required>
                    <option value="" disabled>
                      Select your category
                    </option>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                {errors.category && <div className="msg">{errors.category.message}</div>}
              </div>

              {/* About you */}
              <div className="f">
                <label htmlFor="ab">
                  About you <span className={`cnt ${aboutLength >= 300 ? 'max' : ''}`}>{aboutLength}/300</span>
                </label>
                <div className={`in ${errors.about ? 'err' : ''}`}>
                  <textarea
                    id="ab"
                    {...register('about')}
                    maxLength={300}
                    placeholder="Tell learners about your expertise and teaching style..."
                  ></textarea>
                </div>
                {errors.about && <div className="msg">{errors.about.message}</div>}
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
                <span>{loading ? 'Creating account…' : 'Create Creator Account'}</span>
              </button>
            </div>
          </form>

          {/* Login prompt */}
          <p className="have">
            Already have an account? <Link to="/login">Log in</Link>
          </p>
        </div>
      </div>
    </PageTransition>
  );
}
