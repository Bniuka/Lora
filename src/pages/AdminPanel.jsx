import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Crown, Search, Clock, CheckCircle2, AlertCircle, 
  Loader2, Sparkles, X, ShieldAlert, UserCheck, 
  Lock, KeyRound, Eye, EyeOff, ArrowLeft, ShieldCheck,
  ExternalLink, Ban, Play, Tv, 
  AlertTriangle, Unlock
} from 'lucide-react';
import { format, addMonths } from 'date-fns';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { isUserAdmin } from '../lib/admin';
import { getCopyrightAlerts, resolveCopyrightAlert } from '../lib/linkSentinel';
import { getAllReportsForFounder, resolveStudentReport } from '../lib/disputeSystem';
import { PageTransition } from '../components/ui';
import ThemeSwitcher from '../components/ThemeSwitcher';
import './admin-panel.css';

export default function AdminPanel() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // 🔒 Security Verification State (Locked by default on every page load)
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState('');
  const [verifyPassword, setVerifyPassword] = useState('');
  const [showVerifyPassword, setShowVerifyPassword] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState('');

  // 👑 Master Founder Tab Navigation
  const [masterTab, setMasterTab] = useState('subscriptions'); // 'subscriptions', 'copyright', 'disputes'

  // Subscriptions Tab Data State
  const [creators, setCreators] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedCreator, setSelectedCreator] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  // Selected access grant option
  const [preset, setPreset] = useState('6m');
  const [customDate, setCustomDate] = useState('');

  // 🛡️ Copyright Sentinel State
  const [copyrightAlerts, setCopyrightAlerts] = useState([]);
  const [copyrightFilter, setCopyrightFilter] = useState('all'); // 'all', 'pending', 'resolved_banned', 'dismissed'
  const [copyrightSearch, setCopyrightSearch] = useState('');
  const [resolvingAlertId, setResolvingAlertId] = useState(null);
  const [founderNotes] = useState({});

  // ⚖️ Dispute Desk State
  const [disputeReports, setDisputeReports] = useState([]);

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
      
      // Load all founder systems
      fetchCreators();
      fetchCopyrightAlerts();
      fetchDisputes();
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

  const fetchCopyrightAlerts = async () => {
    try {
      const alerts = await getCopyrightAlerts();
      
      // If no alerts exist yet, seed a realistic sample demonstration alert so the founder can inspect and test immediately
      if (alerts.length === 0) {
        const demoAlert = {
          id: 'cpr_sample_demo_01',
          status: 'pending',
          created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
          fingerprint: 'zoom:84920391823',
          media_type: 'zoom',
          slot: 'live',
          original_creator_id: 'sample_orig_user_1',
          original_creator_name: 'Dr. Nimal Senanayake (Master Physics)',
          original_creator_email: 'nimal.physics.al@gmail.com',
          original_pack_id: 'pack_sample_orig_1',
          original_pack_title: '2026 Combined Maths & Physics Theory Masterclass',
          original_session_title: 'Session 04: Advanced Mechanics & Light Vectors (Live)',
          original_url: 'https://us04web.zoom.us/j/84920391823?pwd=loraPhysicsLivePasscode123',
          original_registered_at: new Date(Date.now() - 86400000 * 6).toISOString(),
          copier_creator_id: 'sample_copier_user_2',
          copier_creator_name: 'Kasun Tutorials Online',
          copier_creator_email: 'kasun.tuition.lk@gmail.com',
          copier_pack_id: 'pack_sample_copier_2',
          copier_pack_title: 'Quick Physics Pass Booster 2026',
          copier_session_title: 'Unit 4 Live Stream Class',
          copier_url: 'https://us04web.zoom.us/j/84920391823?pwd=loraPhysicsLivePasscode123',
          resolution_notes: null,
          resolved_at: null,
        };
        setCopyrightAlerts([demoAlert]);
      } else {
        setCopyrightAlerts(alerts);
      }
    } catch (err) {
      console.error("Error loading copyright alerts:", err);
    }
  };

  const fetchDisputes = async () => {
    try {
      const list = await getAllReportsForFounder();
      setDisputeReports(list);
    } catch (err) {
      console.error("Error loading disputes:", err);
    }
  };

  // 🛡️ Founder Copyright Enforcement Handler
  const handleCopyrightAction = async (alertId, action) => {
    setResolvingAlertId(alertId);
    try {
      const note = founderNotes[alertId] || (action === 'ban_pack' ? 'Confirmed copyright infringement. Offending pack banned and delisted.' : 'Dismissed by Founder.');
      
      await resolveCopyrightAlert({
        alertId,
        action,
        notes: note,
        founderEmail: user?.email,
      });

      if (action === 'ban_pack') {
        showToast("🚨 Offending Pack BANNED! Resolution notice sent to Original Creator.");
      } else {
        showToast("Alert dismissed as authorized.");
      }

      // Refresh alerts
      await fetchCopyrightAlerts();
    } catch (err) {
      showToast("Action failed: " + err.message);
    } finally {
      setResolvingAlertId(null);
    }
  };

  // ⚖️ Founder Dispute Resolution Handler
  const handleResolveDispute = async (reportId, status) => {
    try {
      await resolveStudentReport({
        reportId,
        resolutionStatus: status,
        notes: `Reviewed and marked as ${status} by Founder.`,
        actorEmail: user?.email,
      });
      showToast(`Dispute marked as ${status}!`);
      await fetchDisputes();
    } catch (e) {
      showToast("Failed to resolve dispute.");
    }
  };

  // Quick stats calculation for creators
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
  const filteredCreators = creators.filter(c => {
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

  // Filter copyright alerts
  const filteredCopyrightAlerts = copyrightAlerts.filter(a => {
    if (copyrightFilter === 'pending' && a.status !== 'pending') return false;
    if (copyrightFilter === 'banned' && a.status !== 'resolved_banned') return false;
    if (copyrightFilter === 'dismissed' && a.status !== 'dismissed') return false;

    if (copyrightSearch.trim()) {
      const q = copyrightSearch.toLowerCase();
      const orig = (a.original_creator_name || '').toLowerCase();
      const copy = (a.copier_creator_name || '').toLowerCase();
      const pack = (a.copier_pack_title || '').toLowerCase();
      const fp = (a.fingerprint || '').toLowerCase();
      return orig.includes(q) || copy.includes(q) || pack.includes(q) || fp.includes(q);
    }
    return true;
  });

  const pendingAlertsCount = copyrightAlerts.filter(a => a.status === 'pending').length;
  const openDisputesCount = disputeReports.filter(d => d.status === 'open').length;

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

      if (actionType === '1m') {
        targetDate = addMonths(new Date(), 1);
      } else if (actionType === '3m') {
        targetDate = addMonths(new Date(), 3);
      } else if (actionType === '6m') {
        targetDate = addMonths(new Date(), 6);
      } else if (actionType === '10m') {
        targetDate = addMonths(new Date(), 10);
      } else if (actionType === '1y') {
        targetDate = addMonths(new Date(), 12);
      } else if (actionType === 'lifetime') {
        targetDate = null;
      } else if (actionType === 'custom') {
        if (!customDate) throw new Error("Please select a valid custom date");
        targetDate = new Date(customDate);
      } else if (actionType === 'revoke') {
        newStatus = 'expired';
        targetDate = new Date(Date.now() - 86400000);
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
          ? 'You have been awarded Lifetime VIP Founder Access to LoraSpace! Enjoy unlimited features forever.'
          : `You have been awarded complimentary creator access! Valid through ${format(targetDate, 'MMM dd, yyyy')}.`,
        is_read: false,
      });

      showToast(`Updated access for ${selectedCreator.first_name || 'creator'}`);
      setSelectedCreator(null);
      fetchCreators();
    } catch (err) {
      console.error("Error updating access:", err);
      showToast("Failed to update access: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // 🔒 Locked View
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

            <form onSubmit={handleUnlock} className="lora-admin-lock-form" autoComplete="off" noValidate>
              <input type="text" name="decoy_username" tabIndex={-1} style={{ display: 'none' }} aria-hidden="true" autoComplete="off" />
              <input type="password" name="decoy_password" tabIndex={-1} style={{ display: 'none' }} aria-hidden="true" autoComplete="off" />

              <div className="lora-admin-lock-field">
                <label htmlFor="sec-fd-user">Founder Email Address</label>
                <input
                  id="sec-fd-user"
                  name="sec_fd_user"
                  type="email"
                  required
                  placeholder="Enter founder email"
                  autoComplete="new-password"
                  value={verifyEmail}
                  onChange={e => setVerifyEmail(e.target.value)}
                />
              </div>

              <div className="lora-admin-lock-field pw-field">
                <label htmlFor="sec-fd-pass">Password</label>
                <input
                  id="sec-fd-pass"
                  name="sec_fd_pass"
                  type={showVerifyPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter password"
                  autoComplete="new-password"
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
              Founder Access & Sentinel Desk
              <span className="founder-badge">Founder Mode</span>
            </h1>
            <p>Master control for subscriptions, live link copyright protection, and student disputes.</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ThemeSwitcher size="sm" />
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

        {/* Master Navigation Tabs */}
        <div className="lora-admin-master-tabs">
          <button
            type="button"
            className={masterTab === 'subscriptions' ? 'active' : ''}
            onClick={() => setMasterTab('subscriptions')}
          >
            <Crown size={16} /> Creator Subscriptions & Access
          </button>
          <button
            type="button"
            className={masterTab === 'copyright' ? 'active' : ''}
            onClick={() => { setMasterTab('copyright'); fetchCopyrightAlerts(); }}
          >
            <ShieldAlert size={16} /> Copyright & Content Sentinel
            {pendingAlertsCount > 0 && (
              <span className="founder-tab-badge alert">{pendingAlertsCount} Active</span>
            )}
          </button>
          <button
            type="button"
            className={masterTab === 'disputes' ? 'active' : ''}
            onClick={() => { setMasterTab('disputes'); fetchDisputes(); }}
          >
            <AlertTriangle size={16} /> Student Disputes & SOS
            {openDisputesCount > 0 && (
              <span className="founder-tab-badge warning">{openDisputesCount}</span>
            )}
          </button>
        </div>

        {/* ══════════════ TAB 1: SUBSCRIPTIONS & ACCESS ══════════════ */}
        {masterTab === 'subscriptions' && (
          <div>
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
            ) : filteredCreators.length === 0 ? (
              <div className="p-16 text-center text-gray-500 bg-white border border-gray-200 rounded-2xl">
                <UserCheck className="w-10 h-10 mx-auto mb-2 text-gray-400" />
                <p className="font-semibold">No creators found matching this filter.</p>
              </div>
            ) : (
              <div className="lora-admin-list">
                {filteredCreators.map(c => {
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
          </div>
        )}

        {/* ══════════════ TAB 2: COPYRIGHT & CONTENT SENTINEL ══════════════ */}
        {masterTab === 'copyright' && (
          <div className="sentinel-container">
            {/* KPI Summary Cards */}
            <div className="sentinel-kpi-grid">
              <div className="sentinel-kpi red">
                <div className="kpi-top">
                  <small>Active Link Infringements</small>
                  <ShieldAlert size={18} className="text-red-500" />
                </div>
                <b>{copyrightAlerts.filter(a => a.status === 'pending').length}</b>
                <span>Awaiting manual founder verification</span>
              </div>

              <div className="sentinel-kpi dark">
                <div className="kpi-top">
                  <small>Infringing Packs Banned</small>
                  <Ban size={18} className="text-gray-900" />
                </div>
                <b>{copyrightAlerts.filter(a => a.status === 'resolved_banned').length}</b>
                <span>Delisted & original creators protected</span>
              </div>

              <div className="sentinel-kpi green">
                <div className="kpi-top">
                  <small>Legitimate / Dismissed</small>
                  <CheckCircle2 size={18} className="text-emerald-500" />
                </div>
                <b>{copyrightAlerts.filter(a => a.status === 'dismissed').length}</b>
                <span>Approved co-instructor sharing</span>
              </div>
            </div>

            {/* Toolbar */}
            <div className="lora-admin-toolbar">
              <div className="lora-admin-search">
                <Search className="ic" />
                <input
                  type="text"
                  placeholder="Search by creator, pack, or meeting ID…"
                  value={copyrightSearch}
                  onChange={e => setCopyrightSearch(e.target.value)}
                />
              </div>

              <div className="lora-admin-tabs">
                {[
                  { id: 'all', label: `All Alerts (${copyrightAlerts.length})` },
                  { id: 'pending', label: `Pending Review (${copyrightAlerts.filter(a => a.status === 'pending').length})` },
                  { id: 'banned', label: `Banned Packs (${copyrightAlerts.filter(a => a.status === 'resolved_banned').length})` },
                  { id: 'dismissed', label: `Dismissed (${copyrightAlerts.filter(a => a.status === 'dismissed').length})` },
                ].map(tab => (
                  <button
                    key={tab.id}
                    className={copyrightFilter === tab.id ? 'active' : ''}
                    onClick={() => setCopyrightFilter(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Alerts List */}
            {filteredCopyrightAlerts.length === 0 ? (
              <div className="p-16 text-center text-gray-500 bg-white border border-gray-200 rounded-2xl">
                <ShieldCheck className="w-12 h-12 mx-auto mb-3 text-emerald-500" />
                <h3 className="font-bold text-gray-800 text-lg">Platform Links Protected</h3>
                <p className="text-sm text-gray-500">No duplicate Zoom/YouTube live or recording links detected under this filter.</p>
              </div>
            ) : (
              <div className="sentinel-alert-cards">
                {filteredCopyrightAlerts.map(alert => (
                  <div key={alert.id} className={`sentinel-card ${alert.status}`}>
                    {/* Alert Card Header */}
                    <div className="sentinel-card-hd">
                      <div className="sentinel-title-wrap">
                        <span className={`sentinel-status-badge ${alert.status}`}>
                          {alert.status === 'pending' && '🚨 Pending Manual Verification'}
                          {alert.status === 'resolved_banned' && '🚫 PACK BANNED & DELISTED'}
                          {alert.status === 'dismissed' && '✅ Approved / Co-Teacher'}
                        </span>
                        <h4>
                          Live Link Duplication Alert · <code className="fp-code">{alert.fingerprint}</code>
                        </h4>
                      </div>
                      <span className="sentinel-timestamp">
                        Detected: {new Date(alert.created_at).toLocaleString()}
                      </span>
                    </div>

                    {/* DUAL UNLOCKED COMPARISON SCREEN */}
                    <div className="sentinel-compare-grid">
                      {/* ORIGINAL CREATOR (OWNER) */}
                      <div className="compare-col owner">
                        <div className="col-tag">
                          <ShieldCheck size={14} />
                          Original Creator (First Claim)
                        </div>
                        <div className="creator-details">
                          <b>{alert.original_creator_name}</b>
                          <small>{alert.original_creator_email}</small>
                        </div>
                        <div className="pack-details">
                          <label>Pack Title:</label>
                          <span>{alert.original_pack_title}</span>
                        </div>
                        <div className="session-details">
                          <label>Session Title:</label>
                          <span>{alert.original_session_title}</span>
                        </div>
                        <div className="link-unlocked-box">
                          <div className="unlocked-lbl">
                            <Unlock size={13} className="text-emerald-600" />
                            <span>Original Link (Unlocked for Founder)</span>
                          </div>
                          <code className="stream-url">{alert.original_url}</code>
                          <a
                            href={alert.original_url}
                            target="_blank"
                            rel="noreferrer"
                            className="btn-test-stream"
                          >
                            <Play size={13} />
                            Test / Watch Original Stream
                            <ExternalLink size={12} />
                          </a>
                        </div>
                      </div>

                      {/* ALLEGED COPIER */}
                      <div className="compare-col copier">
                        <div className="col-tag warning">
                          <AlertTriangle size={14} />
                          Alleged Copier (Flagged Attempt)
                        </div>
                        <div className="creator-details">
                          <b>{alert.copier_creator_name}</b>
                          <small>{alert.copier_creator_email}</small>
                        </div>
                        <div className="pack-details">
                          <label>Infringing Pack:</label>
                          <span>{alert.copier_pack_title}</span>
                        </div>
                        <div className="session-details">
                          <label>Flagged Session:</label>
                          <span>{alert.copier_session_title}</span>
                        </div>
                        <div className="link-unlocked-box warning">
                          <div className="unlocked-lbl">
                            <Unlock size={13} className="text-amber-600" />
                            <span>Flagged Link (Unlocked for Founder)</span>
                          </div>
                          <code className="stream-url">{alert.copier_url}</code>
                          <a
                            href={alert.copier_url}
                            target="_blank"
                            rel="noreferrer"
                            className="btn-test-stream warning"
                          >
                            <Tv size={13} />
                            Test / Watch Copied Stream
                            <ExternalLink size={12} />
                          </a>
                        </div>
                      </div>
                    </div>

                    {/* ENFORCEMENT & RESOLUTION ACTIONS */}
                    <div className="sentinel-card-actions">
                      {alert.status === 'pending' ? (
                        <div className="sentinel-action-buttons">
                          <button
                            type="button"
                            className="btn-ban-pack"
                            disabled={resolvingAlertId === alert.id}
                            onClick={() => handleCopyrightAction(alert.id, 'ban_pack')}
                          >
                            {resolvingAlertId === alert.id ? (
                              <Loader2 size={15} className="animate-spin" />
                            ) : (
                              <Ban size={15} />
                            )}
                            Confirm Copyright Theft & Ban Pack
                          </button>

                          <button
                            type="button"
                            className="btn-dismiss-alert"
                            disabled={resolvingAlertId === alert.id}
                            onClick={() => handleCopyrightAction(alert.id, 'dismiss')}
                          >
                            <CheckCircle2 size={15} />
                            Dismiss (Legitimate Co-Instructor)
                          </button>
                        </div>
                      ) : (
                        <div className="sentinel-resolved-banner">
                          <CheckCircle2 size={16} />
                          <span>
                            {alert.status === 'resolved_banned'
                              ? `Infringing pack was BANNED. Reassurance message automatically delivered to ${alert.original_creator_name}.`
                              : 'Dismissed as legitimate by Founder.'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══════════════ TAB 3: PLATFORM DISPUTE & SOS MONITOR ══════════════ */}
        {masterTab === 'disputes' && (
          <div className="sentinel-container">
            <div className="sentinel-kpi-grid">
              <div className="sentinel-kpi red">
                <div className="kpi-top">
                  <small>Open Student Disputes</small>
                  <AlertCircle size={18} className="text-red-500" />
                </div>
                <b>{disputeReports.filter(d => d.status === 'open').length}</b>
                <span>Awaiting creator/founder resolution</span>
              </div>
              <div className="sentinel-kpi green">
                <div className="kpi-top">
                  <small>Resolved Disputes</small>
                  <CheckCircle2 size={18} className="text-emerald-500" />
                </div>
                <b>{disputeReports.filter(d => d.status === 'resolved').length}</b>
                <span>Successfully settled</span>
              </div>
            </div>

            {disputeReports.length === 0 ? (
              <div className="p-16 text-center text-gray-500 bg-white border border-gray-200 rounded-2xl">
                <ShieldCheck className="w-12 h-12 mx-auto mb-3 text-emerald-500" />
                <h3 className="font-bold text-gray-800 text-lg">No Active Disputes</h3>
                <p className="text-sm text-gray-500">All student slip appeals and live classroom links are running smoothly.</p>
              </div>
            ) : (
              <div className="disputes-list">
                {disputeReports.map(rep => (
                  <div key={rep.id} className="dispute-card">
                    <div className="dispute-card-hd">
                      <span className="dispute-type-pill" data-type={rep.report_type}>
                        {rep.report_type === 'live_sos' ? '🚨 Live SOS' : rep.report_type === 'slip_appeal' ? '🏦 Slip Appeal' : '⚠️ Issue'}
                      </span>
                      <span className="dispute-time">{new Date(rep.created_at).toLocaleString()}</span>
                    </div>
                    <div className="dispute-body">
                      <h5>{rep.pack_title} · {rep.session_title}</h5>
                      <p className="dispute-desc">"{rep.issue_details}"</p>
                      {rep.bank_ref_number && (
                        <div className="dispute-ref-box">
                          <span>Bank Reference: <b>{rep.bank_ref_number}</b></span>
                        </div>
                      )}
                      <div className="dispute-student-meta">
                        <span>Student: <b>{rep.student_name}</b> ({rep.student_email})</span>
                      </div>
                    </div>
                    <div className="dispute-footer">
                      <span className={`status-pill ${rep.status}`}>{rep.status.toUpperCase()}</span>
                      {rep.status === 'open' && (
                        <button
                          type="button"
                          className="btn-resolve"
                          onClick={() => handleResolveDispute(rep.id, 'resolved')}
                        >
                          <CheckCircle2 size={13} /> Founder Override: Mark Resolved
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
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
