import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { useSubscriptionGuard } from '../hooks/useSubscriptionGuard';
import './enrollments.css';

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'expired', label: 'Expired' },
];

const STATUS_LABELS = {
  all: 'All',
  pending: 'Pending',
  confirmed: 'Confirmed',
  rejected: 'Rejected',
  expired: 'Expired',
};

const QUICK_REASONS = [
  'Wrong amount',
  'Code not found in bank',
  'Screenshot unclear',
  'Payment not received',
];

export default function Enrollments() {
  useSubscriptionGuard();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [screenshotModal, setScreenshotModal] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(null);
  const [toastMsg, setToastMsg] = useState('');
  const [showBanner, setShowBanner] = useState(() => localStorage.getItem('hideRefBanner') !== 'true');

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2500);
  };

  const dismissBanner = () => {
    localStorage.setItem('hideRefBanner', 'true');
    setShowBanner(false);
  };

  const fetchEnrollments = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('enrollments')
      .select(`
        *,
        profiles!enrollments_learner_id_fkey(first_name, last_name, email),
        session_packs!inner(title, creator_id, price, currency)
      `)
      .eq('session_packs.creator_id', user.id)
      .order('submitted_at', { ascending: false });
    setEnrollments(data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (user) fetchEnrollments();
  }, [user]);

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) setSearchQuery(q);
  }, [searchParams]);

  /* Keyboard listener for Escape key */
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setScreenshotModal(null);
        setRejectModal(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const confirmPayment = async (enrollmentId) => {
    setProcessing(enrollmentId);
    const enrollment = enrollments.find(e => e.id === enrollmentId);

    const { error } = await supabase.from('enrollments').update({
      status: 'confirmed',
      confirmed_at: new Date().toISOString(),
    }).eq('id', enrollmentId);

    if (error) {
      showToast('Error confirming payment: ' + error.message);
      setProcessing(null);
      return;
    }

    if (enrollment) {
      await supabase.from('notifications').insert({
        user_id: enrollment.learner_id,
        title: 'Payment Confirmed! 🎉',
        message: `Your payment for "${enrollment.session_packs?.title}" has been confirmed. You can now access all sessions.`,
      });
    }

    showToast('Enrollment approved');
    setProcessing(null);
    fetchEnrollments();
  };

  const rejectPayment = async () => {
    if (!rejectModal) return;
    setProcessing(rejectModal);
    const enrollment = enrollments.find(e => e.id === rejectModal);

    const { error } = await supabase.from('enrollments').update({
      status: 'rejected',
      rejection_reason: rejectReason || null,
    }).eq('id', rejectModal);

    if (error) {
      showToast('Error rejecting payment: ' + error.message);
      setProcessing(null);
      return;
    }

    if (enrollment) {
      await supabase.from('notifications').insert({
        user_id: enrollment.learner_id,
        title: 'Payment Issue',
        message: `Your payment for "${enrollment.session_packs?.title}" was rejected. Reason: ${rejectReason || 'None given'}. Please try again.`,
      });
    }

    showToast('Enrollment rejected');
    setRejectModal(null);
    setRejectReason('');
    setProcessing(null);
    fetchEnrollments();
  };

  const filtered = enrollments.filter(e => {
    if (filter !== 'all' && e.status !== filter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const name = `${e.profiles?.first_name || ''} ${e.profiles?.last_name || ''}`.toLowerCase();
      const email = (e.profiles?.email || '').toLowerCase();
      const packTitle = (e.session_packs?.title || '').toLowerCase();
      return name.includes(q) || email.includes(q) || packTitle.includes(q);
    }
    return true;
  });

  const getInitials = (firstName, lastName) => {
    const f = (firstName?.[0] || 'L').toUpperCase();
    const l = (lastName?.[0] || '').toUpperCase();
    return `${f}${l}`;
  };

  return (
    <div className="lora-enroll">
      <div className="page">
        {/* Header */}
        <div className="hd">
          <h1>Enrollments &amp; payments</h1>
          <p>Review payment proofs and approve or reject learner enrollments.</p>
        </div>

        {/* Helper Banner */}
        {showBanner && (
          <div className="helper-banner">
            <p>
              💡 <b>Tip for bank transfer payments:</b> Check your bank statement for the reference code shown on each card, verify the amount matches, then click <b>Approve</b>.
            </p>
            <button type="button" onClick={dismissBanner} aria-label="Dismiss banner">×</button>
          </div>
        )}

        {/* Tools: Search + Tabs */}
        <div className="tools">
          <label className="q">
            <svg className="ic" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              id="q"
              placeholder="Search by learner name…"
              aria-label="Search by learner name"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </label>

          <div className="tabs" role="tablist">
            {TABS.map(t => {
              const count = t.key === 'all'
                ? enrollments.length
                : enrollments.filter(e => e.status === t.key).length;
              const isActive = filter === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  className={isActive ? 'on' : ''}
                  onClick={() => setFilter(t.key)}
                >
                  {t.label}
                  <i>{count}</i>
                </button>
              );
            })}
          </div>
        </div>

        {/* List of Enrollment Cards */}
        <div className="list">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <article key={i} className="card en" style={{ opacity: 0.6 }}>
                  <div className="l">
                    <div className="av" style={{ background: '#e3e7f1' }} />
                    <div>
                      <div style={{ height: 16, width: 120, background: '#e3e7f1', borderRadius: 4, marginBottom: 6 }} />
                      <div style={{ height: 12, width: 160, background: '#e3e7f1', borderRadius: 4 }} />
                    </div>
                  </div>
                  <div className="d">
                    <div><small>Pack</small><div style={{ height: 14, width: 80, background: '#e3e7f1', borderRadius: 4, marginTop: 4 }} /></div>
                    <div><small>Amount</small><div style={{ height: 14, width: 60, background: '#e3e7f1', borderRadius: 4, marginTop: 4 }} /></div>
                    <div><small>Method</small><div style={{ height: 14, width: 70, background: '#e3e7f1', borderRadius: 4, marginTop: 4 }} /></div>
                    <div><small>Submitted</small><div style={{ height: 14, width: 90, background: '#e3e7f1', borderRadius: 4, marginTop: 4 }} /></div>
                  </div>
                </article>
              ))}
            </div>
          ) : filtered.length > 0 ? (
            filtered.map(x => {
              const learnerName = `${x.profiles?.first_name || ''} ${x.profiles?.last_name || ''}`.trim() || 'Learner';
              const learnerEmail = x.profiles?.email || 'No email provided';
              const packTitle = x.session_packs?.title || 'Course Pack';
              const amount = `${x.session_packs?.currency || 'LKR'} ${x.session_packs?.price != null ? Number(x.session_packs.price).toFixed(0) : '0'}`;
              const method = x.payment_method_used === 'bank' ? 'Bank transfer' : (x.payment_method_used || 'Payment link');
              const submittedText = x.submitted_at ? format(new Date(x.submitted_at), 'MMM dd, yyyy · h:mm a') : 'N/A';
              const isPending = x.status === 'pending';
              const isProcessing = processing === x.id;

              return (
                <article key={x.id} className="card en">
                  {/* Learner Info */}
                  <div className="l">
                    <div className="av">{getInitials(x.profiles?.first_name, x.profiles?.last_name)}</div>
                    <div style={{ minWidth: 0 }}>
                      <b>{learnerName}</b>
                      <small>{learnerEmail}</small>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="d">
                    <div>
                      <small>Pack</small>
                      <b>{packTitle}</b>
                    </div>
                    <div>
                      <small>Amount</small>
                      <b className="amt">{amount}</b>
                    </div>
                    <div>
                      <small>Method</small>
                      <b>
                        {method}
                        {x.payment_reference_code && (
                          <span className="ref-code" title="Payment reference code"> · {x.payment_reference_code}</span>
                        )}
                      </b>
                    </div>
                    <div>
                      <small>Submitted</small>
                      <b>{submittedText}</b>
                      {x.rejection_reason && (
                        <span className="rej-badge" title={x.rejection_reason}>
                          Reason: {x.rejection_reason}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions & Proof */}
                  <div className="r">
                    <span className={`st ${x.status}`}>
                      {STATUS_LABELS[x.status] || x.status}
                    </span>

                    {/* Proof thumbnail button */}
                    <button
                      type="button"
                      className="proof"
                      onClick={() => setScreenshotModal({
                        url: x.payment_screenshot_url,
                        learnerName: learnerName,
                      })}
                      aria-label="View payment proof"
                      style={x.payment_screenshot_url ? { backgroundImage: `url(${x.payment_screenshot_url})` } : {}}
                      title={x.payment_screenshot_url ? 'Click to view payment proof' : 'No screenshot uploaded'}
                    >
                      {!x.payment_screenshot_url && (
                        <svg className="ic" viewBox="0 0 24 24">
                          <rect x="3" y="4" width="18" height="16" rx="2" />
                          <circle cx="9" cy="10" r="2" />
                          <path d="m21 16-5-5-9 9" />
                        </svg>
                      )}
                    </button>

                    {/* Pending Approve & Reject Buttons */}
                    {isPending && (
                      <>
                        <button
                          type="button"
                          className="b no"
                          onClick={() => setRejectModal(x.id)}
                          disabled={isProcessing}
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          className="b ok"
                          onClick={() => confirmPayment(x.id)}
                          disabled={isProcessing}
                        >
                          {isProcessing ? (
                            <Loader2 size={15} className="animate-spin" />
                          ) : (
                            <svg className="ic" viewBox="0 0 24 24" style={{ width: 16, height: 16 }}>
                              <path d="m5 12 5 5 9-10" />
                            </svg>
                          )}
                          Approve
                        </button>
                      </>
                    )}
                  </div>
                </article>
              );
            })
          ) : (
            <div className="card empty">
              <div className="ring">
                <svg className="ic" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" />
                </svg>
              </div>
              <h3>No enrollments found</h3>
              <p>No enrollment records match your current filters.</p>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox Proof Preview Dialog */}
      <div
        className={`lb${screenshotModal ? ' show' : ''}`}
        role="dialog"
        aria-modal="true"
        onClick={e => {
          if (e.target.classList.contains('lb')) setScreenshotModal(null);
        }}
      >
        <div className="lb-card">
          <header>
            <b>Payment proof {screenshotModal?.learnerName ? `· ${screenshotModal.learnerName}` : ''}</b>
            <button type="button" onClick={() => setScreenshotModal(null)} aria-label="Close">×</button>
          </header>
          <div
            className="img"
            style={screenshotModal?.url ? { backgroundImage: `url(${screenshotModal.url})` } : {}}
          >
            {!screenshotModal?.url && 'No screenshot uploaded'}
          </div>
        </div>
      </div>

      {/* Rejection Reason Modal */}
      <div
        className={`lb${rejectModal ? ' show' : ''}`}
        role="dialog"
        aria-modal="true"
        onClick={e => {
          if (e.target.classList.contains('lb')) {
            setRejectModal(null);
            setRejectReason('');
          }
        }}
      >
        <div className="reject-card">
          <h3>Reject Payment</h3>
          <p>Provide a reason so the learner can re-upload a correct screenshot or payment proof.</p>

          <div className="reject-chips">
            {QUICK_REASONS.map(r => (
              <button
                key={r}
                type="button"
                className={`reject-chip${rejectReason === r ? ' active' : ''}`}
                onClick={() => setRejectReason(r)}
              >
                {r}
              </button>
            ))}
          </div>

          <textarea
            className="reject-textarea"
            placeholder="Type reason for rejection (optional)..."
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
            rows={3}
          />

          <div className="reject-actions">
            <button
              type="button"
              className="btn-cancel"
              onClick={() => {
                setRejectModal(null);
                setRejectReason('');
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn-reject-confirm"
              onClick={rejectPayment}
              disabled={processing === rejectModal}
            >
              {processing === rejectModal ? 'Rejecting...' : 'Reject Payment'}
            </button>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      <div className={`toast${toastMsg ? ' show' : ''}`} role="status">
        {toastMsg}
      </div>
    </div>
  );
}
