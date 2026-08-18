import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { ArrowLeft, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { PageTransition } from '../components/ui';

const CATEGORIES = ['Technology', 'Design', 'Business', 'Language', 'Music', 'Fitness', 'Other'];

const schema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'At least 6 characters'),
  about: z.string().min(10, 'At least 10 characters').max(300, 'Max 300 characters'),
  category: z.string().min(1, 'Select a category'),
});

function getPasswordStrength(pw) {
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}

const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
const strengthColors = ['', '#C0392B', '#E67E22', '#E67E22', '#2D7A4F', '#2D7A4F'];

function friendlyError(msg) {
  if (!msg) return 'Something went wrong. Please try again.';
  const lower = msg.toLowerCase();
  if (lower.includes('row-level security') || lower.includes('rls'))
    return 'Something went wrong creating your account. Please try again or contact support.';
  if (lower.includes('duplicate key') || lower.includes('already registered') || lower.includes('already been registered'))
    return 'An account with this email already exists. Try logging in.';
  if (lower.includes('invalid login') || lower.includes('invalid email or password'))
    return 'Incorrect email or password. Please try again.';
  if (lower.includes('error sending confirmation email') || lower.includes('rate limit'))
    return 'Email service limit reached. Please try again later or contact the administrator.';
  return 'Something went wrong. Please try again.';
}

export default function CreatorSignup() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });

  const password = watch('password', '');
  const strength = getPasswordStrength(password);
  const aboutLength = (watch('about') || '').length;

  const onSubmit = async (data) => {
    if (!phone) { setError('Phone number is required'); return; }
    setLoading(true);
    setError('');
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

      setIsSuccess(true);
    } catch (err) {
      console.error('[CreatorSignup] error:', err.message, err);
      setError(friendlyError(err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center px-6 py-16">
        <div className="max-w-lg w-full relative z-10">
          <Link to="/signup" className="inline-flex items-center gap-2 text-sm text-[#475569] hover:text-[#2563EB] transition-colors mb-10">
            <ArrowLeft size={16} /> Back
          </Link>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
            <h1 className="text-3xl font-bold text-[#0F172A] mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
              Create your <span className="text-[#2563EB]">Creator</span> account
            </h1>
            <p className="text-sm text-[#475569]">Start teaching and earning on Lora</p>
          </motion.div>

          {isSuccess ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-3xl p-10 shadow-[0_4px_24px_rgba(0,0,0,0.08)] text-center"
            >
              <div className="w-16 h-16 bg-blue-50 text-[#2563EB] rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-[#0F172A] mb-4">Check your email</h2>
              <p className="text-[#475569] mb-8">
                We've sent a confirmation link to <span className="font-medium text-[#0F172A]">{watch('email')}</span>. 
                Please verify your email address to complete your registration and set up your creator subscription.
              </p>
              <Link to="/login" className="btn-primary w-full py-4 text-base block">
                Go to Login
              </Link>
            </motion.div>
          ) : (
            <motion.form
            onSubmit={handleSubmit(onSubmit)}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-3xl p-10 shadow-[0_4px_24px_rgba(0,0,0,0.08)]"
          >
            {error && (
              <div className="bg-red-50 border border-red-200 text-[#C0392B] rounded-xl px-4 py-3 text-sm mb-6">{error}</div>
            )}

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="form-label">First Name</label>
                <input {...register('firstName')} className="input-field" placeholder="John" />
                {errors.firstName && <p className="form-error">{errors.firstName.message}</p>}
              </div>
              <div>
                <label className="form-label">Last Name</label>
                <input {...register('lastName')} className="input-field" placeholder="Doe" />
                {errors.lastName && <p className="form-error">{errors.lastName.message}</p>}
              </div>
            </div>

            <div className="mb-6">
              <label className="form-label">Phone Number</label>
              <PhoneInput
                international
                defaultCountry="US"
                value={phone}
                onChange={setPhone}
              />
            </div>

            <div className="mb-6">
              <label className="form-label">Email Address</label>
              <input {...register('email')} type="email" className="input-field" placeholder="you@example.com" />
              {errors.email && <p className="form-error">{errors.email.message}</p>}
            </div>

            <div className="mb-6">
              <label className="form-label">Password</label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  className="input-field pr-12"
                  placeholder="Min 6 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A6B8] hover:text-[#0F172A] transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {password && (
                <div className="mt-2">
                  <div className="strength-bar">
                    <div
                      className="strength-fill"
                      style={{
                        width: `${(strength / 5) * 100}%`,
                        background: strengthColors[strength],
                      }}
                    />
                  </div>
                  <p className="text-xs mt-1" style={{ color: strengthColors[strength] }}>
                    {strengthLabels[strength]}
                  </p>
                </div>
              )}
              {errors.password && <p className="form-error">{errors.password.message}</p>}
            </div>


            <div className="mb-6">
              <label className="form-label">Category</label>
              <select {...register('category')} className="select-field">
                <option value="">Select your category</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {errors.category && <p className="form-error">{errors.category.message}</p>}
            </div>

            <div className="mb-6">
              <label className="form-label">About You ({aboutLength}/300)</label>
              <textarea
                {...register('about')}
                className="textarea-field"
                placeholder="Tell learners about your expertise and teaching style..."
                maxLength={300}
                rows={3}
              />
              {errors.about && <p className="form-error">{errors.about.message}</p>}
            </div>

            <button type="submit" className="btn-primary w-full py-4 mt-2 text-base" disabled={loading}>
              {loading ? <Loader2 size={18} className="animate-spin" /> : 'Create Creator Account'}
            </button>

            <p className="text-center text-sm text-[#475569] mt-6">
              Already have an account?{' '}
              <Link to="/login" className="text-[#2563EB] font-semibold hover:underline">Log in</Link>
            </p>
          </motion.form>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
