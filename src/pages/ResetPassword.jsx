import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Loader2, Eye, EyeOff, KeyRound, Mail, ShieldCheck, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { PageTransition } from '../components/ui';
import AppLogo from '../components/AppLogo';

const COOLDOWN_SECONDS = 60;

export default function ResetPassword() {
  const navigate = useNavigate();

  // Multi-step flow: 'email' -> 'otp' -> 'password' -> 'success'
  const [step, setStep] = useState('email');

  // Step 1: Email
  const [email, setEmail] = useState('');

  // Step 2: OTP
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const otpRefs = useRef([]);
  const [cooldown, setCooldown] = useState(0);
  const [resending, setResending] = useState(false);

  // Step 3: New Password
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Shared state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Cooldown countdown
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  // Auto-focus first OTP input when switching to OTP step
  useEffect(() => {
    if (step === 'otp' && otpRefs.current[0]) {
      setTimeout(() => otpRefs.current[0]?.focus(), 150);
    }
  }, [step]);

  // --------------------------------------------------------------------------
  // STEP 1: Send Recovery OTP Email
  // --------------------------------------------------------------------------
  const handleSendEmail = async (e) => {
    e?.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim());
      if (resetError) throw resetError;

      setStep('otp');
      setCooldown(COOLDOWN_SECONDS);
      setOtp(['', '', '', '', '', '']);
    } catch (err) {
      console.error('[ResetPassword] send error:', err);
      setError(err.message || 'Could not send recovery code. Please check your email.');
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // STEP 2: Verify Recovery OTP Code
  // --------------------------------------------------------------------------
  const handleVerifyOtp = async (codeToVerify) => {
    const code = (codeToVerify || otp.join('')).trim();
    if (code.length !== 6) {
      setError('Please enter all 6 digits of the code.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: code,
        type: 'recovery',
      });

      if (verifyError) throw verifyError;

      // Successfully authenticated into recovery session -> advance to Set Password
      setStep('password');
    } catch (err) {
      console.error('[ResetPassword] verify error:', err);
      setError('Invalid or expired 6-digit code. Please check your email or click Resend.');
      otpRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (cooldown > 0 || resending) return;
    setResending(true);
    setError('');

    try {
      const { error: resendError } = await supabase.auth.resetPasswordForEmail(email.trim());
      if (resendError) throw resendError;

      setCooldown(COOLDOWN_SECONDS);
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } catch (err) {
      console.error('[ResetPassword] resend error:', err);
      setError('Failed to resend code. Please try again.');
    } finally {
      setResending(false);
    }
  };

  // OTP Input event listeners
  const handleOtpChange = (index, e) => {
    const val = e.target.value;
    const digit = val.slice(-1);

    if (digit && !/^\d$/.test(digit)) return;

    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    setError('');

    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }

    if (newOtp.join('').length === 6) {
      handleVerifyOtp(newOtp.join(''));
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (otp[index]) {
        const newOtp = [...otp];
        newOtp[index] = '';
        setOtp(newOtp);
      } else if (index > 0) {
        const newOtp = [...otp];
        newOtp[index - 1] = '';
        setOtp(newOtp);
        otpRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      otpRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasteText = e.clipboardData.getData('text') || '';
    const cleanDigits = pasteText.replace(/\D/g, '').slice(0, 6);

    if (!cleanDigits) return;

    const newOtp = ['', '', '', '', '', ''];
    for (let i = 0; i < cleanDigits.length; i++) {
      newOtp[i] = cleanDigits[i];
    }
    setOtp(newOtp);
    setError('');

    if (cleanDigits.length === 6) {
      otpRefs.current[5]?.focus();
      handleVerifyOtp(cleanDigits);
    } else {
      otpRefs.current[cleanDigits.length]?.focus();
    }
  };

  // --------------------------------------------------------------------------
  // STEP 3: Update Password
  // --------------------------------------------------------------------------
  const handleUpdatePassword = async (e) => {
    e?.preventDefault();
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      setStep('success');
      setTimeout(() => {
        navigate('/login', { state: { passwordReset: true } });
      }, 2600);
    } catch (err) {
      console.error('[ResetPassword] update error:', err);
      setError(err.message || 'Could not update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isOtpComplete = otp.every((d) => d !== '');

  return (
    <PageTransition>
      <div className="min-h-screen bg-[#F4F6FB] flex items-center justify-center px-4 py-12 relative overflow-hidden">
        
        {/* Subtle decorative glow backdrops */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-100/60 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-100/60 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-md w-full relative z-10">
          
          {/* Top navigation & logo */}
          <div className="flex items-center justify-between mb-8">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-sm font-medium text-[#64748B] hover:text-[#0F172A] transition-colors"
            >
              <ArrowLeft size={16} /> Back to Login
            </Link>
            <AppLogo to="/" height={42} />
          </div>

          {/* Step Progress Pills */}
          {step !== 'success' && (
            <div className="flex items-center justify-center gap-2 mb-8">
              {[
                { id: 'email', label: '1. Email' },
                { id: 'otp', label: '2. Code' },
                { id: 'password', label: '3. Password' },
              ].map((s, idx) => {
                const isActive = step === s.id;
                const isPast =
                  (step === 'otp' && idx === 0) ||
                  (step === 'password' && idx <= 1);

                return (
                  <div
                    key={s.id}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-[#2563EB] text-white shadow-sm'
                        : isPast
                        ? 'bg-blue-100 text-[#2563EB]'
                        : 'bg-slate-200/70 text-[#94A3B8]'
                    }`}
                  >
                    <span>{s.label}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Card Container */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[28px] p-8 md:p-10 shadow-[0_20px_50px_-15px_rgba(15,23,42,0.08)] border border-slate-100"
          >
            <AnimatePresence mode="wait">
              {/* ============================================================== */}
              {/* STEP 1: ENTER EMAIL                                            */}
              {/* ============================================================== */}
              {step === 'email' && (
                <motion.div
                  key="step-email"
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="w-14 h-14 bg-blue-50 text-[#2563EB] rounded-2xl flex items-center justify-center mx-auto mb-5 border border-blue-100 shadow-sm">
                    <KeyRound size={26} strokeWidth={2.2} />
                  </div>

                  <h1 className="text-2xl font-bold text-[#0F172A] text-center mb-2">
                    Reset Password
                  </h1>
                  <p className="text-sm text-[#64748B] text-center mb-7 leading-relaxed">
                    Enter your account's email address and we'll send you a 6-digit recovery code.
                  </p>

                  {error && (
                    <div className="bg-red-50 border border-red-200 text-[#DC2626] rounded-xl px-4 py-3 text-sm mb-5 font-medium">
                      {error}
                    </div>
                  )}

                  <form onSubmit={handleSendEmail}>
                    <div className="mb-6">
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#475569] mb-2">
                        Email Address
                      </label>
                      <div className="relative">
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full px-4 py-3.5 pl-11 bg-slate-50 border border-slate-200 rounded-xl text-[#0F172A] text-sm focus:bg-white focus:border-[#2563EB] focus:ring-4 focus:ring-blue-100 outline-none transition-all placeholder:text-slate-400"
                          placeholder="you@example.com"
                          required
                          autoFocus
                        />
                        <Mail
                          size={18}
                          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="btn-primary w-full py-3.5 text-base rounded-xl font-semibold shadow-md shadow-blue-500/20"
                      disabled={loading || !email.trim()}
                    >
                      {loading ? (
                        <span className="flex items-center gap-2 justify-center">
                          <Loader2 size={18} className="animate-spin" />
                          Sending code...
                        </span>
                      ) : (
                        'Send Recovery Code'
                      )}
                    </button>
                  </form>
                </motion.div>
              )}

              {/* ============================================================== */}
              {/* STEP 2: ENTER 6-DIGIT OTP                                      */}
              {/* ============================================================== */}
              {step === 'otp' && (
                <motion.div
                  key="step-otp"
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="w-14 h-14 bg-blue-50 text-[#2563EB] rounded-2xl flex items-center justify-center mx-auto mb-5 border border-blue-100 shadow-sm">
                    <ShieldCheck size={28} strokeWidth={2.2} />
                  </div>

                  <h1 className="text-2xl font-bold text-[#0F172A] text-center mb-2">
                    Enter Recovery Code
                  </h1>
                  <p className="text-sm text-[#64748B] text-center mb-1 leading-relaxed">
                    We sent a 6-digit recovery code to:
                  </p>
                  <p className="text-sm font-semibold text-[#0F172A] text-center mb-6">
                    {email}
                  </p>

                  {error && (
                    <div className="bg-red-50 border border-red-200 text-[#DC2626] rounded-xl px-4 py-3 text-sm mb-5 font-medium text-center">
                      {error}
                    </div>
                  )}

                  {/* 6 OTP Numeric Input Boxes */}
                  <div className="flex items-center justify-center gap-2 mb-6" onPaste={handleOtpPaste}>
                    {[0, 1, 2].map((idx) => (
                      <input
                        key={idx}
                        ref={(el) => (otpRefs.current[idx] = el)}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={1}
                        value={otp[idx]}
                        onChange={(e) => handleOtpChange(idx, e)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        className={`w-11 h-14 sm:w-12 sm:h-16 text-center text-2xl font-bold rounded-xl border-2 transition-all outline-none ${
                          otp[idx]
                            ? 'border-blue-500 bg-blue-50/30 text-blue-700'
                            : error
                            ? 'border-red-300 bg-red-50/20 text-red-600'
                            : 'border-slate-200 bg-white text-slate-900 focus:border-[#2563EB] focus:ring-4 focus:ring-blue-100'
                        }`}
                        disabled={loading}
                      />
                    ))}

                    <div className="w-2 h-0.5 bg-slate-300 rounded" aria-hidden="true" />

                    {[3, 4, 5].map((idx) => (
                      <input
                        key={idx}
                        ref={(el) => (otpRefs.current[idx] = el)}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={1}
                        value={otp[idx]}
                        onChange={(e) => handleOtpChange(idx, e)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        className={`w-11 h-14 sm:w-12 sm:h-16 text-center text-2xl font-bold rounded-xl border-2 transition-all outline-none ${
                          otp[idx]
                            ? 'border-blue-500 bg-blue-50/30 text-blue-700'
                            : error
                            ? 'border-red-300 bg-red-50/20 text-red-600'
                            : 'border-slate-200 bg-white text-slate-900 focus:border-[#2563EB] focus:ring-4 focus:ring-blue-100'
                        }`}
                        disabled={loading}
                      />
                    ))}
                  </div>

                  {/* Primary Verify Button */}
                  <button
                    type="button"
                    onClick={() => handleVerifyOtp()}
                    className="btn-primary w-full py-3.5 text-base rounded-xl font-semibold shadow-md shadow-blue-500/20 mb-4"
                    disabled={loading || !isOtpComplete}
                  >
                    {loading ? (
                      <span className="flex items-center gap-2 justify-center">
                        <Loader2 size={18} className="animate-spin" />
                        Verifying code...
                      </span>
                    ) : (
                      'Verify Code'
                    )}
                  </button>

                  {/* Resend Action */}
                  <div className="flex items-center justify-center gap-2 text-sm text-[#64748B] mb-4">
                    <span>Didn't get the code?</span>
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={cooldown > 0 || resending}
                      className="font-semibold text-[#2563EB] hover:underline disabled:text-slate-400 disabled:no-underline flex items-center gap-1 cursor-pointer"
                    >
                      {resending && <RefreshCw size={13} className="animate-spin" />}
                      {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
                    </button>
                  </div>

                  {/* Back to change email */}
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setStep('email');
                        setError('');
                      }}
                      className="text-xs text-[#94A3B8] hover:text-[#0F172A] underline cursor-pointer transition-colors"
                    >
                      Change email address
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ============================================================== */}
              {/* STEP 3: SET NEW PASSWORD                                       */}
              {/* ============================================================== */}
              {step === 'password' && (
                <motion.div
                  key="step-password"
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="w-14 h-14 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-green-100 shadow-sm">
                    <KeyRound size={26} strokeWidth={2.2} />
                  </div>

                  <h1 className="text-2xl font-bold text-[#0F172A] text-center mb-2">
                    Create New Password
                  </h1>
                  <p className="text-sm text-[#64748B] text-center mb-6 leading-relaxed">
                    Code verified! Please enter your new password below.
                  </p>

                  {error && (
                    <div className="bg-red-50 border border-red-200 text-[#DC2626] rounded-xl px-4 py-3 text-sm mb-5 font-medium">
                      {error}
                    </div>
                  )}

                  <form onSubmit={handleUpdatePassword}>
                    <div className="mb-4">
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#475569] mb-2">
                        New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full px-4 py-3.5 pr-11 bg-slate-50 border border-slate-200 rounded-xl text-[#0F172A] text-sm focus:bg-white focus:border-[#2563EB] focus:ring-4 focus:ring-blue-100 outline-none transition-all placeholder:text-slate-400"
                          placeholder="At least 6 characters"
                          required
                          minLength={6}
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>

                    <div className="mb-7">
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#475569] mb-2">
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full px-4 py-3.5 pr-11 bg-slate-50 border border-slate-200 rounded-xl text-[#0F172A] text-sm focus:bg-white focus:border-[#2563EB] focus:ring-4 focus:ring-blue-100 outline-none transition-all placeholder:text-slate-400"
                          placeholder="Repeat new password"
                          required
                          minLength={6}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="btn-primary w-full py-3.5 text-base rounded-xl font-semibold shadow-md shadow-blue-500/20"
                      disabled={loading || !newPassword || !confirmPassword}
                    >
                      {loading ? (
                        <span className="flex items-center gap-2 justify-center">
                          <Loader2 size={18} className="animate-spin" />
                          Updating password...
                        </span>
                      ) : (
                        'Save New Password'
                      )}
                    </button>
                  </form>
                </motion.div>
              )}

              {/* ============================================================== */}
              {/* STEP 4: SUCCESS                                                */}
              {/* ============================================================== */}
              {step === 'success' && (
                <motion.div
                  key="step-success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-4"
                >
                  <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-5 shadow-sm">
                    <CheckCircle2 size={36} />
                  </div>
                  <h2 className="text-2xl font-bold text-[#0F172A] mb-2">
                    Password Reset Complete!
                  </h2>
                  <p className="text-sm text-[#64748B] mb-7 leading-relaxed">
                    Your password has been securely updated. Redirecting you to login...
                  </p>
                  <Link
                    to="/login"
                    className="btn-primary w-full py-3.5 text-base rounded-xl font-semibold block text-center shadow-md shadow-blue-500/20"
                  >
                    Go to Login Now
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </PageTransition>
  );
}
