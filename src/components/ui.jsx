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
