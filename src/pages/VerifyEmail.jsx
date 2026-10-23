import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import AppLogo from "../components/AppLogo";
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

  // If user clicks a direct custom-domain link: /verify-email?token_hash=...&type=signup
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") || "signup";

  // Real email address from navigation state, query params, or localStorage
  const emailParam = searchParams.get("email");
  const stateEmail = location.state?.email;
  const storedEmail = typeof window !== "undefined" ? localStorage.getItem("pending_verify_email") : "";
  const email = stateEmail || emailParam || storedEmail || "";

  // Save pending verify email so refresh preserves it
  useEffect(() => {
    if (stateEmail || emailParam) {
      localStorage.setItem("pending_verify_email", stateEmail || emailParam);
    }
  }, [stateEmail, emailParam]);

  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [toastMsg, setToastMsg] = useState("");

  // Direct verification states
  const [verifying, setVerifying] = useState(!!tokenHash);
  const [verified, setVerified] = useState(false);
  const [verifyError, setVerifyError] = useState("");

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 2600);
  };

  useEffect(() => {
    if (!tokenHash) return;

    const verifyToken = async () => {
      setVerifying(true);
      setVerifyError("");
      try {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type,
        });

        if (error) throw error;
        setVerified(true);
        setTimeout(() => {
          navigate("/login", { state: { verified: true } });
        }, 2200);
      } catch (err) {
        console.error("Verification error:", err);
        setVerifyError(err.message || "Invalid or expired verification link. Please log in or request a new one.");
      } finally {
        setVerifying(false);
      }
    };

    verifyToken();
  }, [tokenHash, type, navigate]);

  // Count down the cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleResend = async () => {
    if (!email || resending || cooldown > 0) return;
    setResending(true);

    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });

      if (error) {
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

      showToast("Verification email sent. Check your inbox.");
      setCooldown(COOLDOWN_SECONDS);
    } catch (err) {
      console.error("Resend error:", err);
      showToast("Could not send the email. Please try again.");
    } finally {
      setResending(false);
    }
  };

  const domain = email.split("@")[1]?.toLowerCase() || "";
  const inboxUrl = PROVIDER_MAP[domain] || null;
  const displayEmail = email || "your registered email";

  // Direct verification screen if token_hash is in URL
  if (tokenHash) {
    return (
      <div className="lora-verify">
        <div className="shell">
          <div className="logo" style={{ display: 'flex', justifyContent: 'center' }}>
            <AppLogo to="/" height={52} />
          </div>

          <main className="card">
            {verifying && (
              <>
                <div className="direct-spin" aria-hidden="true" />
                <h1>Verifying your email...</h1>
                <p className="lead">Please wait a moment while we activate your account.</p>
              </>
            )}

            {verified && (
              <>
                <div className="mail" aria-hidden="true" style={{ animation: "none" }}>
                  <svg className="ic" viewBox="0 0 24 24">
                    <rect x="3" y="5" width="18" height="14" rx="3" />
                    <path d="m4 8 8 6 8-6" />
                  </svg>
                  <b style={{ width: 38, height: 38 }}>
                    <svg className="ic" viewBox="0 0 24 24" style={{ width: 20, height: 20 }}>
                      <path d="m5 12 5 5 9-10" />
                    </svg>
                  </b>
                </div>
                <h1>Email Verified!</h1>
                <p className="lead">Your account is active. Redirecting you to login...</p>
                <Link className="btn" to="/login">
                  Go to login{" "}
                  <svg className="ic" viewBox="0 0 24 24">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </Link>
              </>
            )}

            {verifyError && (
              <>
                <div className="mail" aria-hidden="true" style={{ animation: "none", color: "var(--bad)" }}>
                  <svg className="ic" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                <h1>Verification Failed</h1>
                <p className="sub" style={{ color: "var(--bad)", marginTop: 12, marginBottom: 20 }}>
                  {verifyError}
                </p>
                <Link className="btn" to="/login">
                  Return to Login{" "}
                  <svg className="ic" viewBox="0 0 24 24">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </Link>
              </>
            )}
          </main>
        </div>
      </div>
    );
  }

  // Standard "Check your inbox" screen
  return (
    <div className="lora-verify">
      <div className="shell">
        <div className="logo" style={{ display: 'flex', justifyContent: 'center' }}>
          <AppLogo to="/" height={52} />
        </div>

        <main className="card">
          {/* Animated Mail Icon with Green Check Badge */}
          <div className="mail" aria-hidden="true">
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

          <h1>Check your inbox!</h1>
          <p className="lead">We sent a verification email to:</p>

          <span className="em">
            <svg className="ic" viewBox="0 0 24 24">
              <path d="M4 12a8 8 0 1 0 3-6.2M4 4v4h4" />
            </svg>
            <span id="addr">{displayEmail}</span>
          </span>

          <p className="sub">
            Click the <b>"Verify Email"</b> button in the email to activate your account. Then come back and log in to get started.
          </p>

          {/* Steps */}
          <div className="steps">
            <h2>What to do next</h2>
            <ol>
              <li><span>Open the email from Lora in your inbox (check Spam too)</span></li>
              <li><span>Click the "Verify Email" button inside the email</span></li>
              <li><span>You will be taken to the login page. Sign in to get started!</span></li>
            </ol>
          </div>

          {/* Primary CTA */}
          <Link className="btn" to="/login">
            Go to login{" "}
            <svg className="ic" viewBox="0 0 24 24">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>

          {/* Optional Direct Inbox Provider CTA */}
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

          {/* Resend Button with Cooldown Timer */}
          <div className="resend">
            <span>Didn't receive it?</span>
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
                  : "Resend email"}
              </span>
            </button>
          </div>

          <p className="spam">
            Also check your <b>Spam</b> or <b>Junk</b> folder if you do not see it.
          </p>
        </main>
      </div>

      {/* Toast Feedback */}
      <div className={`toast${toastMsg ? " show" : ""}`} role="status">
        {toastMsg}
      </div>
    </div>
  );
}
