import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { PageTransition } from '../components/ui';

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
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
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
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center px-6 py-16">
        <div className="max-w-md w-full relative z-10">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-[#475569] hover:text-[#2563EB] transition-colors mb-10">
            <ArrowLeft size={16} /> Home
          </Link>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
            <h1 className="text-3xl font-bold text-[#0F172A] mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
              Welcome back
            </h1>
            <p className="text-sm text-[#475569]">Log in to your Lora account</p>
          </motion.div>

          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-3xl p-10 shadow-[0_4px_24px_rgba(0,0,0,0.08)]"
          >
            {error && (
              <div className="bg-red-50 border border-red-200 text-[#C0392B] rounded-xl px-4 py-3 text-sm mb-6">{error}</div>
            )}

            <div className="mb-6">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="you@example.com"
                required
              />
            </div>

            <div className="mb-8">
              <label className="form-label">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pr-12"
                  placeholder="Your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A6B8] hover:text-[#0F172A] transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-primary w-full py-4 text-base" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 size={18} className="animate-spin" />
                  {step || 'Signing in...'}
                </span>
              ) : (
                'Log In'
              )}
            </button>

            <p className="text-center text-sm text-[#475569] mt-6">
              Don't have an account?{' '}
              <Link to="/signup" className="text-[#2563EB] font-semibold hover:underline">
                Sign up
              </Link>
            </p>
          </motion.form>
        </div>
      </div>
    </PageTransition>
  );
}
