import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Clock, Users, Lock, Play, ExternalLink, Upload,
  Sparkles, MessageCircle, Send, Calendar, Video, Loader2, CheckCircle, Building2, Copy,
  ChevronRight, ChevronDown, ChevronUp, Star, ShieldCheck, Headset, LayoutGrid, MonitorPlay, Infinity as InfinityIcon, Smartphone, PlayCircle, Phone
} from 'lucide-react';
import { format, formatDistanceToNow, differenceInMinutes, isPast } from 'date-fns';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { generatePaymentReference, hasValidSubscription, slugify } from '../lib/utils';
import { PageTransition, GoldBadge, Modal, StatusBadge, Skeleton, ShareMenu } from '../components/ui';
import './payment-code-modal.css';
import './payment-modal.css';
import './course-detail.css';

function WhatsAppIcon({ size = 18, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      style={{ flexShrink: 0 }}
    >
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 15 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67M9.11 7.42C8.94 7.42 8.67 7.48 8.44 7.73C8.21 7.98 7.57 8.58 7.57 9.81C7.57 11.04 8.47 12.22 8.6 12.39C8.72 12.56 10.38 15.25 13 16.28C15.19 17.14 15.63 16.97 16.1 16.93C16.58 16.88 17.63 16.3 17.85 15.68C18.07 15.06 18.07 14.53 18.01 14.42C17.95 14.31 17.78 14.25 17.53 14.12C17.28 14 16.05 13.39 15.82 13.31C15.59 13.23 15.43 13.19 15.26 13.44C15.09 13.69 14.62 14.25 14.48 14.42C14.34 14.58 14.2 14.6 13.95 14.48C13.7 14.36 12.89 14.09 11.94 13.24C11.2 12.58 10.7 11.76 10.55 11.51C10.4 11.26 10.53 11.13 10.66 11C10.77 10.89 10.91 10.71 11.04 10.56C11.17 10.41 11.21 10.3 11.3 10.12C11.38 9.94 11.34 9.79 11.28 9.67C11.22 9.55 10.73 8.35 10.52 7.85C10.32 7.37 10.12 7.43 9.96 7.42C9.81 7.42 9.64 7.42 9.11 7.42Z" />
    </svg>
  );
}

function getSanitizedPhone(rawNumber) {
  if (!rawNumber) return '';
  let cleaned = String(rawNumber).replace(/[^0-9]/g, '');
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    cleaned = '94' + cleaned.slice(1);
  }
  return cleaned;
}

function SessionButton({ session }) {
  const now = new Date();
  const scheduled = new Date(session.scheduled_at);
  const minutesDiff = differenceInMinutes(scheduled, now);
  const isLive = minutesDiff <= 15 && minutesDiff >= -session.duration_minutes;
  const hasPassed = isPast(scheduled) && !isLive;

  if (isLive) {
    return (
      <a
        href={session.zoom_link}
        target="_blank"
        rel="noopener noreferrer"
        className="btn pri"
        style={{ width: 'auto', padding: '9px 18px', fontSize: '13.5px' }}
      >
        <Play size={14} /> Join Now
      </a>
    );
  }
  if (hasPassed && session.recording_url) {
    return (
      <a
        href={session.recording_url}
        target="_blank"
        rel="noopener noreferrer"
        className="btn"
      >
        <svg className="ic" viewBox="0 0 24 24"><rect x="3" y="6" width="13" height="12" rx="2" /><path d="m16 10 5-3v10l-5-3" /></svg>
        Watch recording
      </a>
    );
  }
  if (hasPassed && !session.recording_url) {
    return (
      <span style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600 }}>
        Recording Coming Soon
      </span>
    );
  }
  return (
    <span style={{ fontSize: '13px', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
      <Clock size={13} /> Starts {formatDistanceToNow(scheduled, { addSuffix: true })}
    </span>
  );
}

function PaymentStep1({ refCode, onClose, onNext, expiryText = "This code expires in 48 hours" }) {
  const [copied, setCopied] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimeoutRef = useRef(null);

  const modalRef = useRef(null);
  const gripRef = useRef(null);
  const previousActiveElement = useRef(null);

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
        await navigator.clipboard.writeText(refCode);
      } else {
        throw new Error('Clipboard API unavailable');
      }
    } catch (_) {
      const codeEl = document.getElementById('lora-ref-code-text');
      if (codeEl) {
        const r = document.createRange();
        r.selectNodeContents(codeEl);
        const s = window.getSelection();
        s.removeAllRanges();
        s.addRange(r);
        document.execCommand('copy');
      }
    }
    setCopied(true);
    showToast('Reference code copied');
    setTimeout(() => setCopied(false), 1800);
  };

  // Focus management & Escape key listener
  useEffect(() => {
    previousActiveElement.current = document.activeElement;
    if (modalRef.current) {
      modalRef.current.focus();
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (previousActiveElement.current && previousActiveElement.current.focus) {
        previousActiveElement.current.focus();
      }
    };
  }, [onClose]);

  // Mobile swipe-down-to-close on grab handle
  useEffect(() => {
    const m = modalRef.current;
    const grip = gripRef.current;
    if (!m || !grip) return;

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
        onClose();
      }
      m.style.transform = '';
      y0 = null;
      dy = 0;
    };

    grip.addEventListener('touchstart', handleTouchStart, { passive: true });
    grip.addEventListener('touchmove', handleTouchMove, { passive: true });
    grip.addEventListener('touchend', handleTouchEnd);

    return () => {
      grip.removeEventListener('touchstart', handleTouchStart);
      grip.removeEventListener('touchmove', handleTouchMove);
      grip.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onClose]);

  return (
    <div className="lora-code">
      <div 
        className="back" 
        onClick={onClose}
      >
        <div 
          className="modal" 
          ref={modalRef}
          role="dialog" 
          aria-modal="true" 
          aria-labelledby="ttl"
          tabIndex={-1}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="grip" ref={gripRef} aria-hidden="true" />
          
          <span className="step">
            Step 1 of 2 <span className="dots" aria-hidden="true"><i className="on"></i><i></i></span>
          </span>

          <h2 id="ttl">Complete payment</h2>
          
          <p className="msg">
            When making your payment, paste or type <b>this exact code</b> in the payment description/reference field. This is how the creator identifies your payment.
          </p>

          <div className="ticket">
            <div className="lbl">Your reference code</div>
            <div className="code" id="lora-ref-code-text">{refCode}</div>
            <button 
              className={`copy ${copied ? 'done' : ''}`} 
              id="copy" 
              type="button" 
              onClick={handleCopy}
            >
              <svg className="ic" viewBox="0 0 24 24">
                <rect x="9" y="9" width="11" height="11" rx="2" />
                <path d="M5 15V6a2 2 0 0 1 2-2h9" />
              </svg>
              <span>{copied ? 'Copied' : 'Copy code'}</span>
            </button>
          </div>

          <div className="exp">
            <svg className="ic" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
            {expiryText}
          </div>

          <button 
            className="next" 
            id="next" 
            type="button" 
            onClick={onNext}
          >
            Next: view payment instructions{' '}
            <svg className="ic" viewBox="0 0 24 24">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </div>
      </div>

      <div className={`toast ${toastVisible ? 'show' : ''}`} role="status">
        {toastMsg}
      </div>
    </div>
  );
}

