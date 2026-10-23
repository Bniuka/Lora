import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Crown, Search, Clock, CheckCircle2, AlertCircle, 
  Calendar, Loader2, Sparkles, X, ShieldAlert, UserCheck, 
  Lock, KeyRound, Eye, EyeOff, ArrowLeft, ShieldCheck
} from 'lucide-react';
import { format, addDays, addMonths, isAfter } from 'date-fns';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { isUserAdmin } from '../lib/admin';
import { PageTransition } from '../components/ui';
import './admin-panel.css';

export default function AdminPanel() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  // 🔒 Security Verification State (Locked by default on every page load)
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState('');
  const [verifyPassword, setVerifyPassword] = useState('');
  const [showVerifyPassword, setShowVerifyPassword] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState('');

  // Dashboard Data State
  const [creators, setCreators] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedCreator, setSelectedCreator] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  // Selected access grant option
  const [preset, setPreset] = useState('6m'); // '1m', '3m', '6m', '10m', '1y', 'lifetime', 'custom'
  const [customDate, setCustomDate] = useState('');

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  // Restrict to verified founders/admins
  useEffect(() => {
    if (user && !isUserAdmin(user.email)) {
      navigate('/creator/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const handleUnlock = async (e) => {
    e.preventDefault();
    setVerifyError('');
    setVerifyLoading(true);

    try {
      const trimmedEmail = verifyEmail.trim().toLowerCase();

      // 1. Verify this is the authorized founder email
      if (!isUserAdmin(trimmedEmail)) {
        throw new Error("This email is not authorized for founder panel access.");
      }

      // Check against current logged-in user
      if (user?.email && trimmedEmail !== user.email.toLowerCase()) {
        throw new Error(`Please use your currently logged-in account (${user.email}).`);
      }

      // 2. Verify password directly with Supabase
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password: verifyPassword,
      });

      if (authError) {
        throw new Error("Incorrect founder email or password. Access denied.");
      }

      // 3. Authenticated successfully
      setIsUnlocked(true);
      setVerifyPassword('');
      showToast("Founder verification successful!");
      fetchCreators();
    } catch (err) {
      setVerifyError(err.message || "Authentication failed.");
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleLockPanel = () => {
    setIsUnlocked(false);
    setVerifyPassword('');
    showToast("Founder Panel locked.");
  };

  const fetchCreators = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id, first_name, last_name, email, role, created_at, avatar_url,
          creator_profiles:creator_profiles!id(
            id, subscription_status, trial_started_at, trial_ends_at, next_billing_date, rating, total_students
          )
        `)
        .eq('role', 'creator')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCreators(data || []);
    } catch (err) {
      console.error("Error fetching creators:", err);
      showToast("Error loading creators: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Quick stats calculation
  const stats = creators.reduce((acc, c) => {
    const cp = c.creator_profiles || {};
    const status = cp.subscription_status || 'trial';
    const isVip = status === 'active' && !cp.next_billing_date;
    const isTrial = status === 'trial';
    const isExpired = status === 'expired' || status === 'cancelled';
    const isActive = status === 'active';

    acc.total++;
    if (isVip) acc.vip++;
    if (isActive) acc.active++;
    if (isTrial) acc.trial++;
    if (isExpired) acc.expired++;
    return acc;
  }, { total: 0, active: 0, trial: 0, expired: 0, vip: 0 });

  // Filter creators
  const filtered = creators.filter(c => {
    const cp = c.creator_profiles || {};
    const status = cp.subscription_status || 'trial';
    const isVip = status === 'active' && !cp.next_billing_date;

    if (filter === 'active' && status !== 'active') return false;
    if (filter === 'trial' && status !== 'trial') return false;
    if (filter === 'expired' && status !== 'expired' && status !== 'cancelled') return false;
    if (filter === 'vip' && !isVip) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      const name = `${c.first_name || ''} ${c.last_name || ''}`.toLowerCase();
      const email = (c.email || '').toLowerCase();
      return name.includes(q) || email.includes(q);
    }
    return true;
  });

  const openManageModal = (creator) => {
    setSelectedCreator(creator);
    setPreset('6m');
    setCustomDate(format(addMonths(new Date(), 6), 'yyyy-MM-dd'));
  };

  const handleApplyAccess = async (actionType = preset) => {
    if (!selectedCreator) return;
    setSaving(true);

    try {
      let newStatus = 'active';
      let targetDate = null;
      let durationLabel = '';

      if (actionType === '1m') {
        targetDate = addMonths(new Date(), 1);
        durationLabel = '1 Month';
      } else if (actionType === '3m') {
        targetDate = addMonths(new Date(), 3);
        durationLabel = '3 Months';
      } else if (actionType === '6m') {
        targetDate = addMonths(new Date(), 6);
        durationLabel = '6 Months';
      } else if (actionType === '10m') {
        targetDate = addMonths(new Date(), 10);
        durationLabel = '10 Months';
      } else if (actionType === '1y') {
        targetDate = addMonths(new Date(), 12);
        durationLabel = '1 Year';
      } else if (actionType === 'lifetime') {
        targetDate = null; // No expiration
        durationLabel = 'Lifetime VIP';
      } else if (actionType === 'custom') {
        if (!customDate) throw new Error("Please select a valid custom date");
        targetDate = new Date(customDate);
        durationLabel = `until ${format(targetDate, 'MMM dd, yyyy')}`;
      } else if (actionType === 'revoke') {
        newStatus = 'expired';
        targetDate = new Date(Date.now() - 86400000); // yesterday
        durationLabel = 'Revoked (Marked Expired)';
      }

      // Update creator_profiles
      const updatePayload = {
        subscription_status: newStatus,
        next_billing_date: targetDate ? targetDate.toISOString() : null,
      };

      const { error: upErr } = await supabase
        .from('creator_profiles')
        .update(updatePayload)
        .eq('id', selectedCreator.id);

      if (upErr) throw upErr;

      // Send creator notification
      await supabase.from('notifications').insert({
        user_id: selectedCreator.id,
        title: actionType === 'revoke' ? 'Subscription Updated' : 'Free Access Granted! 🎉',
        message: actionType === 'revoke'
          ? 'Your creator subscription has ended.'
          : actionType === 'lifetime'
            ? 'Congratulations! You have been granted Lifetime VIP Access to the Lora Creator Plan by the founder.'
            : `Congratulations! Your Lora Creator Plan has been activated for free for ${durationLabel}.`,
      });

      showToast(`Access updated: ${selectedCreator.first_name || 'Creator'} is now ${newStatus === 'active' ? durationLabel : 'Expired'}`);
      setSelectedCreator(null);
      await fetchCreators();
    } catch (err) {
      console.error("Error applying access:", err);
      showToast("Error updating access: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!user || !isUserAdmin(user.email)) {
    return (
      <div className="p-12 text-center">
        <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-sm text-gray-500">This area is restricted to the platform founder.</p>
      </div>
    );
  }

  // 🔒 Render Security Lock Screen if not verified
  if (!isUnlocked) {
    return (
      <PageTransition>
        <div className="lora-admin-lock-screen">
          <div className="lora-admin-lock-card">
            <div className="lora-admin-lock-icon-wrap">
              <KeyRound className="w-8 h-8" />
            </div>

            <h2>Founder Verification</h2>
            <p>
              This area contains master subscription and access controls. Please enter your founder email and password to proceed.
            </p>

            {verifyError && (
              <div
                style={{
                  background: '#fef2f2',
                  border: '1.5px solid #fecdd3',
                  color: '#be123c',
                  borderRadius: 12,
                  padding: '10px 14px',
                  fontSize: 13.5,
                  fontWeight: 600,
                  marginBottom: 16,
                  textAlign: 'left',
                }}
              >
                {verifyError}
              </div>
            )}

            <form onSubmit={handleUnlock} className="lora-admin-lock-form">
              <div className="lora-admin-lock-field">
                <label htmlFor="admin-email">Founder Email Address</label>
                <input
                  id="admin-email"
                  type="email"
                  required
                  placeholder="binukadin2009@gmail.com"
                  autoComplete="email"
                  value={verifyEmail}
                  onChange={e => setVerifyEmail(e.target.value)}
                />
              </div>

              <div className="lora-admin-lock-field pw-field">
                <label htmlFor="admin-pw">Password</label>
                <input
                  id="admin-pw"
                  type={showVerifyPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  value={verifyPassword}
                  onChange={e => setVerifyPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="pw-toggle"
                  onClick={() => setShowVerifyPassword(!showVerifyPassword)}
                  aria-label={showVerifyPassword ? 'Hide password' : 'Show password'}
                >
                  {showVerifyPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <button
                type="submit"
                className="lora-admin-lock-btn"
                disabled={verifyLoading}
              >
                {verifyLoading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Verifying Credentials…
                  </>
                ) : (
                  <>
                    <ShieldCheck size={18} />
                    Unlock Founder Panel
                  </>
                )}
              </button>
            </form>

            <button
              type="button"
              className="lora-admin-lock-back"
              onClick={() => navigate('/creator/dashboard')}
            >
              <ArrowLeft size={15} /> Back to Dashboard
            </button>
          </div>
        </div>
      </PageTransition>
    );
  }

  // 👑 Unlocked Dashboard View
  return (
    <PageTransition>
      <div className="lora-admin">
        {/* Header */}
        <div className="lora-admin-hd">
          <div>
            <h1>
              <Crown className="w-7 h-7 text-amber-500" />
              Founder Access Control
              <span className="founder-badge">Founder Mode</span>
            </h1>
            <p>Grant free access, extended trials, or lifetime VIP status to any creator.</p>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              className="lora-admin-btn-lock"
              onClick={handleLockPanel}
              title="Lock panel when away from keyboard"
            >
              <Lock size={14} />
              Lock Panel
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="lora-admin-stats">
          <div className="lora-admin-stat-card">
            <small>Total Creators</small>
            <b>{stats.total}</b>
          </div>
          <div className="lora-admin-stat-card stat-vip">
            <small>Lifetime VIPs</small>
            <b>{stats.vip}</b>
          </div>
          <div className="lora-admin-stat-card stat-active">
            <small>Active Plans</small>
            <b>{stats.active}</b>
          </div>
          <div className="lora-admin-stat-card stat-trial">
            <small>On Free Trial</small>
            <b>{stats.trial}</b>
          </div>
          <div className="lora-admin-stat-card stat-expired">
            <small>Expired / Locked</small>
            <b>{stats.expired}</b>
          </div>
        </div>

        {/* Toolbar */}
        <div className="lora-admin-toolbar">
          <div className="lora-admin-search">
            <Search className="ic" />
            <input
              type="text"
              placeholder="Search creator by name or email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="lora-admin-tabs">
            {[
              { id: 'all', label: `All (${creators.length})` },
              { id: 'active', label: `Active (${stats.active})` },
              { id: 'vip', label: `VIPs (${stats.vip})` },
              { id: 'trial', label: `Trial (${stats.trial})` },
              { id: 'expired', label: `Expired (${stats.expired})` },
            ].map(tab => (
              <button
                key={tab.id}
                className={filter === tab.id ? 'active' : ''}
                onClick={() => setFilter(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Creator List */}
        {loading ? (
          <div className="p-16 text-center text-gray-500 flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span>Loading creator accounts…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center text-gray-500 bg-white border border-gray-200 rounded-2xl">
            <UserCheck className="w-10 h-10 mx-auto mb-2 text-gray-400" />
            <p className="font-semibold">No creators found matching this filter.</p>
          </div>
        ) : (
          <div className="lora-admin-list">
            {filtered.map(c => {
              const cp = c.creator_profiles || {};
              const status = cp.subscription_status || 'trial';
              const isVip = status === 'active' && !cp.next_billing_date;
              const dateToFormat = isVip
                ? null
                : status === 'trial'
                  ? cp.trial_ends_at
                  : cp.next_billing_date;

              const initials = `${c.first_name?.[0] || 'C'}${c.last_name?.[0] || ''}`.toUpperCase();

              return (
                <div key={c.id} className={`lora-admin-card ${isVip ? 'is-vip' : ''}`}>
                  <div className="lora-admin-creator-info">
                    <div className="lora-admin-av">
                      {initials}
                    </div>
                    <div className="lora-admin-creator-meta">
                      <b>
                        {c.first_name} {c.last_name}
                        {isVip && (
                          <span className="status-pill status-vip">
                            <Sparkles size={11} /> VIP
                          </span>
                        )}
                      </b>
                      <small>{c.email}</small>
                    </div>
                  </div>

                  <div className="lora-admin-creator-status">
                    <span className={`status-pill status-${isVip ? 'vip' : status}`}>
                      {isVip ? 'Lifetime VIP' : status === 'trial' ? 'Free Trial' : status === 'active' ? 'Active Plan' : 'Expired'}
                    </span>
                    <span className="status-expiry-date">
                      <Clock size={12} />
                      {isVip ? 'Never expires' : dateToFormat ? `Until ${format(new Date(dateToFormat), 'MMM dd, yyyy')}` : 'No date set'}
                    </span>
                  </div>

                  <div className="lora-admin-card-actions">
                    <button
                      type="button"
                      className="lora-admin-btn-manage"
                      onClick={() => openManageModal(c)}
                    >
                      <Sparkles size={14} className="text-amber-500" />
                      Grant Access
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal: Grant Access */}
        {selectedCreator && (
          <div className="lora-admin-modal-overlay" onClick={() => !saving && setSelectedCreator(null)}>
            <div className="lora-admin-modal" onClick={e => e.stopPropagation()}>
              <div className="lora-admin-modal-head">
                <h2>Grant Access to Creator</h2>
                <button
                  type="button"
                  className="lora-admin-modal-close"
                  onClick={() => setSelectedCreator(null)}
                  disabled={saving}
                >
                  <X size={16} />
                </button>
              </div>

              <div className="lora-admin-modal-body">
                {/* Creator card summary */}
                <div className="lora-admin-target-user">
                  <div className="lora-admin-av" style={{ width: 38, height: 38, fontSize: 14 }}>
                    {`${selectedCreator.first_name?.[0] || 'C'}${selectedCreator.last_name?.[0] || ''}`.toUpperCase()}
                  </div>
                  <div>
                    <div className="font-bold text-sm text-[#0F172A]">
                      {selectedCreator.first_name} {selectedCreator.last_name}
                    </div>
                    <div className="text-xs text-gray-500">{selectedCreator.email}</div>
                  </div>
                </div>

                <span className="lora-admin-presets-title">Choose Access Duration:</span>
                <div className="lora-admin-presets-grid">
                  <button
                    type="button"
                    className={`lora-admin-preset-btn ${preset === '1m' ? 'active' : ''}`}
                    onClick={() => { setPreset('1m'); setCustomDate(format(addMonths(new Date(), 1), 'yyyy-MM-dd')); }}
                  >
                    1 Month Free
                  </button>
                  <button
                    type="button"
                    className={`lora-admin-preset-btn ${preset === '3m' ? 'active' : ''}`}
                    onClick={() => { setPreset('3m'); setCustomDate(format(addMonths(new Date(), 3), 'yyyy-MM-dd')); }}
                  >
                    3 Months Free
                  </button>
                  <button
                    type="button"
                    className={`lora-admin-preset-btn ${preset === '6m' ? 'active' : ''}`}
                    onClick={() => { setPreset('6m'); setCustomDate(format(addMonths(new Date(), 6), 'yyyy-MM-dd')); }}
                  >
                    6 Months Free
                  </button>
                  <button
                    type="button"
                    className={`lora-admin-preset-btn ${preset === '10m' ? 'active' : ''}`}
                    onClick={() => { setPreset('10m'); setCustomDate(format(addMonths(new Date(), 10), 'yyyy-MM-dd')); }}
                  >
                    10 Months Free
                  </button>
                  <button
                    type="button"
                    className={`lora-admin-preset-btn ${preset === '1y' ? 'active' : ''}`}
                    onClick={() => { setPreset('1y'); setCustomDate(format(addMonths(new Date(), 12), 'yyyy-MM-dd')); }}
                  >
                    1 Year Free
                  </button>
                  <button
                    type="button"
                    className={`lora-admin-preset-btn ${preset === 'custom' ? 'active' : ''}`}
                    onClick={() => setPreset('custom')}
                  >
                    Custom Date
                  </button>
                  <button
                    type="button"
                    className={`lora-admin-preset-btn preset-vip ${preset === 'lifetime' ? 'active' : ''}`}
                    onClick={() => { setPreset('lifetime'); }}
                  >
                    <Crown size={18} />
                    👑 Lifetime VIP Access (Never Expires)
                  </button>
                </div>

                {preset === 'custom' && (
                  <div className="lora-admin-custom-date">
                    <label>Select End Date:</label>
                    <input
                      type="date"
                      value={customDate}
                      onChange={e => setCustomDate(e.target.value)}
                      min={format(new Date(), 'yyyy-MM-dd')}
                    />
                  </div>
                )}

                <div className="lora-admin-modal-actions">
                  <button
                    type="button"
                    className="lora-admin-btn-revoke"
                    onClick={() => handleApplyAccess('revoke')}
                    disabled={saving}
                  >
                    Revoke Access
                  </button>
                  <button
                    type="button"
                    className="lora-admin-btn-cancel"
                    onClick={() => setSelectedCreator(null)}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="lora-admin-btn-save"
                    onClick={() => handleApplyAccess(preset)}
                    disabled={saving}
                  >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : 'Apply Free Access'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Toast */}
        {toastMsg && (
          <div
            style={{
              position: 'fixed',
              bottom: 24,
              right: 24,
              background: '#0F172A',
              color: '#fff',
              padding: '12px 20px',
              borderRadius: 14,
              boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
              fontSize: 14,
              fontWeight: 600,
              zIndex: 99999,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              animation: 'admin-pop 0.2s ease',
            }}
          >
            <Sparkles size={16} className="text-amber-400" />
            {toastMsg}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
