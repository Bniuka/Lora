import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import AppLogo from "../components/AppLogo";
import { LoadingAnimation } from "../components/ui";
import "./verify-email.css";

const COOLDOWN_SECONDS = 60;

const PROVIDER_MAP = {
  "gmail.com": "https://mail.google.com",
  "outlook.com": "https://outlook.live.com",
  "hotmail.com": "https://outlook.live.com",
  "yahoo.com": "https://mail.yahoo.com",
  "icloud.com": "https://www.icloud.com/mail",
};

export default function VerifyEmail() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refreshProfile } = useAuth();

  // If user clicks an external token_hash link: /verify-email?token_hash=...&type=signup
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") || "signup";

  // Email & role from navigation state, query params, or localStorage
  const emailParam = searchParams.get("email");
  const stateEmail = location.state?.email;
  const storedEmail = typeof window !== "undefined" ? localStorage.getItem("pending_verify_email") : "";
  const email = stateEmail || emailParam || storedEmail || "";

  const stateRole = location.state?.role;
  const storedRole = typeof window !== "undefined" ? localStorage.getItem("pending_verify_role") : "";
  const role = stateRole || storedRole || "creator";

  // Preserve in localStorage so page refresh doesn't lose state
  useEffect(() => {
    if (stateEmail || emailParam) {
      localStorage.setItem("pending_verify_email", stateEmail || emailParam);
    }
    if (stateRole) {
      localStorage.setItem("pending_verify_role", stateRole);
    }
  }, [stateEmail, emailParam, stateRole]);

  // 8-digit OTP state (Supabase standard default)
  const [otp, setOtp] = useState(["", "", "", "", "", "", "", ""]);
  const inputRefs = useRef([]);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(COOLDOWN_SECONDS);
  const [toastMsg, setToastMsg] = useState("");

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 2600);
  };

  // Auto-focus first input on mount
  useEffect(() => {
    if (!tokenHash && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [tokenHash]);

  // Count down the cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  // Handle direct token_hash link verification if clicked from an old email
  useEffect(() => {
    if (!tokenHash) return;

    const verifyToken = async () => {
      setVerifying(true);
      setOtpError("");
      try {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type,
        });

        if (error) throw error;
        setVerified(true);
        localStorage.removeItem("pending_verify_email");
        localStorage.removeItem("pending_verify_role");
        if (refreshProfile) await refreshProfile();

        const targetDashboard = role === "creator" ? "/creator/dashboard" : "/learner/dashboard";
        setTimeout(() => {
          navigate(targetDashboard, { replace: true });
        }, 1800);
      } catch (err) {
        console.error("Verification error:", err);
        setOtpError(err.message || "Invalid or expired link. Please enter the 6-digit code or request a new one.");
      } finally {
        setVerifying(false);
      }
    };

    verifyToken();
  }, [tokenHash, type, role, navigate, refreshProfile]);

  // Submit OTP Verification
  const verifyCode = async (codeToVerify) => {
    const raw = (codeToVerify || otp.join("")).trim();
    if (!raw || (raw.length !== 8 && raw.length !== 6)) {
      setOtpError("Please enter the complete verification code.");
      return;
    }

    if (!email) {
      setOtpError("Email address missing. Please return to signup and try again.");
      return;
    }

    setVerifying(true);
    setOtpError("");

    try {
      // 1. Try verifying with type: 'signup'
      let { error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: raw,
        type: "signup",
      });

      // 2. Fallback to type: 'email' if the signup token was issued as an email OTP
      if (error) {
        const fallback = await supabase.auth.verifyOtp({
          email: email.trim(),
          token: raw,
          type: "email",
        });
        if (!fallback.error) {
          error = null;
        }
      }

      if (error) {
        throw error;
      }

      setVerified(true);
      localStorage.removeItem("pending_verify_email");
      localStorage.removeItem("pending_verify_role");

      if (refreshProfile) {
        try {
          await refreshProfile();
        } catch (e) {
          console.warn("Could not immediately refresh profile:", e);
        }
      }

      // Smooth redirection to appropriate destination
      const targetDashboard = role === "creator" ? "/creator/dashboard" : "/learner/dashboard";
      setTimeout(() => {
        navigate(targetDashboard, { replace: true });
      }, 1600);
    } catch (err) {
      console.error("OTP Verification Error:", err);
      setOtpError("Invalid or expired code. Please check your code or click Resend.");
      // Shake focus on first box
      inputRefs.current[0]?.focus();
    } finally {
      setVerifying(false);
    }
  };

  // OTP Input Handlers
  const handleDigitChange = (index, e) => {
    const val = e.target.value;
    const digit = val.slice(-1); // Take last typed character

    if (digit && !/^\d$/.test(digit)) return; // Digits only

    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    setOtpError("");

    if (digit && index < 7) {
      // Move to next input box
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-verify if all 8 digits are filled
    const fullCode = newOtp.join("");
    if (fullCode.length === 8) {
      verifyCode(fullCode);
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace") {
      if (otp[index]) {
        // Clear current
        const newOtp = [...otp];
        newOtp[index] = "";
        setOtp(newOtp);
      } else if (index > 0) {
        // Focus previous & clear previous
        const newOtp = [...otp];
        newOtp[index - 1] = "";
        setOtp(newOtp);
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 7) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasteText = e.clipboardData.getData("text") || "";
    const cleanDigits = pasteText.replace(/\D/g, "").slice(0, 8);

    if (!cleanDigits) return;

    const newOtp = Array(8).fill("");
    for (let i = 0; i < cleanDigits.length; i++) {
      newOtp[i] = cleanDigits[i];
    }
    setOtp(newOtp);
    setOtpError("");

    if (cleanDigits.length === 8 || cleanDigits.length === 6) {
      inputRefs.current[Math.min(cleanDigits.length, 7)]?.focus();
      verifyCode(cleanDigits);
    } else {
      inputRefs.current[cleanDigits.length]?.focus();
    }
  };

  // Resend OTP code
  const handleResend = async () => {
    if (!email || resending || cooldown > 0) return;
    setResending(true);
    setOtpError("");

    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email.trim(),
      });

      if (error) {
        const { error: otpError } = await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: {
            shouldCreateUser: false,
          },
        });

        if (otpError) throw otpError;
      }

      showToast("New 6-digit code sent! Check your inbox.");
      setCooldown(COOLDOWN_SECONDS);
      setOtp(Array(8).fill(""));
      inputRefs.current[0]?.focus();
    } catch (err) {
      console.error("Resend error:", err);
      showToast("Could not resend the code. Please try again.");
    } finally {
      setResending(false);
    }
  };

  const domain = email.split("@")[1]?.toLowerCase() || "";
  const inboxUrl = PROVIDER_MAP[domain] || null;
  const displayEmail = email || "your registered email";
  const filledCount = otp.filter((d) => d !== "").length;
  const isOtpComplete = filledCount === 8 || filledCount === 6;

  // Direct token_hash full-screen loader
  if (tokenHash && verifying) {
    return (
      <div className="lora-verify">
        <div className="shell">
          <div className="logo" style={{ display: "flex", justifyContent: "center" }}>
            <AppLogo to="/" height={52} />
          </div>
          <main className="card">
            <LoadingAnimation size="sm" className="mx-auto mb-3" />
            <h1>Verifying your account...</h1>
            <p className="lead">Please wait a moment while we activate your account.</p>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="lora-verify">
      <div className="shell">
        <div className="logo" style={{ display: "flex", justifyContent: "center" }}>
          <AppLogo to="/" height={52} />
        </div>

        <main className="card">
          {/* Animated Mail Icon with Green Check Badge */}
          <div className="mail" aria-hidden="true" style={verified ? { animation: "none" } : {}}>
            <svg className="ic" viewBox="0 0 24 24">
              <rect x="3" y="5" width="18" height="14" rx="3" />
              <path d="m4 8 8 6 8-6" />
            </svg>
            <b>
              <svg className="ic" viewBox="0 0 24 24">
                <path d="m5 12 5 5 9-10" />
              </svg>
            </b>
          </div>

          {verified ? (
            <>
              <h1>Email Verified!</h1>
              <p className="lead" style={{ marginTop: 12, marginBottom: 24 }}>
                Your account is active. Taking you to your dashboard...
              </p>
              <Link className="btn" to={role === "creator" ? "/creator/dashboard" : "/learner/dashboard"}>
                Go to Dashboard{" "}
                <svg className="ic" viewBox="0 0 24 24">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </Link>
            </>
          ) : (
            <>
              <h1>Enter Verification Code</h1>
              <p className="lead">We sent a verification code to:</p>

              <span className="em">
                <svg className="ic" viewBox="0 0 24 24">
                  <path d="M4 12a8 8 0 1 0 3-6.2M4 4v4h4" />
                </svg>
                <span id="addr">{displayEmail}</span>
              </span>

              <p className="sub">
                Enter the code from your email to activate your account.
              </p>

              {/* 8-Digit Numeric OTP Inputs */}
              <div className="otp-wrapper">
                <div className="otp-grid" onPaste={handlePaste}>
                  {[0, 1, 2, 3].map((idx) => (
                    <input
                      key={idx}
                      ref={(el) => (inputRefs.current[idx] = el)}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      autoComplete={idx === 0 ? "one-time-code" : "off"}
                      value={otp[idx]}
                      onChange={(e) => handleDigitChange(idx, e)}
                      onKeyDown={(e) => handleKeyDown(idx, e)}
                      className={`otp-box ${otp[idx] ? "filled" : ""} ${otpError ? "has-error" : ""}`}
                      aria-label={`Digit ${idx + 1}`}
                      disabled={verifying}
                    />
                  ))}

                  <div className="otp-divider" aria-hidden="true" />

                  {[4, 5, 6, 7].map((idx) => (
                    <input
                      key={idx}
                      ref={(el) => (inputRefs.current[idx] = el)}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      autoComplete="off"
                      value={otp[idx]}
                      onChange={(e) => handleDigitChange(idx, e)}
                      onKeyDown={(e) => handleKeyDown(idx, e)}
                      className={`otp-box ${otp[idx] ? "filled" : ""} ${otpError ? "has-error" : ""}`}
                      aria-label={`Digit ${idx + 1}`}
                      disabled={verifying}
                    />
                  ))}
                </div>

                {/* Error Banner */}
                {otpError && (
                  <div className="otp-error-msg" role="alert">
                    <svg className="ic" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span>{otpError}</span>
                  </div>
                )}
              </div>

              {/* Primary Action Button */}
              <button
                type="button"
                className="btn"
                onClick={() => verifyCode()}
                disabled={!isOtpComplete || verifying}
                style={{ opacity: !isOtpComplete && !verifying ? 0.65 : 1 }}
              >
                {verifying ? (
                  <>
                    <LoadingAnimation size="sm" className="inline-block mr-2" />
                    Verifying code...
                  </>
                ) : (
                  <>
                    Verify & Continue{" "}
                    <svg className="ic" viewBox="0 0 24 24">
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                  </>
                )}
              </button>

              {/* Direct Webmail Inbox Shortcut */}
              {inboxUrl && (
                <a
                  className="btn ghost"
                  id="openMail"
                  href={inboxUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open your inbox
                </a>
              )}

              {/* Resend Action with Cooldown Timer */}
              <div className="resend">
                <span>Didn't receive the code?</span>
                <button
                  id="resend"
                  type="button"
                  onClick={handleResend}
                  disabled={resending || cooldown > 0}
                  className={resending ? "spin" : ""}
                >
                  <svg className="ic" viewBox="0 0 24 24">
                    <path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5" />
                  </svg>
                  <span id="rl">
                    {resending
                      ? "Sending..."
                      : cooldown > 0
                      ? `Resend in ${cooldown}s`
                      : "Resend code"}
                  </span>
                </button>
              </div>

              {/* Wrong Email Link */}
              <Link to="/signup" className="change-email-btn">
                Entered the wrong email? Start over
              </Link>

              <p className="spam">
                Can't find the email? Check your <b>Spam</b> or <b>Promotions</b> folder.
              </p>
            </>
          )}
        </main>
      </div>

      {/* Toast Feedback */}
      <div className={`toast${toastMsg ? " show" : ""}`} role="status">
        {toastMsg}
      </div>
    </div>
  );
}