function PaymentStep2({
  pack, creator, bankDetails,
  screenshot, setScreenshot,
  uploadError, setUploadError,
  uploading, paymentMethod, setPaymentMethod,
  onBack, onSubmit,
}) {
  const [activeTab, setActiveTab] = useState(() =>
    creator?.payment_option === 'bank' ? 'bank' : 'link'
  );
  const [copied, setCopied] = useState(false);
  const [dropOver, setDropOver] = useState(false);

  const showBoth = creator?.payment_option === 'both';
  const showLink = creator?.payment_option === 'link' || creator?.payment_option === 'both';
  const showBank = creator?.payment_option === 'bank' || creator?.payment_option === 'both';

  function handleFile(f) {
    setUploadError(null);
    if (!f) return;
    if (!f.type.startsWith('image/')) { setUploadError('Only image files are allowed.'); return; }
    if (f.size > 5 * 1024 * 1024) { setUploadError('File is too large. Maximum size is 5MB.'); return; }
    setScreenshot(f);
  }

  async function handleCopy() {
    try { await navigator.clipboard.writeText(bankDetails?.account_number || ''); } catch (_) {}
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  const canSubmit = paymentMethod && screenshot && !uploading;

  return (
    <div className="lora-pay" role="dialog" aria-modal="true" aria-labelledby="pm-ttl">
      {/* HEAD */}
      <div className="pm-head">
        <div>
          <h1 className="pm-title" id="pm-ttl">Complete payment</h1>
          <p className="pm-sub">Pay the creator, then confirm below to unlock your enrollment.</p>
        </div>
        <button className="pm-close" aria-label="Close" onClick={onBack}>×</button>
      </div>

      {/* BODY */}
      <div className="pm-body">
        {/* Total */}
        <div className="pm-total">
          <small>Total amount</small>
          <div className="pm-amt"><span>{pack?.currency}</span>{pack?.price}</div>
        </div>

        {/* Tabs — only when both methods enabled */}
        {showBoth && (
          <div className="pm-tabs" role="tablist">
            <button
              role="tab"
              className={activeTab === 'link' ? 'pm-tab on' : 'pm-tab'}
              onClick={() => setActiveTab('link')}
            >
              <svg className="pm-ic" viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></svg>
              Payment link
            </button>
            <button
              role="tab"
              className={activeTab === 'bank' ? 'pm-tab on' : 'pm-tab'}
              onClick={() => setActiveTab('bank')}
            >
              <svg className="pm-ic" viewBox="0 0 24 24"><path d="M3 10 12 4l9 6M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18"/></svg>
              Bank transfer
            </button>
          </div>
        )}

        {/* Payment Link pane */}
        {showLink && (!showBoth || activeTab === 'link') && (
          <div className="pm-pane show">
            <a
              href={creator?.payment_link}
              target="_blank"
              rel="noopener noreferrer"
              className="pm-btn-link"
            >
              <svg className="pm-ic" viewBox="0 0 24 24"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>
              Pay via link
            </a>
            <p className="pm-helper">Opens the creator's payment page in a new tab. Come back here after paying.</p>
          </div>
        )}

        {/* Bank Transfer pane */}
        {showBank && (!showBoth || activeTab === 'bank') && (
          <div className="pm-pane show">
            {bankDetails ? (
              <div className="pm-bank">
                <dl>
                  <div>
                    <dt>Bank</dt>
                    <dd className="pm-bn">{bankDetails.bank_name}</dd>
                  </div>
                  <div className="pm-two">
                    <div>
                      <dt>Account holder</dt>
                      <dd>{bankDetails.account_holder_name}</dd>
                    </div>
                    {bankDetails.branch && (
                      <div>
                        <dt>Branch</dt>
                        <dd>{bankDetails.branch}{bankDetails.branch_code ? ` (${bankDetails.branch_code})` : ''}</dd>
                      </div>
                    )}
                  </div>
                  <div>
                    <dt>Account number</dt>
                    <div className="pm-row">
                      <dd className="pm-num">{bankDetails.account_number}</dd>
                      <button
                        className={`pm-copy${copied ? ' done' : ''}`}
                        type="button"
                        onClick={handleCopy}
                      >
                        <svg className="pm-ic" viewBox="0 0 24 24"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/></svg>
                        <span>{copied ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>
                </dl>
              </div>
            ) : (
              <p style={{ color: 'var(--pm-muted)', fontSize: 14 }}>
                Bank details are not available. Please contact the creator.
              </p>
            )}
            {bankDetails?.extra_note && (
              <div className="pm-note">
                <b>Note:</b> {bankDetails.extra_note}
              </div>
            )}
          </div>
        )}

        {/* Method picker */}
        <div className="pm-sec">
          <h2>Which payment method did you use?</h2>
          <div className="pm-pick">
            {showLink && (
              <label>
                <input
                  type="radio"
                  name="pmMethod"
                  value="link"
                  checked={paymentMethod === 'link'}
                  onChange={e => setPaymentMethod(e.target.value)}
                />
                <span>Payment link</span>
              </label>
            )}
            {showBank && (
              <label>
                <input
                  type="radio"
                  name="pmMethod"
                  value="bank"
                  checked={paymentMethod === 'bank'}
                  onChange={e => setPaymentMethod(e.target.value)}
                />
                <span>Manual bank transfer</span>
              </label>
            )}
          </div>
        </div>

        {/* Upload */}
        <div className="pm-sec">
          <h2>Upload confirmation screenshot</h2>
          {!screenshot ? (
            <label
              className={`pm-drop${dropOver ? ' over' : ''}${uploadError ? ' err' : ''}`}
              onDragOver={e => { e.preventDefault(); setDropOver(true); }}
              onDragEnter={e => { e.preventDefault(); setDropOver(true); }}
              onDragLeave={e => { e.preventDefault(); setDropOver(false); }}
              onDrop={e => { e.preventDefault(); setDropOver(false); handleFile(e.dataTransfer.files[0]); }}
            >
              <svg className="pm-drop-icon" viewBox="0 0 24 24"><path d="M12 16V4M7 9l5-5 5 5M4 20h16"/></svg>
              <b>Upload payment screenshot</b>
              <small>Required to complete enrollment · Max 5MB, images only</small>
              <input
                type="file"
                accept="image/*"
                onChange={e => handleFile(e.target.files?.[0])}
              />
            </label>
          ) : (
            <div className="pm-file show">
              <img
                src={URL.createObjectURL(screenshot)}
                alt="Screenshot preview"
                style={{ width: 64, height: 64, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }}
              />
              <div>
                <b style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{screenshot.name}</b>
                <small>{(screenshot.size / 1024).toFixed(0)} KB</small>
              </div>
              <button
                type="button"
                className="pm-rm"
                onClick={() => { setScreenshot(null); setUploadError(null); }}
              >Remove</button>
            </div>
          )}
          {uploadError && <div className="pm-msg">{uploadError}</div>}
        </div>
      </div>

      {/* FOOT */}
      <div className="pm-foot">
        <button className="pm-btn ghost" type="button" onClick={onBack}>Cancel</button>
        <button
          className="pm-btn"
          type="button"
          disabled={!canSubmit}
          onClick={onSubmit}
        >
          {uploading
            ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
            : 'Submit and enroll'}
        </button>
      </div>
    </div>
  );
}

export default function PackDetail() {
  const { id } = useParams();
  const { user, profile } = useAuth();
  const [pack, setPack] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [creator, setCreator] = useState(null);
  const [enrollment, setEnrollment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentModal, setPaymentModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [screenshot, setScreenshot] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [loginPrompt, setLoginPrompt] = useState(false);
  const [bankDetails, setBankDetails] = useState(null);
  const [paymentStep, setPaymentStep] = useState(1);
  const [refCode, setRefCode] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');

  const totalMinutes = sessions.reduce((acc, s) => acc + (s.duration_minutes || 0), 0);

  useEffect(() => {
    const fetch = async () => {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

      let packData = null;

      if (isUuid) {
        const { data } = await supabase.from('session_packs')
          .select('*, creator_profiles(id, subscription_status, trial_ends_at, payment_link, payment_option, about, category, profiles(first_name, last_name, avatar_url, contact_number, country_code))')
          .eq('id', id).maybeSingle();
        packData = data;
      } else {
        // Look up by slug
        const { data: bySlug } = await supabase.from('session_packs')
          .select('*, creator_profiles(id, subscription_status, trial_ends_at, payment_link, payment_option, about, category, profiles(first_name, last_name, avatar_url, contact_number, country_code))')
          .eq('slug', id).maybeSingle();
        packData = bySlug;

        // Fallback: If not found by slug (e.g. before migration), search by slugified title
        if (!packData) {
          const cleanSearch = id.replace(/-/g, ' ');
          const { data: byTitle } = await supabase.from('session_packs')
            .select('*, creator_profiles(id, subscription_status, trial_ends_at, payment_link, payment_option, about, category, profiles(first_name, last_name, avatar_url, contact_number, country_code))')
            .ilike('title', cleanSearch)
            .limit(1);
          if (byTitle && byTitle.length > 0) {
            packData = byTitle[0];
          }
        }
      }

      if (packData) {
        setPack(packData);
        setCreator(packData.creator_profiles);

        const realId = packData.id;

        const [sessRes, enrRes] = await Promise.all([
          supabase.from('sessions').select('*').eq('pack_id', realId).order('order_index'),
          user ? supabase.from('enrollments').select('*').eq('learner_id', user.id).eq('pack_id', realId).maybeSingle() : Promise.resolve({ data: null })
        ]);

        setSessions(sessRes.data || []);
        if (enrRes.data) {
          setEnrollment(enrRes.data);
        }

        if (packData.creator_profiles) {
          supabase.from('creator_bank_details').select('*').eq('creator_id', packData.creator_profiles.id).maybeSingle()
            .then(({ data }) => setBankDetails(data));
        }
      }

      setLoading(false);
    };
    fetch();
  }, [id, user]);

  const handleFreeJoin = async (session) => {
    if (!user) { setLoginPrompt(true); return; }
    await supabase.from('free_session_joins').insert({
      session_id: session.id,
      learner_id: user.id,
    });
    window.open(session.zoom_link, '_blank');
  };

  const handleStartPaymentFlow = async () => {
    setUploadError(null);
    const code = await generatePaymentReference(profile?.first_name);
    setRefCode(code);
    setPaymentStep(1);
    setPaymentModal(true);
  };

  const handlePaymentUpload = async () => {
    if (!screenshot || !user) return;
    setUploading(true);
    try {
      const ext = screenshot.name.split('.').pop();
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('payment-screenshots').upload(path, screenshot);
      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage.from('payment-screenshots').getPublicUrl(path);

      const { error: enrErr } = await supabase.from('enrollments').upsert({
        id: enrollment?.id || undefined,
        learner_id: user.id,
        pack_id: pack?.id || id,
        status: 'pending',
        payment_screenshot_url: urlData?.publicUrl || null,
        payment_method_used: paymentMethod || 'manual',
        payment_reference_code: refCode,
        code_expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        submitted_at: new Date().toISOString(),
      }, { onConflict: enrollment?.id ? 'id' : undefined });

      if (enrErr) throw enrErr;

      await supabase.from('notifications').insert({
        user_id: pack.creator_id,
        title: 'New Payment Received! 💰',
        message: `${profile.first_name} ${profile.last_name} submitted payment for "${pack.title}". Review and confirm.`,
      });

      setPaymentStep(3);
      setSubmitted(true);
    } catch (err) {
      console.error("Payment upload error:", err);
      setUploadError(err.message || "An unknown error occurred during upload.");
    } finally {
      setUploading(false);
    }
  };

  const getVideoEmbedUrl = (url) => {
    if (!url) return null;
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
    const vmMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vmMatch) return `https://player.vimeo.com/video/${vmMatch[1]}`;
    return null;
  };

  if (loading) {
    return (
      <div className="lora-course">
        <div className="wrap">
          <div className="layout">
            <main>
              <div className="card" style={{ height: 420, opacity: 0.5, background: '#e3e7f1' }} />
              <div className="card" style={{ height: 260, marginTop: 24, opacity: 0.5, background: '#e3e7f1' }} />
            </main>
            <aside className="side">
              <div className="card" style={{ height: 340, opacity: 0.5, background: '#e3e7f1' }} />
            </aside>
          </div>
        </div>
      </div>
    );
  }

  if (!pack) {
    return (
      <div className="lora-course">
        <div className="wrap" style={{ textAlign: 'center', padding: '80px 24px' }}>
          <h2>Session Pack Not Found</h2>
          <p style={{ marginTop: 12, color: 'var(--muted)' }}>
            The session pack you are looking for does not exist or has been removed.
          </p>
          <Link to="/learner/discover" className="btn pri" style={{ width: 'auto', display: 'inline-flex', marginTop: 24 }}>
            Explore other sessions
          </Link>
        </div>
      </div>
    );
  }

  const isCreatorValid = hasValidSubscription(creator);
  // Hide pack if creator's subscription is invalid, unless current user is the creator
  if (!isCreatorValid && user?.id !== pack.creator_id) {
    return (
      <div className="lora-course">
        <div className="wrap" style={{ textAlign: 'center', padding: '80px 24px' }}>
          <div className="card" style={{ maxWidth: 500, margin: '0 auto', padding: '48px 32px' }}>
            <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#fee2e2', color: '#dc2626', display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}>
              <Lock size={28} />
            </div>
            <h2>Course Unavailable</h2>
            <p style={{ margin: '14px 0 24px', color: 'var(--muted)' }}>
              This course is currently unavailable because the creator's account is inactive or their free trial has ended.
            </p>
            <Link to="/learner/discover" className="btn pri">Explore other courses</Link>
          </div>
        </div>
      </div>
    );
  }

  const embedUrl = getVideoEmbedUrl(pack.intro_video_url);
  const hasFreePreview = pack.has_free_session || sessions.some(s => s.is_free_session);

  const inquiryNumber = pack.whatsapp_number || creator?.profiles?.contact_number;
  const sanitizedPhone = getSanitizedPhone(inquiryNumber);
  const whatsappMessage = encodeURIComponent(
    `Hi ${creator?.profiles?.first_name || ''}! I'm interested in your course "${pack.title}" on Lora and would like more details.`
  );
  const whatsappUrl = sanitizedPhone ? `https://wa.me/${sanitizedPhone}?text=${whatsappMessage}` : null;
  const callUrl = inquiryNumber ? `tel:${inquiryNumber}` : null;

  const renderJoinAction = (isMobile = false) => {
    if (!user) {
      return (
        <Link to="/signup/learner" className="btn pri" style={{ textAlign: 'center' }}>
          Sign up to join
        </Link>
      );
    }
    if (user.id === pack.creator_id) {
      return (
        <Link to={`/creator/packs/${pack.id}/edit`} className="btn pri" style={{ textAlign: 'center' }}>
          Edit pack
        </Link>
      );
    }
    if (enrollment?.status === 'confirmed') {
      return (
        <div className="status-banner confirmed">
          <b>✓ You are enrolled in this pack</b>
        </div>
      );
    }
    if (enrollment?.status === 'pending') {
      return (
        <div className="status-banner pending">
          <b>Payment submitted!</b>
          <div style={{ fontSize: '12px', marginTop: 4 }}>Waiting for creator confirmation.</div>
        </div>
      );
    }
    if (enrollment?.status === 'rejected') {
      return (
        <div className="status-banner rejected">
          <b>Payment rejected</b>
          <button
            onClick={() => { setPaymentStep(2); setPaymentModal(true); }}
            className="btn"
            style={{ width: '100%', marginTop: 8 }}
          >
            Re-upload screenshot
          </button>
        </div>
      );
    }
    return (
      <button className="btn pri" type="button" onClick={handleStartPaymentFlow}>
        Join this session
      </button>
    );
  };

  return (
    <PageTransition>
      <div className="lora-course">
        <div className="wrap">
          {/* BREADCRUMB */}
          <nav className="crumbs" aria-label="Breadcrumb">
            <Link to="/">Home</Link>
            <span>›</span>
            <Link to="/learner/discover">Sessions</Link>
            <span>›</span>
            <b>{pack.title}</b>
          </nav>

          <div className="layout">
            {/* MAIN CONTENT COLUMN */}
            <main>
              {/* Free preview tag */}
              {hasFreePreview && (
                <span className="tag">
                  <svg className="ic" viewBox="0 0 24 24" style={{ width: 14, height: 14 }}>
                    <path d="m12 3 2.2 5.6L20 9l-4.5 3.8L17 19l-5-3-5 3 1.5-6.2L4 9l5.8-.4z" />
                  </svg>
                  Free preview session
                </span>
              )}

              {/* Title & Share */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
                <h1 style={{ margin: 0, flex: 1 }}>{pack.title}</h1>
                <div style={{ marginTop: 6, flexShrink: 0 }}>
                  <ShareMenu
                    url={`${window.location.origin}/p/${pack.slug || slugify(pack.title) || pack.id}`}
                    title={`Check out "${pack.title}" on Loraspace!`}
                    pack={pack}
                  />
                </div>
              </div>

              {/* Creator Byline */}
              {creator && (
                <div className="by">
                  <div className="av">
                    {creator.profiles?.avatar_url ? (
                      <img src={creator.profiles.avatar_url} alt="" />
                    ) : (
                      `${creator.profiles?.first_name?.[0] || 'C'}${creator.profiles?.last_name?.[0] || ''}`
                    )}
                  </div>
                  <div>
                    <small>Created by</small>
                    <Link to={`/creator/${creator.id}`}>
                      <b>{creator.profiles?.first_name} {creator.profiles?.last_name}</b>
                    </Link>
                  </div>
                </div>
              )}

              {/* Meta tags */}
              <div className="meta">
                <span>
                  <svg className="ic" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="m10 8.5 5 3.5-5 3.5z" /></svg>
                  <b>{sessions.length}</b> session{sessions.length !== 1 ? 's' : ''}
                </span>
                <span>
                  <svg className="ic" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
                  <b>{totalMinutes}</b> min total
                </span>
                <span>
                  <svg className="ic" viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6" /></svg>
                  All levels
                </span>
                <span>
                  <svg className="ic star" viewBox="0 0 24 24"><path d="m12 3 2.7 5.9 6.3.7-4.7 4.3 1.3 6.3L12 17l-5.6 3.2 1.3-6.3L3 9.6l6.3-.7z" /></svg>
                  <b>4.9</b> (128 reviews)
                </span>
              </div>

              {/* Hero video or thumbnail */}
              <div className="hero">
                {embedUrl ? (
                  <iframe src={embedUrl} title="Intro video" allowFullScreen allow="autoplay; encrypted-media" />
                ) : pack.thumbnail_url ? (
                  <img src={pack.thumbnail_url} alt={pack.title} />
                ) : null}
              </div>

              {/* About this session */}
              <section className="sec">
                <h2>About this session</h2>
                <p style={{ whiteSpace: 'pre-wrap' }}>
                  {pack.description || 'Learn practical ways to master the topic. This course covers real strategies, tools, and step-by-step methods.'}
                </p>
              </section>

              {/* What you'll learn */}
              <section className="sec">
                <h2>What you'll learn</h2>
                <div className="card learn">
                  <div>
                    <span className="chk">
                      <svg className="ic" viewBox="0 0 24 24"><path d="m5 12 5 5 9-10" /></svg>
                    </span>
                    Master the core concepts from scratch
                  </div>
                  <div>
                    <span className="chk">
                      <svg className="ic" viewBox="0 0 24 24"><path d="m5 12 5 5 9-10" /></svg>
                    </span>
                    Practical hands-on exercises &amp; projects
                  </div>
                  <div>
                    <span className="chk">
                      <svg className="ic" viewBox="0 0 24 24"><path d="m5 12 5 5 9-10" /></svg>
                    </span>
                    Live Q&amp;A and community support
                  </div>
                  <div>
                    <span className="chk">
                      <svg className="ic" viewBox="0 0 24 24"><path d="m5 12 5 5 9-10" /></svg>
                    </span>
                    Access to exclusive resources and templates
                  </div>
                </div>
              </section>

              {/* Session schedule */}
              <section className="sec">
                <h2>Session schedule</h2>
                {sessions.length > 0 ? (
                  <div className="list">
                    {sessions.map((s, i) => {
                      const isUnlocked = enrollment?.status === 'confirmed' || s.is_free_session || user?.id === pack.creator_id;

                      if (isUnlocked) {
                        return (
                          <div key={s.id} className="card sess">
                            <div className="n">{i + 1}</div>
                            <div className="t">
                              <div className="d">
                                {format(new Date(s.scheduled_at), 'MMM dd')}
                                {s.is_free_session && <span className="pv">Free preview</span>}
                              </div>
                              <h3>{s.title}</h3>
                              <div className="s">
                                <svg className="ic" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
                                {format(new Date(s.scheduled_at), 'h:mm a')}
                                <span>·</span>
                                {s.duration_minutes}m duration
                              </div>
                            </div>
                            <SessionButton session={s} />
                          </div>
                        );
                      }

                      return (
                        <div key={s.id} className="card sess lock">
                          <div className="n">
                            <svg className="ic" viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
                          </div>
                          <div className="t">
                            <div className="d">{format(new Date(s.scheduled_at), 'MMM dd')}</div>
                            <h3>{s.title}</h3>
                            <div className="s">
                              <svg className="ic" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
                              {format(new Date(s.scheduled_at), 'h:mm a')}
                              <span>·</span>
                              {s.duration_minutes}m duration
                            </div>
                          </div>
                          <span className="lk">
                            <svg className="ic" viewBox="0 0 24 24" style={{ width: 15, height: 15 }}>
                              <rect x="5" y="11" width="14" height="9" rx="2" />
                              <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                            </svg>
                            Unlocks after enrollment
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="card" style={{ padding: 24, textAlign: 'center', color: 'var(--muted)' }}>
                    No sessions scheduled yet.
                  </div>
                )}
              </section>

              {/* Direct Instructor Contact Section */}
              {inquiryNumber && (
                <section className="sec">
                  <div className="card trust-card">
                    <div className="trust-head">
                      <div className="trust-av">
                        {creator?.profiles?.avatar_url ? (
                          <img src={creator.profiles.avatar_url} alt="" />
                        ) : (
                          `${creator?.profiles?.first_name?.[0] || 'C'}${creator?.profiles?.last_name?.[0] || ''}`
                        )}
                      </div>
                      <div className="trust-info">
                        <span className="trust-badge">
                          <ShieldCheck size={14} /> Direct Instructor Support
                        </span>
                        <h3>Have questions about this course?</h3>
                        <p>
                          Connect directly with {creator?.profiles?.first_name} {creator?.profiles?.last_name} to clarify course outlines, live session schedules, or requirements before you enroll.
                        </p>
                      </div>
                    </div>
                    <div className="trust-actions">
                      {whatsappUrl && (
                        <a
                          href={whatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-wa"
                        >
                          <WhatsAppIcon size={18} /> Chat on WhatsApp
                        </a>
                      )}
                      {callUrl && (
                        <a href={callUrl} className="btn-call">
                          <Phone size={16} /> Call {inquiryNumber}
                        </a>
                      )}
                    </div>
                  </div>
                </section>
              )}
            </main>

            {/* SIDEBAR */}
            <aside className="side">
              {/* Buy card */}
              <div className="card buy">
                <small>Total price</small>
                <div className="price">{pack.currency} {pack.price}</div>

                {renderJoinAction()}

                {inquiryNumber && (
                  <div className="buy-inquiry">
                    <div className="buy-inquiry-div">
                      <span>Questions before joining?</span>
                    </div>
                    <div className="buy-inquiry-btns">
                      {whatsappUrl && (
                        <a
                          href={whatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-wa"
                        >
                          <WhatsAppIcon size={17} /> Chat on WhatsApp
                        </a>
                      )}
                      {callUrl && (
                        <a href={callUrl} className="btn-call">
                          <Phone size={15} /> Call for details
                        </a>
                      )}
                    </div>
                  </div>
                )}

                <ul className="ul">
                  <li>
                    <span className="chk">
                      <svg className="ic" viewBox="0 0 24 24"><path d="m5 12 5 5 9-10" /></svg>
                    </span>
                    Full lifetime access
                  </li>
                  <li>
                    <span className="chk">
                      <svg className="ic" viewBox="0 0 24 24"><path d="m5 12 5 5 9-10" /></svg>
                    </span>
                    Access on mobile and desktop
                  </li>
                  <li>
                    <span className="chk">
                      <svg className="ic" viewBox="0 0 24 24"><path d="m5 12 5 5 9-10" /></svg>
                    </span>
                    Certificate of completion
                  </li>
                </ul>

                <div className="secure">
                  <svg className="ic" viewBox="0 0 24 24">
                    <path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z" />
                  </svg>
                  Secure checkout · 7-day refund
                </div>
              </div>

              {/* Session details */}
              <div className="card box">
                <h3>Session details</h3>
                <div className="row">
                  <span className="ib">
                    <svg className="ic" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>
                  </span>
                  <div>
                    <small>Starts on</small>
                    <b>{sessions[0] ? format(new Date(sessions[0].scheduled_at), 'MMMM dd, yyyy') : 'TBA'}</b>
                  </div>
                </div>
                <div className="row">
                  <span className="ib">
                    <svg className="ic" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
                  </span>
                  <div>
                    <small>Time</small>
                    <b>{sessions[0] ? format(new Date(sessions[0].scheduled_at), 'h:mm a') : 'TBA'}</b>
                  </div>
                </div>
                <div className="row">
                  <span className="ib">
                    <svg className="ic" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>
                  </span>
                  <div>
                    <small>Category</small>
                    <b>{pack.category || 'General'}</b>
                  </div>
                </div>
              </div>

              {/* What's included */}
              <div className="card box">
                <h3>What's included</h3>
                <ul className="ul inc" style={{ marginTop: 0 }}>
                  <li>
                    <svg className="ic" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" /></svg>
                    {totalMinutes} minutes of live content
                  </li>
                  <li>
                    <svg className="ic" viewBox="0 0 24 24"><rect x="7" y="3" width="10" height="18" rx="2" /><path d="M11 18h2" /></svg>
                    Access on TV &amp; mobile
                  </li>
                  <li>
                    <svg className="ic" viewBox="0 0 24 24"><path d="M4 12a4 4 0 0 1 4-4c4 0 4 8 8 8a4 4 0 0 0 0-8c-4 0-4 8-8 8a4 4 0 0 1-4-4z" /></svg>
                    Replay availability
                  </li>
                  {(pack.whatsapp_link || pack.telegram_link) && (
                    <li>
                      <svg className="ic" viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6" /></svg>
                      Community group access
                    </li>
                  )}
                </ul>

                {(pack.whatsapp_link || pack.telegram_link) && (enrollment?.status === 'confirmed' || user?.id === pack.creator_id) && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--line)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {pack.whatsapp_link && (
                      <a href={pack.whatsapp_link} target="_blank" rel="noopener noreferrer" className="btn" style={{ fontSize: 13, padding: '8px 12px' }}>
                        <MessageCircle size={15} style={{ color: '#25D366' }} /> Join WhatsApp Group
                      </a>
                    )}
                    {pack.telegram_link && (
                      <a href={pack.telegram_link} target="_blank" rel="noopener noreferrer" className="btn" style={{ fontSize: 13, padding: '8px 12px' }}>
                        <Send size={15} style={{ color: '#229ED9' }} /> Join Telegram Group
                      </a>
                    )}
                  </div>
                )}
              </div>

              {/* Need help */}
              <div className="card help">
                <div className="ib">
                  <svg className="ic" viewBox="0 0 24 24"><path d="M4 14v-2a8 8 0 0 1 16 0v2" /><rect x="3" y="14" width="4" height="6" rx="1.5" /><rect x="17" y="14" width="4" height="6" rx="1.5" /></svg>
                </div>
                <h3>Need help?</h3>
                <p>Having trouble with your enrollment or have questions?</p>
                <a href="mailto:support@lora.com">Contact support</a>
              </div>
            </aside>
          </div>
        </div>

        {/* MOBILE STICKY PURCHASE BAR */}
        <div className="mbar">
          <div>
            <small>Total price</small>
            <div className="price">{pack.currency} {pack.price}</div>
          </div>
          {whatsappUrl && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-mbar-wa"
              title="Chat on WhatsApp"
            >
              <WhatsAppIcon size={20} />
            </a>
          )}
          {callUrl && (
            <a
              href={callUrl}
              className="btn-mbar-call"
              title="Call for details"
            >
              <Phone size={18} />
            </a>
          )}
          {renderJoinAction(true)}
        </div>

        {/* Step 1: full-screen overlay with scoped lora-code design */}
        {paymentModal && paymentStep === 1 && (
          <PaymentStep1
            refCode={refCode}
            onClose={() => { setPaymentModal(false); setPaymentStep(1); setScreenshot(null); }}
            onNext={() => setPaymentStep(2)}
          />
        )}

        {/* Step 3: Confirmation modal */}
        <Modal
          isOpen={paymentModal && paymentStep === 3}
          onClose={() => { setPaymentModal(false); window.location.reload(); }}
          title="Payment Submitted!"
        >
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-full bg-[#2D7A4F]/10 flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={32} className="text-[#2D7A4F]" />
            </div>
            <h3 className="text-xl font-bold text-[#0F172A] mb-2">Payment Submitted!</h3>

            <div className="my-6 p-4 rounded-xl border border-[#DBEAFE] bg-[#F8FAFC] inline-block">
              <p className="text-xs text-[#94A6B8] mb-1 uppercase tracking-wider">Reference Code</p>
              <p className="text-lg font-mono font-bold text-[#2563EB]">{refCode}</p>
            </div>

            <p className="text-sm text-[#475569] mb-8 leading-relaxed max-w-sm mx-auto">
              The creator will verify your payment using this code. You'll be notified once access is granted.
            </p>

            <button onClick={() => { setPaymentModal(false); window.location.reload(); }} className="btn-primary w-full py-4">
              Close
            </button>
          </div>
        </Modal>

        {/* Step 2: full-screen overlay with scoped lora-pay design */}
        {paymentModal && paymentStep === 2 && (
          <div className="lora-pay-backdrop">
            <PaymentStep2
              pack={pack}
              creator={creator}
              bankDetails={bankDetails}
              screenshot={screenshot}
              setScreenshot={setScreenshot}
              uploadError={uploadError}
              setUploadError={setUploadError}
              uploading={uploading}
              paymentMethod={paymentMethod}
              setPaymentMethod={setPaymentMethod}
              onBack={() => setPaymentStep(1)}
              onSubmit={handlePaymentUpload}
            />
          </div>
        )}

        {/* Login prompt modal */}
        <Modal isOpen={loginPrompt} onClose={() => setLoginPrompt(false)} title="Create an Account">
          <p className="text-sm text-[#475569] mb-6">Create a free learner account to join sessions and enroll in courses.</p>
          <Link to="/signup/learner" className="btn-primary w-full py-3 block text-center">Sign Up as Learner</Link>
          <p className="text-center text-sm text-[#475569] mt-4">
            Already have an account? <Link to="/login" className="text-[#2563EB]">Log in</Link>
          </p>
        </Modal>
      </div>
    </PageTransition>
  );
}
