import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { PageTransition } from '../components/ui';

export default function ResetPassword() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await resetPassword(email);
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center px-6 py-16">
        <div className="max-w-md w-full relative z-10">
          <Link to="/login" className="inline-flex items-center gap-2 text-sm text-[#475569] hover:text-[#2563EB] transition-colors mb-10">
            <ArrowLeft size={16} /> Back to Login
          </Link>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
            <h1 className="text-3xl font-bold text-[#0F172A] mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
              Reset Password
            </h1>
            <p className="text-sm text-[#475569]">Enter your email address and we'll send you a link to reset your password.</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-3xl p-10 shadow-[0_4px_24px_rgba(0,0,0,0.08)]"
          >
            {success ? (
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 size={32} />
                </div>
                <h3 className="text-xl font-semibold text-[#0F172A] mb-2">Check your email</h3>
                <p className="text-[#475569] mb-6">
                  We've sent password reset instructions to <strong>{email}</strong>
                </p>
                <Link to="/login" className="btn-primary w-full py-4 text-base block text-center">
                  Return to Login
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                {error && (
                  <div className="bg-red-50 border border-red-200 text-[#C0392B] rounded-xl px-4 py-3 text-sm mb-6">{error}</div>
                )}

                <div className="mb-8">
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

                <button type="submit" className="btn-primary w-full py-4 text-base" disabled={loading}>
                  {loading ? (
                    <span className="flex items-center gap-2 justify-center">
                      <Loader2 size={18} className="animate-spin" />
                      Sending link...
                    </span>
                  ) : (
                    'Send Reset Link'
                  )}
                </button>
              </form>
            )}
          </motion.div>
        </div>
      </div>
    </PageTransition>
  );
}
