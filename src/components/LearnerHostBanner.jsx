import { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import './learner-host-banner.css';

const DEFAULT_MESSAGES = [
  'Ready to learn something new today? 🚀',
  "You're doing great! Keep the momentum! ✨",
  'Pick up right where you left off below 📚',
  "Need anything? I'm your learning host! 💡",
  'Consistency is the key to mastery! 🌟',
];

export default function LearnerHostBanner({ profile, enrollmentsCount = 0 }) {
  const learnerName = profile?.first_name || 'Learner';
  const initialGreeting = `Hi ${learnerName}! Welcome back 👋`;

  const [speechText, setSpeechText] = useState(initialGreeting);
  const [bubbleVisible, setBubbleVisible] = useState(true);
  const [isMuted, setIsMuted] = useState(() => {
    try {
      return localStorage.getItem('mascot_sound_enabled') !== 'true';
    } catch {
      return true;
    }
  });
  const [isIdleBreathing, setIsIdleBreathing] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const keyColorRef = useRef([255, 0, 255]); // Magenta
  const calibratedRef = useRef(false);
  const animFrameIdRef = useRef(null);
  const idleTimerRef = useRef(null);
  const bubbleTimerRef = useRef(null);
  const msgIndexRef = useRef(0);

  // Auto-hide initial bubble after 6 seconds, but keep accessible
  useEffect(() => {
    bubbleTimerRef.current = setTimeout(() => {
      setBubbleVisible(false);
    }, 6000);
    return () => clearTimeout(bubbleTimerRef.current);
  }, []);

  // Update speech text when profile loads
  useEffect(() => {
    if (profile?.first_name) {
      setSpeechText(`Hi ${profile.first_name}! Welcome back 👋`);
      setBubbleVisible(true);
    }
  }, [profile?.first_name]);

  // Video Frame Rendering Loop with Real-time Chroma Key & Despill
  const renderFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    if (video.readyState >= 2 && !video.paused && !video.ended) {
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        const w = canvas.width;
        const h = canvas.height;

        try {
          ctx.drawImage(video, 0, 0, w, h);

          // Calibrate background key color from top-left corner on first clear frame
          if (!calibratedRef.current) {
            const sample = ctx.getImageData(4, 4, 1, 1).data;
            if (sample[0] > 140 && sample[2] > 140 && sample[1] < 120) {
              keyColorRef.current = [sample[0], sample[1], sample[2]];
              calibratedRef.current = true;
            }
          }

          const frame = ctx.getImageData(0, 0, w, h);
          const data = frame.data;
          const len = data.length;
          const [keyR, keyG, keyB] = keyColorRef.current;

          for (let i = 0; i < len; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            // 1. Protect white blouse / clothing (high RGB with low variance)
            if (r > 175 && g > 175 && b > 175 && Math.abs(r - g) < 45 && Math.abs(b - g) < 45) {
              continue;
            }

            // 2. Protect green skirt (green channel dominant)
            if (g > 85 && g > r + 15 && g > b + 15) {
              continue;
            }

            // 3. Chroma distance from Magenta
            const dR = r - keyR;
            const dG = g - keyG;
            const dB = b - keyB;
            const dist = Math.sqrt(dR * dR + dG * dG + dB * dB);

            if (dist < 112) {
              // Background pixel: make 100% transparent
              data[i + 3] = 0;
            } else if (dist < 152) {
              // Edge smoothing (smoothstep alpha transition)
              const factor = (dist - 112) / 40;
              const smooth = factor * factor * (3 - 2 * factor);
              data[i + 3] = Math.round(smooth * data[i + 3]);

              // Edge despill: suppress magenta fringe
              if (r > g && b > g) {
                data[i] = Math.min(r, Math.max(g, r - 45));
                data[i + 2] = Math.min(b, Math.max(g, b - 45));
              }
            } else if (dist < 178) {
              // Subtle fringe despill for boundary pixels
              if (r > g + 40 && b > g + 40) {
                data[i] = Math.min(r, g + 35);
                data[i + 2] = Math.min(b, g + 35);
              }
            }
          }

          ctx.putImageData(frame, 0, 0);
        } catch {
          // Silent fallback on any canvas read issues
        }
      }
    }

    // Schedule next frame if page is visible
    if (document.visibilityState !== 'hidden') {
      if ('requestVideoFrameCallback' in video) {
        animFrameIdRef.current = video.requestVideoFrameCallback(renderFrame);
      } else {
        animFrameIdRef.current = requestAnimationFrame(renderFrame);
      }
    }
  }, []);

  // Play video with safe fallback
  const startPlayback = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = 0;
    setIsIdleBreathing(false);

    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          renderFrame();
        })
        .catch(() => {
          // Autoplay policy prevented playback or low power mode
        });
    }
  }, [renderFrame]);

  // Initial video setup & autoplay
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onCanPlay = () => {
      setVideoLoaded(true);
      startPlayback();
    };

    const onEnded = () => {
      // Enter gentle idle breathing state
      setIsIdleBreathing(true);

      // Repeat action realistically after an idle pause (8 seconds)
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        startPlayback();
      }, 8000);
    };

    video.addEventListener('canplay', onCanPlay);
    video.addEventListener('ended', onEnded);

    // Visibility change handling to save CPU / battery
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        video.pause();
        if (animFrameIdRef.current) {
          cancelAnimationFrame(animFrameIdRef.current);
        }
      } else {
        video.play().catch(() => {});
        renderFrame();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      video.removeEventListener('canplay', onCanPlay);
      video.removeEventListener('ended', onEnded);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      clearTimeout(idleTimerRef.current);
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [startPlayback, renderFrame]);

  // Sound toggle handler
  const handleToggleSound = (e) => {
    e.stopPropagation();
    const nextState = !isMuted;
    setIsMuted(nextState);

    try {
      localStorage.setItem('mascot_sound_enabled', String(!nextState));
    } catch {}

    const video = videoRef.current;
    if (video) {
      video.muted = nextState;
      // Replay so user immediately hears the audio
      video.currentTime = 0;
      video.play().catch(() => {});
    }
  };

  // User click on stage: replay greeting and show encouraging message
  const handleStageClick = () => {
    clearTimeout(idleTimerRef.current);
    clearTimeout(bubbleTimerRef.current);

    const nextMsg = DEFAULT_MESSAGES[msgIndexRef.current % DEFAULT_MESSAGES.length];
    msgIndexRef.current += 1;
    setSpeechText(nextMsg);
    setBubbleVisible(true);

    startPlayback();

    bubbleTimerRef.current = setTimeout(() => {
      setBubbleVisible(false);
    }, 4500);
  };

  return (
    <div className="lora-host-banner">
      {/* Left: Personalized Greeting & Overview */}
      <div className="lora-host-content">
        <div className="lora-host-badge">
          <span className="lora-host-badge-dot" />
          Personal Learning Host
        </div>

        <h1 className="lora-host-title">
          Welcome back, {learnerName}!
        </h1>

        <p className="lora-host-subtitle">
          {enrollmentsCount > 0
            ? `You have ${enrollmentsCount} active course${enrollmentsCount > 1 ? 's' : ''} in progress. Pick up where you left off, or find your next lesson below.`
            : 'Explore expert-led courses and start learning today. Your personal learning path is ready!'}
        </p>

        <div className="lora-host-actions">
          <Link to="/learner/discover" className="lora-host-btn-primary">
            Explore courses
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>

          <button
            type="button"
            className={`lora-host-btn-sound ${!isMuted ? 'active' : ''}`}
            onClick={handleToggleSound}
            title={isMuted ? 'Turn character voice on' : 'Mute character voice'}
          >
            <span>{isMuted ? '🔇 Voice: Off' : '🔊 Voice: On'}</span>
          </button>

          <button
            type="button"
            className="lora-host-btn-sound"
            onClick={handleStageClick}
            title="Ask host to wave"
          >
            <span>👋 Wave</span>
          </button>
        </div>
      </div>

      {/* Right: Lifelike Host Stage with Grounded Contact Shadow */}
      <div
        className="lora-host-stage"
        onClick={handleStageClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleStageClick();
          }
        }}
        aria-label="Interact with your animated learning host"
      >
        {/* Floating Speech Bubble */}
        <div
          className="lora-host-speech-bubble"
          style={{
            opacity: bubbleVisible ? 1 : 0,
            transform: bubbleVisible ? 'translateY(0)' : 'translateY(6px)',
            pointerEvents: 'none',
          }}
          role="status"
          aria-live="polite"
        >
          {speechText}
        </div>

        {/* Character with Contact Shadow */}
        <div className={`lora-host-character-wrap ${isIdleBreathing ? 'idle-breathing' : ''}`}>
          <canvas
            ref={canvasRef}
            className="lora-host-canvas"
            width={270}
            height={480}
            style={{ opacity: videoLoaded ? 1 : 0.95 }}
          />
          <div className="lora-host-contact-shadow" />
        </div>

        {/* Hidden source video feeding the canvas */}
        <video
          ref={videoRef}
          className="lora-host-video-feed"
          src="/greetin.mp4"
          playsInline
          muted={isMuted}
          preload="auto"
          crossOrigin="anonymous"
        />

        <div className="lora-host-tap-hint">
          <span>✨ Click character to interact</span>
        </div>
      </div>
    </div>
  );
}
