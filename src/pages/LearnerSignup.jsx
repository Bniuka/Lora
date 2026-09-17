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

const schema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'At least 6 characters'),
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
  return 'Something went wrong. Please try again.';
}

export default function LearnerSignup() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });

  const password = watch('password', '');
  const strength = getPasswordStrength(password);

  const onSubmit = async (data) => {
    if (!phone) { setError('Phone number is required'); return; }
    setLoading(true);
    setError('');
    try {
      await signUp({
        email: data.email,
        password: data.password,
        role: 'learner',
        firstName: data.firstName,
        lastName: data.lastName,
        contactNumber: phone,
        countryCode: phone ? phone.slice(0, phone.length - 10) : '',
      });
      navigate('/learner/dashboard');
    } catch (err) {
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
              Create your <span className="text-[#2563EB]">Learner</span> account
            </h1>
            <p className="text-sm text-[#475569]">Start discovering and learning on Lora</p>
          </motion.div>

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

            <button type="submit" className="btn-primary w-full py-4 mt-2 text-base" disabled={loading}>
              {loading ? <Loader2 size={18} className="animate-spin" /> : 'Create Learner Account'}
            </button>

            <p className="text-center text-sm text-[#475569] mt-6">
              Already have an account?{' '}
              <Link to="/login" className="text-[#2563EB] font-semibold hover:underline">Log in</Link>
            </p>
          </motion.form>
        </div>
      </div>
    </PageTransition>
  );
}
