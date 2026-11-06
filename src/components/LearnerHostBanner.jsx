import { useEffect, useRef, useState, useCallback } from 'react';
import './learner-host-banner.css';

export default function LearnerHostBanner({ profile, enrollmentsCount = 0 }) {
  const learnerName = profile?.first_name || 'there';
  const [speechText, setSpeechText] = useState(`Hi ${learnerName}! 👋`);
  const [bubbleVisible, setBubbleVisible] = useState(true);
  const [isIdle, setIsIdle] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const keyColorRef = useRef([255, 0, 255]); // Magenta #FF00FF
  const calibratedRef = useRef(false);
  const animFrameIdRef = useRef(null);
  const idleTimerRef = useRef(null);
  const bubbleTimerRef = useRef(null);

  // Update speech text when profile name loads
  useEffect(() => {
    if (profile?.first_name) {
      setSpeechText(`Hi ${profile.first_name}! 👋`);
      setBubbleVisible(true);
    }
  }, [profile?.first_name]);

  // Auto-hide bubble after initial greeting, reappears on wave
  useEffect(() => {
    bubbleTimerRef.current = setTimeout(() => {
      setBubbleVisible(false);
    }, 5500);
    return () => clearTimeout(bubbleTimerRef.current);
  }, []);

  // Frame processing loop with real-time chroma keying & despill
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

          // Calibrate background key from corner pixel on first clear frame
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

            // 1. Strict protection for white blouse / clothing
            if (r > 175 && g > 175 && b > 175 && Math.abs(r - g) < 45 && Math.abs(b - g) < 45) {
              continue;
            }

            // 2. Strict protection for green skirt
            if (g > 85 && g > r + 15 && g > b + 15) {
              continue;
            }

            // 3. Distance from Magenta key
            const dR = r - keyR;
            const dG = g - keyG;
            const dB = b - keyB;
            const dist = Math.sqrt(dR * dR + dG * dG + dB * dB);

            if (dist < 112) {
              // Background: 100% transparent
              data[i + 3] = 0;
            } else if (dist < 152) {
              // Smooth edge transition
              const factor = (dist - 112) * 0.025; // / 40
              const smooth = factor * factor * (3 - 2 * factor);
              data[i + 3] = Math.round(smooth * data[i + 3]);

              // Despill magenta fringe on edge pixels
              if (r > g && b > g) {
                data[i] = Math.min(r, Math.max(g, r - 45));
                data[i + 2] = Math.min(b, Math.max(g, b - 45));
              }
            } else if (dist < 178) {
              // Subtle edge cleanup
              if (r > g + 40 && b > g + 40) {
                data[i] = Math.min(r, g + 35);
                data[i + 2] = Math.min(b, g + 35);
              }
            }
          }

          ctx.putImageData(frame, 0, 0);
        } catch {
          // Fail silently without breaking page
        }
      }
    }

    if (document.visibilityState !== 'hidden') {
      if ('requestVideoFrameCallback' in video) {
        animFrameIdRef.current = video.requestVideoFrameCallback(renderFrame);
      } else {
        animFrameIdRef.current = requestAnimationFrame(renderFrame);
      }
    }
  }, []);

  // Play wave animation safely (always muted)
  const playWave = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = 0;
    video.muted = true;
    setIsIdle(false);

    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          renderFrame();
        })
        .catch(() => {});
    }
  }, [renderFrame]);

  // Video loop & lifecycle
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Permanent muted guarantee
    video.muted = true;
    video.volume = 0;

    const onCanPlay = () => {
      playWave();
    };

    const onEnded = () => {
      // Natural resting state
      setIsIdle(true);

      // Repeated lifelike action: wait 7 seconds naturally, then wave again
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        playWave();
      }, 7000);
    };

    video.addEventListener('canplay', onCanPlay);
    video.addEventListener('ended', onEnded);

    // Pause when tab is hidden, resume when visible
    const onVisibility = () => {
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
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      video.removeEventListener('canplay', onCanPlay);
      video.removeEventListener('ended', onEnded);
      document.removeEventListener('visibilitychange', onVisibility);
      clearTimeout(idleTimerRef.current);
      clearTimeout(bubbleTimerRef.current);
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [playWave, renderFrame]);

  // User click on the girl: wave and show bubble
  const handleGirlClick = () => {
    clearTimeout(idleTimerRef.current);
    clearTimeout(bubbleTimerRef.current);
    setBubbleVisible(true);
    playWave();

    bubbleTimerRef.current = setTimeout(() => {
      setBubbleVisible(false);
    }, 4500);
  };

  return (
    <div className="lora-hero-host">
      {/* Left Side: Welcome Text (Clean, Unboxed) */}
      <div className="lora-hero-text">
        <h1 className="lora-hero-greeting">
          Welcome back, {learnerName}!
        </h1>
        <p className="lora-hero-subtext">
          Pick up where you left off, or find your next course.
        </p>

        {enrollmentsCount > 0 && (
          <div className="lora-hero-stat-pill">
            <span className="lora-hero-stat-dot" />
            <span>{enrollmentsCount} active course{enrollmentsCount > 1 ? 's' : ''} in progress</span>
          </div>
        )}
      </div>

      {/* Right Side: Big, Free-Standing Animated Girl (No Box, Completely Transparent) */}
      <div
        className="lora-hero-character-stage"
        onClick={handleGirlClick}
        role="button"
        tabIndex={0}
        aria-label="Interactive learning guide"
        title="Click to say hi!"
      >
        {/* Floating Speech Bubble */}
        <div
          className="lora-hero-bubble"
          style={{
            opacity: bubbleVisible ? 1 : 0,
            transform: bubbleVisible ? 'translateY(0)' : 'translateY(6px)',
          }}
          role="status"
          aria-live="polite"
        >
          {speechText}
        </div>

        {/* Big Grounded Character Canvas + Realistic Floor Shadow */}
        <div className={`lora-hero-character-wrap ${isIdle ? 'is-idle' : ''}`}>
          <canvas
            ref={canvasRef}
            className="lora-hero-canvas"
            width={360}
            height={640}
          />
          <div className="lora-hero-floor-shadow" />
        </div>

        {/* Hidden Video Feed (Muted Forever) */}
        <video
          ref={videoRef}
          className="lora-hero-hidden-video"
          src="/greetin.mp4"
          playsInline
          muted
          autoPlay
          preload="auto"
          crossOrigin="anonymous"
        />
      </div>
    </div>
  );
}
