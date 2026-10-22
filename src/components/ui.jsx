import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';

/* ============================================================
   PAGE TRANSITION WRAPPER
   ============================================================ */
export function PageTransition({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}

/* ============================================================
   LOADING SPINNER
   ============================================================ */
export function LoadingSpinner({ size = 'md', className = '' }) {
  const sizes = { sm: 'w-5 h-5', md: 'w-8 h-8', lg: 'w-12 h-12' };
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <Loader2 className={`${sizes[size]} text-[#2563EB] animate-spin`} />
    </div>
  );
}

/* ============================================================
   FULL PAGE LOADER
   ============================================================ */
export function FullPageLoader() {
  return (
    <div className="fixed inset-0 bg-[#F8FAFC] flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-6"
      >
        <motion.h1
          className="text-4xl font-bold text-[#2563EB]"
          style={{ fontFamily: 'var(--font-heading)' }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          Lora
        </motion.h1>
        <div className="spinner-lg spinner" />
      </motion.div>
    </div>
  );
}

/* ============================================================
   GOLD BADGE
   ============================================================ */
export function GoldBadge({ children, icon: Icon, className = '' }) {
  return (
    <span className={`badge badge-gold ${className}`}>
      {Icon && <Icon size={12} />}
      {children}
    </span>
  );
}

/* ============================================================
   STATUS BADGE
   ============================================================ */
export function StatusBadge({ status }) {
  const config = {
    pending: { className: 'badge-pending', label: 'Pending' },
    confirmed: { className: 'badge-success', label: 'Confirmed' },
    rejected: { className: 'badge-error', label: 'Rejected' },
    published: { className: 'badge-success', label: 'Published' },
    draft: { className: 'badge-pending', label: 'Draft' },
  };
  const c = config[status] || config.pending;
  return <span className={`badge ${c.className}`}>{c.label}</span>;
}

/* ============================================================
   STAT CARD
   ============================================================ */
export function StatCard({ icon: Icon, label, value, accent = false }) {
  return (
    <motion.div
      className="stat-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-center gap-3 mb-4">
        {Icon && (
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${accent ? 'bg-[#DBEAFE]' : 'bg-[#F8FAFC]'}`}>
            <Icon size={20} className={accent ? 'text-[#2563EB]' : 'text-[#94A6B8]'} />
          </div>
        )}
      </div>
      <p className="text-4xl font-bold text-[#0F172A] mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
        {value}
      </p>
      <span className="text-sm text-[#94A6B8]">{label}</span>
    </motion.div>
  );
}

/* ============================================================
   MODAL
   ============================================================ */
export function Modal({ isOpen, onClose, title, children }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="modal-content"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.25 }}
            onClick={(e) => e.stopPropagation()}
          >
            {title && (
              <h3 className="text-xl font-bold text-[#0F172A] mb-6" style={{ fontFamily: 'var(--font-heading)' }}>
                {title}
              </h3>
            )}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ============================================================
   SKELETON LOADER
   ============================================================ */
export function Skeleton({ className = '', count = 1 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`skeleton ${className}`} />
      ))}
    </>
  );
}

/* ============================================================
   EMPTY STATE
   ============================================================ */
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <motion.div
      className="bg-white rounded-2xl p-16 text-center border border-[#F1F5F9] shadow-[0_2px_16px_rgba(0,0,0,0.07)]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {Icon && (
        <div className="w-24 h-24 bg-[#DBEAFE] rounded-full flex items-center justify-center mx-auto mb-6">
          <Icon size={48} className="text-[#2563EB]" />
        </div>
      )}
      <h3 className="text-xl font-bold text-[#0F172A] mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
        {title}
      </h3>
      <p className="text-sm text-[#475569] max-w-md mx-auto mb-8 leading-relaxed">{description}</p>
      {action}
    </motion.div>
  );
}

/* ============================================================
   STEP PROGRESS BAR
   ============================================================ */
export function StepProgress({ steps, currentStep }) {
  return (
    <div className="flex items-center w-full mb-10">
      {steps.map((step, i) => (
        <div key={i} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center">
            <div
              className={`step-bar-circle ${
                i < currentStep ? 'completed' : i === currentStep ? 'active' : ''
              }`}
            >
              {i < currentStep ? '✓' : i + 1}
            </div>
            <span className={`text-xs mt-1 hidden sm:block ${
              i <= currentStep ? 'text-[#2563EB] font-medium' : 'text-[#94A6B8]'
            }`}>
              {step}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`step-bar-line mx-2 ${i < currentStep ? 'completed' : ''}`} />
          )}
        </div>
      ))}
    </div>
  );
}

/* ============================================================
   GOLD TOGGLE SWITCH
   ============================================================ */
export function ToggleSwitch({ checked, onChange, label }) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        className={`toggle-switch ${checked ? 'active' : ''}`}
        onClick={() => onChange(!checked)}
        aria-label={label}
      />
      {label && <span className="text-sm text-[#475569]">{label}</span>}
    </div>
  );
}
/* ============================================================
   SHARE MENU
   ============================================================ */
import { Share2 } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import './share-modal.css';

export function ShareMenu({ url, title, thumbnail, subtitle, creatorName, price, currency, pack, course }) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [hasNativeShare, setHasNativeShare] = useState(false);

  const modalRef = useRef(null);
  const gripRef = useRef(null);
  const hdRef = useRef(null);
  const toastTimeoutRef = useRef(null);

  const shareUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
  const shareTitle = title || 'Check out this session pack on Lora!';

  // Clean title for display in preview strip
  const cleanTitle = (t) => {
    if (!t) return 'Course';
    return t.replace(/^Check out "(.*?)" on Loraspace!?$/i, '$1').replace(/^Check out this session pack on Lora!?$/i, 'Course');
  };

  const displayTitle = pack?.title || course?.title || cleanTitle(title);
  const displayThumbnail = thumbnail || pack?.thumbnail_url || course?.thumbnail_url;

  const creatorFirst = pack?.creator_profiles?.profiles?.first_name || '';
  const creatorLast = pack?.creator_profiles?.profiles?.last_name || '';
  const creatorDisplay = (creatorFirst + ' ' + creatorLast).trim() || creatorName || '';
  const packPrice = pack?.price || price;
  const packCurrency = pack?.currency || currency || 'LKR';

  let displaySubtitle = subtitle;
  if (!displaySubtitle) {
    if (creatorDisplay && packPrice) {
      displaySubtitle = `${creatorDisplay} · ${packCurrency} ${packPrice}`;
    } else if (creatorDisplay) {
      displaySubtitle = creatorDisplay;
    } else if (packPrice) {
      displaySubtitle = `${packCurrency} ${packPrice}`;
    }
  }

  const handleClose = () => {
    setIsOpen(false);
  };

  // Check for native share support (mobile only where supported)
  useEffect(() => {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      setHasNativeShare(true);
    }
  }, []);

  // Escape key closes modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Swipe-down-to-close on grab handle and header (passive touch listeners)
  useEffect(() => {
    if (!isOpen) return;

    const m = modalRef.current;
    const grip = gripRef.current;
    const hd = hdRef.current;
    if (!m) return;

    let y0 = null;
    let dy = 0;

    const handleTouchStart = (e) => {
      if (window.innerWidth > 520) return;
      y0 = e.touches[0].clientY;
      dy = 0;
      m.style.animation = 'none';
      m.style.transition = 'none';
    };

    const handleTouchMove = (e) => {
      if (y0 === null) return;
      dy = Math.max(0, e.touches[0].clientY - y0);
      m.style.transform = `translateY(${dy}px)`;
    };

    const handleTouchEnd = () => {
      if (y0 === null) return;
      m.style.transition = 'transform .2s';
      if (dy > 90) {
        handleClose();
      }
      m.style.transform = '';
      y0 = null;
      dy = 0;
    };

    const targets = [grip, hd].filter(Boolean);
    targets.forEach((el) => {
      el.addEventListener('touchstart', handleTouchStart, { passive: true });
      el.addEventListener('touchmove', handleTouchMove, { passive: true });
      el.addEventListener('touchend', handleTouchEnd);
    });

    return () => {
      targets.forEach((el) => {
        el.removeEventListener('touchstart', handleTouchStart);
        el.removeEventListener('touchmove', handleTouchMove);
        el.removeEventListener('touchend', handleTouchEnd);
      });
    };
  }, [isOpen]);

  const showToast = (msg) => {
    setToastMsg(msg);
    setToastVisible(true);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setToastVisible(false);
    }, 2200);
  };

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        throw new Error('Clipboard API unavailable');
      }
    } catch (_) {
      const input = document.getElementById('lora-share-url-input');
      if (input) {
        input.select();
        document.execCommand('copy');
      }
    }
    setCopied(true);
    showToast('Link copied to clipboard!');
    setTimeout(() => setCopied(false), 1800);
  };

  const handleInstagramClick = () => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareUrl).catch(() => {});
    }
    setCopied(true);
    showToast('Link copied. Paste it in Instagram.');
    setTimeout(() => setCopied(false), 1800);
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: displayTitle,
          url: shareUrl,
        });
      } catch (_) {}
    }
  };

  return (
    <>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(true);
        }}
        className="w-10 h-10 bg-white border border-[#E2E8F0] rounded-full flex items-center justify-center text-[#64748B] hover:text-[#2563EB] hover:border-[#2563EB] transition-colors shadow-sm relative z-10"
        aria-label="Share"
      >
        <Share2 size={18} />
      </button>

      {isOpen && typeof document !== 'undefined' && createPortal(
        <div className="lora-share">
          <div className="back" onClick={handleClose}>
            <div
              className="modal"
              ref={modalRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="lora-share-ttl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Grab handle for swipe-down on mobile */}
              <div className="grip" ref={gripRef} aria-hidden="true" />

              {/* Header */}
              <div className="hd" ref={hdRef}>
                <div>
                  <h2 id="lora-share-ttl">Share course</h2>
                  <p>Spread the word with your friends!</p>
                </div>
                <button
                  className="x"
                  type="button"
                  onClick={handleClose}
                  aria-label="Close"
                >
                  <svg className="ic" viewBox="0 0 24 24">
                    <path d="M6 6l12 12M18 6 6 18" />
                  </svg>
                </button>
              </div>

              {/* Course preview strip */}
              <div className="pv">
                <div
                  className="th"
                  style={displayThumbnail ? { backgroundImage: `url(${displayThumbnail})` } : undefined}
                />
                <div>
                  <b>{displayTitle}</b>
                  {displaySubtitle && <small>{displaySubtitle}</small>}
                </div>
              </div>

              {/* Share Channels */}
              <div className="ch">
                <a
                  className="c wa"
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(shareTitle + ' ' + shareUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="t">
                    <svg className="ic" viewBox="0 0 24 24">
                      <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z" />
                    </svg>
                  </span>
                  WhatsApp
                </a>

                <a
                  className="c tg"
                  href={`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="t">
                    <svg className="ic" viewBox="0 0 24 24">
                      <path d="M22 2 11 13M22 2l-7 20-4-9-9-4z" />
                    </svg>
                  </span>
                  Telegram
                </a>

                <a
                  className="c tw"
                  href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="t">
                    <svg className="ic" viewBox="0 0 24 24">
                      <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
                    </svg>
                  </span>
                  Twitter
                </a>

                <button
                  className="c ig"
                  type="button"
                  onClick={handleInstagramClick}
                >
                  <span className="t">
                    <svg className="ic" viewBox="0 0 24 24">
                      <rect x="3" y="3" width="18" height="18" rx="5" />
                      <circle cx="12" cy="12" r="4" />
                      <circle cx="17.5" cy="6.5" r=".8" fill="currentColor" />
                    </svg>
                  </span>
                  Instagram
                </button>
              </div>

              {/* Or copy link */}
              <div className="or">Or copy link</div>

              <div className="copy">
                <svg className="ic" viewBox="0 0 24 24">
                  <path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" />
                  <path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />
                </svg>
                <input
                  id="lora-share-url-input"
                  readOnly
                  value={shareUrl}
                  aria-label="Course link"
                  onFocus={(e) => e.target.select()}
                />
                <button
                  className={`cp ${copied ? 'done' : ''}`}
                  type="button"
                  onClick={handleCopy}
                >
                  <svg className="ic" viewBox="0 0 24 24">
                    <rect x="9" y="9" width="11" height="11" rx="2" />
                    <path d="M5 15V6a2 2 0 0 1 2-2h9" />
                  </svg>
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              {/* More sharing options (native share sheet on supported devices) */}
              {hasNativeShare && (
                <button
                  className="more"
                  type="button"
                  onClick={handleNativeShare}
                >
                  More sharing options
                </button>
              )}
            </div>
          </div>

          {/* Toast Notification */}
          <div className={`toast ${toastVisible ? 'show' : ''}`} role="status">
            {toastMsg}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
