import { useEffect, useRef } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Trophy, Rocket, Layers, Users, CheckCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import lorabotImg from '../assets/lorabot.png';
import './victory-modal.css';

const VICTORY_PRESETS = {
  account: {
    badge: '🎉 New Creator Victory',
    icon: Sparkles,
    title: 'Account Created Successfully!',
    subtitle: 'Welcome to LoraSpace! Your creator journey starts now. Direct bank payouts and 0% commission are waiting.',
    reaction: '“Let’s build your academy together!” — LoraBot 🚀',
    btnText: "Let's Get Started! 🚀",
  },
  session_pack: {
    badge: '🚀 Course Pack Published',
    icon: Rocket,
    title: 'Your Course Pack is Live!',
    subtitle: 'Congratulations! Your session pack is published and ready for students to discover and enroll.',
    reaction: '“Boom! Your knowledge is now out in the world!” 🌟',
    btnText: 'View My Course Packs 📦',
  },
  multi_pack: {
    badge: '🎓 Academy Showcase Live',
    icon: Trophy,
    title: 'Main Multi-Pack Created!',
    subtitle: 'Your course showcase is published! Now you can attach monthly sub-packs and sequential batches.',
    reaction: '“Big league moves! Your Multi-Pack Hub is open!” 🏆',
    btnText: 'Manage Multi-Pack Hub 🌟',
  },
  sub_pack: {
    badge: '📦 Sub-Pack Added',
    icon: Layers,
    title: 'New Sub-Pack Launched!',
    subtitle: 'Your new batch/monthly module has been added to your Multi-Pack course showcase.',
    reaction: '“Another great milestone! Students are going to love this!” 💎',
    btnText: 'Awesome, Continue! 🚀',
  },
  customer: {
    badge: '💰 Customer Victory',
    icon: Users,
    title: 'New Student Enrolled!',
    subtitle: 'Payment verified and confirmed! You just secured a new paying student.',
    reaction: '“Real student, real victory! Keep growing your academy!” 🥳',
    btnText: 'View Enrollments 🎓',
  },
  custom: {
    badge: '🏆 Victory Achieved',
    icon: Trophy,
    title: 'Congratulations!',
    subtitle: 'You successfully achieved a major milestone on LoraSpace.',
    reaction: '“Fantastic job! Another win in the books!” 🚀',
    btnText: 'Continue 🚀',
  },
};

export default function VictoryModal({
  isOpen,
  type = 'custom',
  title,
  subtitle,
  badge,
  reaction,
  btnText,
  duration = 3500, // 3.5 seconds
  onClose,
}) {
  const timerRef = useRef(null);

  // Shoot confetti bursts from bottom-left and bottom-right corners
  useEffect(() => {
    if (!isOpen) return;

    const fireCornerConfetti = () => {
      // Bottom-left corner cannon shooting upwards and rightwards
      confetti({
        particleCount: 50,
        angle: 60,
        spread: 65,
        origin: { x: 0, y: 0.95 },
        colors: ['#7657FF', '#398BFF', '#A78BFA', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#FBBF24'],
        ticks: 240,
        gravity: 0.9,
        scalar: 1.15,
        shapes: ['square', 'circle'],
        zIndex: 1000000,
      });

      // Bottom-right corner cannon shooting upwards and leftwards
      confetti({
        particleCount: 50,
        angle: 120,
        spread: 65,
        origin: { x: 1, y: 0.95 },
        colors: ['#7657FF', '#398BFF', '#A78BFA', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#FBBF24'],
        ticks: 240,
        gravity: 0.9,
        scalar: 1.15,
        shapes: ['square', 'circle'],
        zIndex: 1000000,
      });
    };

    // Initial blast
    fireCornerConfetti();

    // Rhythmic celebration cannon blasts
    const burst1 = setTimeout(fireCornerConfetti, 400);
    const burst2 = setTimeout(fireCornerConfetti, 1100);
    const burst3 = setTimeout(fireCornerConfetti, 1900);
    const burst4 = setTimeout(fireCornerConfetti, 2700);

    // Auto-dismiss after duration if not closed manually
    if (duration > 0) {
      timerRef.current = setTimeout(() => {
        if (onClose) onClose();
      }, duration);
    }

    return () => {
      clearTimeout(burst1);
      clearTimeout(burst2);
      clearTimeout(burst3);
      clearTimeout(burst4);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isOpen, duration, onClose]);

  const preset = VICTORY_PRESETS[type] || VICTORY_PRESETS.custom;
  const activeBadge = badge || preset.badge;
  const activeTitle = title || preset.title;
  const activeSub = subtitle || preset.subtitle;
  const activeReaction = reaction || preset.reaction;
  const activeBtnText = btnText || preset.btnText;
  const BadgeIcon = preset.icon || Sparkles;

  const handleClose = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (onClose) onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="lora-victory-backdrop" onClick={handleClose}>
          <Motion.div
            className="lora-victory-card"
            onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.7, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.85, opacity: 0, y: 30 }}
            transition={{
              type: 'spring',
              stiffness: 380,
              damping: 24,
            }}
          >
            {/* Top Right Cross (Close) Button */}
            <button
              type="button"
              className="lora-victory-close-btn"
              onClick={handleClose}
              aria-label="Close celebration"
            >
              <X size={18} />
            </button>

            {/* Mascot Center Stage with Cheers Animation */}
            <Motion.div
              className="lora-victory-mascot-wrap"
              initial={{ scale: 0, y: 30, rotate: -15 }}
              animate={{
                scale: [0, 1.15, 1],
                y: [30, -10, 0],
                rotate: [-15, 6, -4, 2, 0],
              }}
              transition={{
                duration: 0.65,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              {/* Radial Ambient Energy Pulse */}
              <div className="lora-victory-bot-glow" />

              {/* Floating Party Sparkles */}
              <span className="lora-victory-sparkle s-left">✨</span>
              <span className="lora-victory-sparkle s-right">🎉</span>
              <span className="lora-victory-sparkle s-top">🚀</span>

              {/* Lorabot Cheering Bot Image */}
              <Motion.img
                src={lorabotImg}
                alt="LoraBot Cheers"
                className="lora-victory-bot-img"
                animate={{
                  y: [0, -12, 0, -6, 0],
                  rotate: [0, 4, -4, 2, 0],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 2.2,
                  ease: 'easeInOut',
                }}
              />
            </Motion.div>

            {/* Victory Badge */}
            <div className="lora-victory-badge">
              <BadgeIcon size={14} />
              <span>{activeBadge}</span>
            </div>

            {/* Victory Title */}
            <h2 className="lora-victory-title">{activeTitle}</h2>

            {/* Victory Subtitle */}
            <p className="lora-victory-sub">{activeSub}</p>

            {/* Mascot cheering quote */}
            {activeReaction && (
              <div className="lora-victory-reaction">
                {activeReaction}
              </div>
            )}

            {/* Action Button */}
            <button
              type="button"
              className="lora-victory-btn"
              onClick={handleClose}
            >
              <span>{activeBtnText}</span>
            </button>

            {/* 3-Second Countdown Progress Bar */}
            {duration > 0 && (
              <div className="lora-victory-progress-track">
                <Motion.div
                  className="lora-victory-progress-bar"
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: duration / 1000, ease: 'linear' }}
                />
              </div>
            )}
          </Motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
