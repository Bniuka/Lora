import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, RefreshCw, ArrowRight, CheckCircle, AlertCircle, Clock } from "lucide-react";
import { supabase } from "../lib/supabase";
import { PageTransition } from "../components/ui";

const COOLDOWN_SECONDS = 60;

export default function VerifyEmail() {
  const location = useLocation();
  const email = location.state?.email || "";
  const [resent, setResent] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendError, setResendError] = useState("");
  const [cooldown, setCooldown] = useState(0); // seconds remaining

  // Count down the cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleResend = async () => {
    if (!email || resending || cooldown > 0) return;
    setResending(true);
    setResendError("");
    setResent(false);

    try {
      // Try the primary resend method
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });

      if (error) {
        // If resend fails, fall back to signInWithOtp which also sends a magic link
        const { error: otpError } = await supabase.auth.signInWithOtp({
          email,
          options: {
            shouldCreateUser: false,
            emailRedirectTo: `${window.location.origin}/login`,
          },
        });

        if (otpError) {
          throw new Error(otpError.message);
        }
      }

      setResent(true);
      setCooldown(COOLDOWN_SECONDS); // start 60s cooldown
      setTimeout(() => setResent(false), 6000);
    } catch (err) {
      console.error("Resend error:", err);
      setResendError("Could not resend the email. Please wait a moment and try again.");
    } finally {
      setResending(false);
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-md w-full text-center"
        >
          {/* Icon */}
          <div className="flex items-center justify-center mb-8">
            <div className="relative">
              <div className="w-24 h-24 bg-[#DBEAFE] rounded-full flex items-center justify-center shadow-lg shadow-blue-100">
                <Mail size={44} className="text-[#2563EB]" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-[#16A34A] rounded-full flex items-center justify-center border-2 border-white">
                <CheckCircle size={18} className="text-white" />
              </div>
            </div>
          </div>

          {/* Heading */}
          <h1 className="text-3xl font-extrabold text-[#0F172A] mb-3" style={{ fontFamily: "var(--font-heading)" }}>
            Check your inbox!
          </h1>
          <p className="text-[#475569] text-base leading-relaxed mb-2">
            We sent a verification email to:
          </p>
          {email && (
            <div className="inline-block bg-[#F1F5F9] border border-[#E2E8F0] text-[#0F172A] font-bold px-4 py-2 rounded-xl text-sm mb-6">
              {email}
            </div>
          )}
          <p className="text-[#64748B] text-sm leading-relaxed mb-8">
            Click the <strong>"Verify Email"</strong> button in the email to activate
            your account. Then come back and log in to get started.
          </p>

          {/* Steps */}
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 text-left mb-8 shadow-sm">
            <p className="text-xs font-bold text-[#94A6B8] uppercase tracking-wider mb-4">What to do next</p>
            <div className="space-y-3">
              {[
                "Open the email from Lora in your inbox (check Spam too)",
                'Click the "Verify Email" button inside the email',
                "You will be taken to the login page — sign in to get started!",
              ].map((text, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#2563EB] text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </div>
                  <p className="text-sm text-[#475569]">{text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <Link
            to="/login"
            className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-200 transition-all mb-5"
          >
            Go to Login <ArrowRight size={18} />
          </Link>

          {/* Resend feedback */}
          <AnimatePresence>
            {resent && (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-center gap-2 text-sm text-[#16A34A] bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl px-4 py-3 mb-3"
              >
                <CheckCircle size={16} />
                Email resent! Check your inbox (and spam folder).
              </motion.div>
            )}
            {resendError && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-center gap-2 text-sm text-[#C0392B] bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-3"
              >
                <AlertCircle size={16} />
                {resendError}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Resend button */}
          {cooldown > 0 ? (
            <div className="flex items-center justify-center gap-1.5 text-sm text-[#94A6B8]">
              <Clock size={14} />
              Resend available in {cooldown}s
            </div>
          ) : (
            <button
              onClick={handleResend}
              disabled={resending || !email}
              className="text-sm text-[#64748B] hover:text-[#2563EB] flex items-center justify-center gap-1.5 mx-auto transition-colors disabled:opacity-40"
            >
              <RefreshCw size={14} className={resending ? "animate-spin" : ""} />
              {resending ? "Sending..." : "Didn't receive it? Resend email"}
            </button>
          )}

          <p className="text-xs text-[#94A6B8] mt-6">
            Also check your <strong>Spam</strong> or <strong>Junk</strong> folder if you do not see it.
          </p>
        </motion.div>
      </div>
    </PageTransition>
  );
}
