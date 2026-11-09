import { useEffect, useState, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion as Motion, useReducedMotion } from 'framer-motion';
import ThemeSwitcher from './ThemeSwitcher';
import './learner-host-banner.css';

function getTimeGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return { label: 'Good morning', icon: '☀️' };
  if (hour < 18) return { label: 'Good afternoon', icon: '🌤️' };
  return { label: 'Good evening', icon: '🌙' };
}

export default function LearnerHostBanner({
  profile,
  enrollmentsCount = 0,
  enrollments = [],
}) {
  const prefersReducedMotion = useReducedMotion();
  const firstName = profile?.first_name?.trim() || '';
  const timeGreeting = useMemo(() => getTimeGreeting(), []);

  const confirmedCount = useMemo(
    () => enrollments.filter((e) => e.status === 'confirmed').length,
    [enrollments]
  );

  const messages = useMemo(
    () => [
      firstName ? `Hi ${firstName}! 👋` : 'Hi, welcome back! 👋',
      "You've got this today! ✨",
      'Ready to learn something new? 🎓',
      'Keep up the great momentum! 🚀',
    ],
    [firstName]
  );

  const [msgIndex, setMsgIndex] = useState(0);
  const [bubbleVisible, setBubbleVisible] = useState(true);
  const [isWavingBurst, setIsWavingBurst] = useState(false);

  const burstTimeoutRef = useRef(null);
  const bubbleTimeoutRef = useRef(null);
  const periodicWaveRef = useRef(null);

  const triggerWaveGreeting = (advanceMessage = false) => {
    if (advanceMessage) {
      setMsgIndex((prev) => (prev + 1) % messages.length);
    }
    setBubbleVisible(true);

    if (!prefersReducedMotion) {
      setIsWavingBurst(false);
      // Allow state reset before triggering fresh wave burst
      requestAnimationFrame(() => {
        setIsWavingBurst(true);
      });
      clearTimeout(burstTimeoutRef.current);
      burstTimeoutRef.current = setTimeout(() => {
        setIsWavingBurst(false);
      }, 1250);
    }

    clearTimeout(bubbleTimeoutRef.current);
    bubbleTimeoutRef.current = setTimeout(() => {
      setBubbleVisible(false);
    }, 5200);
  };

  // Initial friendly wave burst & periodic lifelike wave every 9 seconds
  useEffect(() => {
    const initialTimer = setTimeout(() => {
      triggerWaveGreeting(false);
    }, 450);

    periodicWaveRef.current = setInterval(() => {
      if (document.visibilityState === 'visible') {
        triggerWaveGreeting(false);
      }
    }, 9500);

    return () => {
      clearTimeout(initialTimer);
      clearTimeout(burstTimeoutRef.current);
      clearTimeout(bubbleTimeoutRef.current);
      clearInterval(periodicWaveRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefersReducedMotion]);

  // Keep first greeting synced once profile name resolves
  useEffect(() => {
    if (firstName && msgIndex === 0) {
      setBubbleVisible(true);
    }
  }, [firstName, msgIndex]);

  const scrollToEnrolled = () => {
    const el = document.getElementById('my-enrolled-packs');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const subtitleText =
    confirmedCount > 0
      ? 'Pick up right where you left off, keep your streak alive, or explore a new skill today.'
      : enrollmentsCount > 0
      ? 'Your enrollment is on the way — browse more expert-led sessions while you wait.'
      : 'Pick up where you left off, or discover your next expert-led course today.';

  return (
    <section className="lora-mascot-hero" aria-label="Welcome banner">
      {/* Left Column: Greeting, Context & Actions */}
      <Motion.div
        className="lora-mascot-hero__content"
        initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="lora-mascot-hero__eyebrow">
          <span className="lora-mascot-hero__eyebrow-dot" aria-hidden="true" />
          <span>
            {timeGreeting.icon} {timeGreeting.label}
          </span>
        </div>

        <h1 className="lora-mascot-hero__title">
          Welcome back{firstName ? ',' : '!'}{' '}
          {firstName && (
            <span className="lora-mascot-hero__name">{firstName}!</span>
          )}
        </h1>

        <p className="lora-mascot-hero__subtitle">{subtitleText}</p>

        <div className="lora-mascot-hero__actions">
          <Link to="/learner/discover" className="lora-mascot-hero__btn-primary">
            <span>Explore courses</span>
            <svg
              className="lora-mascot-hero__btn-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M5 12h14" />
              <path d="m13 6 6 6-6 6" />
            </svg>
          </Link>

          <ThemeSwitcher variant="pill" />

          {enrollmentsCount > 0 && (
            <button
              type="button"
              onClick={scrollToEnrolled}
              className="lora-mascot-hero__stat-chip"
            >
              <span className="lora-mascot-hero__stat-count">
                {enrollmentsCount}
              </span>
              <span>
                enrolled {enrollmentsCount === 1 ? 'pack' : 'packs'}
              </span>
            </button>
          )}
        </div>
      </Motion.div>

      {/* Right Column: Big, Unboxed Animated Mascot Illustration */}
      <Motion.div
        className="lora-mascot-hero__stage"
        initial={prefersReducedMotion ? false : { opacity: 0, y: 20, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{
          type: 'spring',
          stiffness: 210,
          damping: 20,
          delay: 0.08,
        }}
        onClick={() => triggerWaveGreeting(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            triggerWaveGreeting(true);
          }
        }}
        role="button"
        tabIndex={0}
        aria-label="Say hi to your learning companion"
        title="Tap to say hi!"
      >
        {/* Soft Unboxed Ambient Glow Behind Character */}
        <div className="lora-mascot-hero__aura" aria-hidden="true" />

        {/* Subtle Twinkling Sparkles */}
        {!prefersReducedMotion && (
          <>
            <svg
              className="lora-mascot-hero__sparkle lora-mascot-hero__sparkle--gold"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M12 1.5c.7 5.2 4.3 8.8 9.5 9.5-5.2.7-8.8 4.3-9.5 9.5-.7-5.2-4.3-8.8-9.5-9.5 5.2-.7 8.8-4.3 9.5-9.5z" />
            </svg>
            <svg
              className="lora-mascot-hero__sparkle lora-mascot-hero__sparkle--blue"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M12 2c.6 4.8 4.2 8.4 9 9-4.8.6-8.4 4.2-9 9-.6-4.8-4.2-8.4-9-9 4.8-.6 8.4-4.2 9-9z" />
            </svg>
            <svg
              className="lora-mascot-hero__sparkle lora-mascot-hero__sparkle--green"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M12 3c.5 4.2 3.8 7.5 8 8-4.2.5-7.5 3.8-8 8-.5-4.2-3.8-7.5-8-8 4.2-.5 7.5-3.8 8-8z" />
            </svg>
          </>
        )}

        {/* Speech Bubble */}
        <div
          className={`lora-mascot-hero__bubble ${
            bubbleVisible ? 'is-visible' : ''
          }`}
          role="status"
          aria-live="polite"
        >
          {messages[msgIndex]}
        </div>

        {/* Character Image with Grounded Idle + Happy Wave Animation */}
        <div
          className={`lora-mascot-hero__figure ${
            !prefersReducedMotion ? 'is-animated' : ''
          } ${isWavingBurst ? 'is-waving-burst' : ''}`}
        >
          <img
            src="/mascot-waving.png"
            srcSet="/mascot-waving-sm.png 420w, /mascot-waving.png 680w"
            sizes="(max-width: 680px) 190px, 320px"
            alt="Lora learning mascot waving hello"
            className="lora-mascot-hero__img"
            width="680"
            height="1020"
            decoding="async"
            fetchPriority="high"
            draggable={false}
          />
        </div>

        {/* Synchronized Floor Contact Shadow */}
        <div
          className={`lora-mascot-hero__shadow ${
            !prefersReducedMotion ? 'is-animated' : ''
          }`}
          aria-hidden="true"
        />
      </Motion.div>
    </section>
  );
}
