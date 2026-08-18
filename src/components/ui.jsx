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
import { Share2, Link as LinkIcon, MessageCircle, Send, Instagram, Twitter, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

export function ShareMenu({ url, title }) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl = url || window.location.href;
  const shareTitle = title || 'Check out this session pack on Lora!';

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareLinks = [
    {
      name: 'WhatsApp',
      icon: MessageCircle,
      href: `https://api.whatsapp.com/send?text=${encodeURIComponent(shareTitle + ' ' + shareUrl)}`,
      color: 'text-[#25D366]',
      bg: 'bg-[#25D366]/10',
      border: 'border-[#25D366]/20'
    },
    {
      name: 'Telegram',
      icon: Send,
      href: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`,
      color: 'text-[#0088cc]',
      bg: 'bg-[#0088cc]/10',
      border: 'border-[#0088cc]/20'
    },
    {
      name: 'Twitter',
      icon: Twitter,
      href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`,
      color: 'text-[#1DA1F2]',
      bg: 'bg-[#1DA1F2]/10',
      border: 'border-[#1DA1F2]/20'
    },
    {
      name: 'Instagram',
      icon: Instagram,
      onClick: () => {
        handleCopy();
      },
      color: 'text-[#E1306C]',
      bg: 'bg-[#E1306C]/10',
      border: 'border-[#E1306C]/20'
    }
  ];

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
        <AnimatePresence>
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#0F172A]/40 backdrop-blur-md"
              onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-sm bg-white rounded-[32px] shadow-2xl p-6 sm:p-8 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Decorative background element */}
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-gradient-to-br from-[#2563EB]/10 to-transparent rounded-full blur-3xl" />
              
              <div className="flex items-center justify-between mb-8 relative z-10">
                <div>
                  <h3 className="text-2xl font-black text-[#0F172A] mb-1" style={{ fontFamily: 'var(--font-heading)' }}>Share Course</h3>
                  <p className="text-sm text-[#64748B]">Spread the word with your friends!</p>
                </div>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="w-10 h-10 rounded-full bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0] hover:text-[#0F172A] flex items-center justify-center transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="grid grid-cols-4 gap-4 mb-8 relative z-10">
                {shareLinks.map((link) => {
                  const LinkWrapper = link.href ? 'a' : 'button';
                  return (
                    <LinkWrapper
                      key={link.name}
                      href={link.href}
                      target={link.href ? "_blank" : undefined}
                      rel={link.href ? "noopener noreferrer" : undefined}
                      onClick={link.onClick}
                      className="flex flex-col items-center gap-2 group"
                    >
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${link.bg} border ${link.border} ${link.color} group-hover:scale-110 group-hover:shadow-lg transition-all duration-300`}>
                        <link.icon size={24} />
                      </div>
                      <span className="text-[11px] font-bold text-[#475569] group-hover:text-[#0F172A] transition-colors">{link.name}</span>
                    </LinkWrapper>
                  );
                })}
              </div>

              <div className="relative z-10">
                <p className="text-xs font-bold text-[#94A6B8] uppercase tracking-wider mb-3">Or copy link</p>
                <div className="flex items-center gap-2 p-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl">
                  <div className="flex-1 truncate px-3 text-sm text-[#475569] font-medium">
                    {shareUrl}
                  </div>
                  <button
                    onClick={handleCopy}
                    className={`flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all shadow-sm ${
                      copied 
                        ? 'bg-[#2D7A4F] text-white' 
                        : 'bg-gradient-to-r from-[#2563EB] to-[#3B82F6] text-white hover:shadow-md hover:-translate-y-0.5'
                    }`}
                  >
                    <LinkIcon size={16} />
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
