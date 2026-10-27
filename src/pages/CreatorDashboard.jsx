import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { useSubscriptionGuard } from '../hooks/useSubscriptionGuard';
import CreatorWelcomeTour from '../components/CreatorWelcomeTour';
import './dashboard.css';

/* ─── Sparkline SVG (pure, no external deps) ─── */
function Sparkline({ data, colorVar }) {
  const w = 200, h = 54;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const x = (i) => (i * w) / (data.length - 1);
  const y = (v) => h - 6 - ((v - min) / ((max - min) || 1)) * (h - 14);
  const pts = data.map((v, i) => `${x(i)},${y(v)}`);
  const line = 'M' + pts.join(' L');
  const area = `${line} L${w},${h} L0,${h}Z`;
  return (
    <svg
      className="spark"
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path d={area} fill={`var(--${colorVar}s)`} />
      <path
        d={line}
        fill="none"
        stroke={`var(--${colorVar})`}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/* ─── Inline SVG icons matching lora-dashboard-v2.html ─── */
function IcPack() {
  return (
    <svg className="ic" viewBox="0 0 24 24">
      <path d="M21 8 12 3 3 8v8l9 5 9-5z" />
      <path d="M3 8l9 5 9-5M12 13v8" />
    </svg>
  );
}
function IcStudents() {
  return (
    <svg className="ic" viewBox="0 0 24 24">
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6" />
    </svg>
  );
}
function IcRevenue() {
  return (
    <svg className="ic" viewBox="0 0 24 24">
      <path d="M12 3v18M16.5 7.5C15.5 6.5 14 6 12 6c-2.5 0-4 1.2-4 3s1.5 2.5 4 3 4 1.2 4 3-1.5 3-4 3c-2 0-3.5-.5-4.5-1.5" />
    </svg>
  );
}
function IcPending() {
  return (
    <svg className="ic" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}
function IcCreate() {
  return (
    <svg className="ic" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}
function IcEnroll() {
  return (
    <svg className="ic" viewBox="0 0 24 24">
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6" />
    </svg>
  );
}
function IcGuide() {
  return (
    <svg className="ic" viewBox="0 0 24 24">
      <path d="M12 6c-2-1.5-5-2-8-2v13c3 0 6 .5 8 2 2-1.5 5-2 8-2V4c-3 0-6 .5-8 2zM12 6v13" />
    </svg>
  );
}
function IcSettings() {
  return (
    <svg className="ic" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" />
    </svg>
  );
}
function IcBarChart() {
  return (
    <svg className="ic" viewBox="0 0 24 24">
      <path d="M6 20V10M12 20V4M18 20v-7" />
    </svg>
  );
}
function IcActivity() {
  return (
    <svg className="ic" viewBox="0 0 24 24">
      <path d="M3 12h4l3-8 4 16 3-8h4" />
    </svg>
  );
}
function IcLesson() {
  return (
    <svg className="ic" viewBox="0 0 24 24">
      <path d="M3 9l9-5 9 5-9 5z" />
      <path d="M7 11.5V16c3 2 7 2 10 0v-4.5" />
    </svg>
  );
}
function IcClock() {
  return (
    <svg className="ic" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}
function IcZap() {
  return (
    <svg className="ic" viewBox="0 0 24 24">
      <path d="M13 2 4 14h7l-1 8 9-12h-7z" />
    </svg>
  );
}
function IcArrowRight() {
  return (
    <svg className="ic" viewBox="0 0 24 24" style={{ width: 15, height: 15 }}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}
function IcChevRight() {
  return (
    <svg className="ic" style={{ width: 16, height: 16 }} viewBox="0 0 24 24">
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}
function IcCheck() {
  return (
    <svg className="ic" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12 2.5 2.5 4.5-5" />
    </svg>
  );
}

/* ════════════════ TRIAL BANNER ════════════════ */
function DashTrialBanner({ creatorProfile }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (creatorProfile?.subscription_status !== 'trial') return;
    const today = new Date().toISOString().split('T')[0];
    if (localStorage.getItem(`lora_trial_banner_dismissed_${today}`) !== 'true') {
      setVisible(true);
    }
  }, [creatorProfile]);

  if (!visible || creatorProfile?.subscription_status !== 'trial') return null;

  const trialEnds = creatorProfile.trial_ends_at ? new Date(creatorProfile.trial_ends_at) : new Date();
  const daysLeft = Math.max(0, Math.ceil((trialEnds - new Date()) / (1000 * 60 * 60 * 24)));

  const handleDismiss = () => {
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem(`lora_trial_banner_dismissed_${today}`, 'true');
    setVisible(false);
  };

  const cls = daysLeft === 0 ? 'ld-trial danger' : daysLeft <= 7 ? 'ld-trial warn' : 'ld-trial';
  const msg = daysLeft === 0
    ? <>Your trial expires <b>today</b>! Subscribe now to avoid interruption.</>
    : daysLeft <= 7
    ? <>Your free trial ends in <b>{daysLeft} days</b>! Subscribe now to keep your courses live.</>
    : <><b>Free trial active</b> · {daysLeft} days remaining. Enjoying Lora? Subscribe to keep going after your trial.</>;

  return (
    <div className={cls}>
      <span className="ld-dot" />
      <p>{msg}</p>
      <Link to="/creator/settings#plan">Subscribe now</Link>
      <button onClick={handleDismiss} aria-label="Dismiss">×</button>
    </div>
  );
}

/* ════════════════ MISSING RECORDINGS ALERT ════════════════ */
function MissingRecordingsAlert({ missingSessions, onSaveRecording, savingSessionId }) {
  const [inputs, setInputs] = useState({});

  if (!missingSessions || missingSessions.length === 0) return null;

  const handleInputChange = (id, val) => {
    setInputs(prev => ({ ...prev, [id]: val }));
  };

  const handleFormSubmit = (e, id) => {
    e.preventDefault();
    const val = (inputs[id] || '').trim();
    if (!val) return;
    onSaveRecording(id, val);
  };

  return (
    <div className="ld-missing-rec">
      <div className="ld-missing-rec-header">
        <div className="ld-missing-rec-title-group">
          <div className="ld-missing-rec-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M15 10l5-3v10l-5-3v4a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v4z" />
            </svg>
          </div>
          <div>
            <h2 className="ld-missing-rec-title">
              Action Required: Missing Recordings
              <span className="ld-missing-rec-badge">{missingSessions.length} pending</span>
            </h2>
            <p className="ld-missing-rec-desc">
              The following scheduled sessions have ended without a recording link. Upload your recording so learners can watch it.
            </p>
          </div>
        </div>
      </div>

      <div className="ld-missing-rec-list">
        {missingSessions.map(sess => {
          const isSaving = savingSessionId === sess.id;
          const urlVal = inputs[sess.id] ?? '';
          const sched = new Date(sess.scheduled_at);
          const endTime = new Date(sched.getTime() + (sess.duration_minutes || 60) * 60000);

          return (
            <div key={sess.id} className="ld-missing-rec-item">
              <div className="ld-missing-rec-meta">
                <span className="ld-missing-rec-pack">{sess.pack_title}</span>
                <div className="ld-missing-rec-name" title={sess.title}>
                  {sess.title}
                </div>
                <div className="ld-missing-rec-time">
                  <svg className="ic" viewBox="0 0 24 24" style={{ width: 14, height: 14 }}>
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7v5l3 2" />
                  </svg>
                  Ended {formatDistanceToNow(endTime, { addSuffix: true })}
                </div>
              </div>

              <form className="ld-missing-rec-form" onSubmit={(e) => handleFormSubmit(e, sess.id)}>
                <input
                  type="url"
                  className="ld-missing-rec-input"
                  placeholder="Paste recording link (Zoom, YouTube, Drive, Loom...)"
                  value={urlVal}
                  onChange={(e) => handleInputChange(sess.id, e.target.value)}
                  disabled={isSaving}
                  required
                />
                <button
                  type="submit"
                  className="ld-missing-rec-btn"
                  disabled={isSaving || !urlVal.trim()}
                >
                  {isSaving ? (
                    'Saving...'
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" style={{ width: 16, height: 16, fill: 'none', stroke: 'currentColor', strokeWidth: 2 }}>
                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                        <polyline points="17 21 17 13 7 13 7 21"/>
                        <polyline points="7 3 7 8 15 8"/>
                      </svg>
                      Save Recording
                    </>
                  )}
                </button>
              </form>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ════════════════ ONBOARDING CHECKLIST ════════════════ */
function OnboardingChecklist({ steps, onOpenTour, onDismiss }) {
  const completedCount = steps.filter(s => s.done).length;
  const totalCount = steps.length;
  const pct = Math.round((completedCount / totalCount) * 100);

  return (
    <section className="card ld-onboard">
      <div className="ld-onboard-head">
        <div>
          <div className="ld-onboard-badges">
            <span className="ld-onboard-pill">🚀 Creator Setup Guide</span>
            <span className="ld-onboard-count">{completedCount} of {totalCount} completed ({pct}%)</span>
          </div>
          <h2>Get Started on LoraSpace</h2>
          <p>Complete these 4 steps to start enrolling students, accepting direct bank payments, and sharing promo codes.</p>
        </div>

        <div className="ld-onboard-actions">
          <button type="button" className="ld-tour-btn" onClick={onOpenTour}>
            ✨ 1-Min Feature Tour
          </button>
          <Link to="/creator/guide" className="ld-guide-btn">
            📖 Full Creator Guide
          </Link>
          <button
            type="button"
            className="ld-onboard-dismiss"
            onClick={onDismiss}
            title="Hide setup checklist"
            aria-label="Hide setup checklist"
          >
            ×
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="ld-onboard-bar-track">
        <div className="ld-onboard-bar-fill" style={{ width: `${pct}%` }} />
      </div>

      {/* 4 Step Cards */}
      <div className="ld-onboard-grid">
        {steps.map((step, idx) => (
          <div key={step.id} className={`ld-onboard-step ${step.done ? 'done' : ''}`}>
            <div className="ld-onboard-step-top">
              <span className={`ld-onboard-check ${step.done ? 'done' : ''}`}>
                {step.done ? '✓' : idx + 1}
              </span>
              <span className="ld-onboard-status">
                {step.done ? 'Completed' : 'Pending'}
              </span>
            </div>
            <h3>{step.title}</h3>
            <p>{step.desc}</p>
            <Link to={step.to} className="ld-onboard-link">
              {step.done ? step.doneLabel : step.ctaLabel} →
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ════════════════ MAIN COMPONENT ════════════════ */
export default function CreatorDashboard() {
  useSubscriptionGuard();
  const { user, profile, creatorProfile } = useAuth();

  const [stats, setStats] = useState({ packs: 0, students: 0, revenue: 0, pending: 0 });
  const [recentPacks, setRecentPacks] = useState([]);
  const [activity, setActivity] = useState([]);
  const [missingRecordings, setMissingRecordings] = useState([]);
  const [hasBankDetails, setHasBankDetails] = useState(false);
  const [savingSessionId, setSavingSessionId] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tourOpen, setTourOpen] = useState(false);
  const [checklistOpen, setChecklistOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    const dismissed = localStorage.getItem(`lora_onboarding_dismissed_${user.id}`) === 'true';
    setChecklistOpen(!dismissed);

    const seenTour = localStorage.getItem(`lora_welcome_tour_seen_${user.id}`) === 'true';
    if (!seenTour) {
      setTourOpen(true);
    }
  }, [user]);

  const handleCloseTour = () => {
    setTourOpen(false);
    if (user) {
      localStorage.setItem(`lora_welcome_tour_seen_${user.id}`, 'true');
    }
  };

  const handleDismissChecklist = () => {
    setChecklistOpen(false);
    if (user) {
      localStorage.setItem(`lora_onboarding_dismissed_${user.id}`, 'true');
    }
  };

  const handleToggleChecklist = () => {
    setChecklistOpen(prev => {
      const next = !prev;
      if (user) {
        if (next) {
          localStorage.removeItem(`lora_onboarding_dismissed_${user.id}`);
        } else {
          localStorage.setItem(`lora_onboarding_dismissed_${user.id}`, 'true');
        }
      }
      return next;
    });
  };

  useEffect(() => {
    if (!user) return;
    const loadData = async () => {
      const [packsRes, enrollRes, notifRes, bankRes] = await Promise.all([
        supabase
          .from('session_packs')
          .select('*, sessions(count)')
          .eq('creator_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('enrollments')
          .select('*, session_packs!inner(creator_id, price, currency)')
          .eq('session_packs.creator_id', user.id),
        supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('creator_bank_details')
          .select('*')
          .eq('creator_id', user.id)
          .maybeSingle(),
      ]);

      const packs = packsRes.data || [];
      const enrollments = enrollRes.data || [];
      const confirmed = enrollments.filter(e => e.status === 'confirmed' || e.status === 'active');
      const pending = enrollments.filter(e => e.status === 'pending');
      const revenue = confirmed.reduce((sum, e) => sum + (e.session_packs?.price || 0), 0);

      const bankData = bankRes?.data;
      const bankConfigured = Boolean(
        (Array.isArray(bankData?.bank_accounts) && bankData.bank_accounts.some(acc => acc.account_number && acc.bank_name)) ||
        (bankData?.bank_name && bankData?.account_number)
      );
      setHasBankDetails(bankConfigured);

      // Check for past sessions with missing recording_url across all creator's packs
      const packIds = packs.map(p => p.id);
      let missingList = [];
      if (packIds.length > 0) {
        const { data: sessData } = await supabase
          .from('sessions')
          .select('id, title, scheduled_at, duration_minutes, recording_url, order_index, pack_id')
          .in('pack_id', packIds)
          .order('scheduled_at', { ascending: false });

        if (sessData) {
          const now = new Date();
          const packMap = Object.fromEntries(packs.map(p => [p.id, p.title]));
          missingList = sessData.filter(s => {
            if (s.recording_url && s.recording_url.trim()) return false;
            if (!s.scheduled_at) return false;
            const end = new Date(new Date(s.scheduled_at).getTime() + (s.duration_minutes || 60) * 60000);
            return end < now;
          }).map(s => ({
            ...s,
            pack_title: packMap[s.pack_id] || 'Course'
          }));
        }
      }

      setStats({ packs: packs.length, students: confirmed.length, revenue, pending: pending.length });
      setRecentPacks(packs);
      setActivity(notifRes.data || []);
      setMissingRecordings(missingList);
      setLoading(false);
    };
    loadData();
  }, [user]);

  const handleSaveRecording = async (sessionId, recordingUrl) => {
    if (!recordingUrl || !recordingUrl.trim()) return;
    const session = missingRecordings.find(s => s.id === sessionId);
    if (!session) return;

    setSavingSessionId(sessionId);
    try {
      const { error } = await supabase
        .from('sessions')
        .update({ recording_url: recordingUrl.trim() })
        .eq('id', sessionId);

      if (error) throw error;

      // Notify all confirmed enrolled learners for this pack
      try {
        const { data: enrollments } = await supabase
          .from('enrollments')
          .select('learner_id')
          .eq('pack_id', session.pack_id)
          .in('status', ['confirmed', 'active']);

        if (enrollments && enrollments.length > 0) {
          const notifs = enrollments.map(e => ({
            user_id: e.learner_id,
            title: 'Recording Available! 🎥',
            message: `The recording for "${session.title}" in "${session.pack_title}" is now available to watch.`,
          }));
          await supabase.from('notifications').insert(notifs);
        }
      } catch (notifErr) {
        console.warn('Could not dispatch learner notifications:', notifErr);
      }

      setMissingRecordings(prev => prev.filter(s => s.id !== sessionId));
      setToastMsg(`Recording saved for "${session.title}"! Enrolled learners were notified.`);
      setTimeout(() => setToastMsg(null), 5000);
    } catch (err) {
      console.error('Error saving recording:', err);
      alert('Failed to save recording: ' + (err.message || 'Unknown error'));
    } finally {
      setSavingSessionId(null);
    }
  };

  /* ── Loading skeleton ── */
  if (loading) {
    return (
      <div className="lora-dash">
        <div className="page">
          <div className="stats">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="card stat" style={{ height: 160, opacity: 0.5, background: '#e3e7f1' }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const firstName = profile?.first_name || 'Creator';
  const latestPack = recentPacks[0] ?? null;
  const sessionCount = latestPack?.sessions?.[0]?.count ?? 0;

  /* ── Sparkline demo data (7-day trend shape) ── */
  const sparkData = {
    packs:    [3, 4, 3.6, 4.6, 4.2, 5, 5.4],
    students: [3, 3.6, 2.4, 4.4, 3.2, 5, 4.6],
    revenue:  [2, 3, 2.6, 3.8, 3.2, 4.4, 5],
    pending:  [5, 4.4, 4.8, 3.8, 4, 3.2, 3],
  };

  const statCards = [
    { key: 'packs',    t: 't1', label: 'Total packs', value: stats.packs,                          colorVar: 'c1', up: true,  icon: <IcPack />,    spark: sparkData.packs },
    { key: 'students', t: 't2', label: 'Students',    value: stats.students,                        colorVar: 'c2', up: true,  icon: <IcStudents />, spark: sparkData.students },
    { key: 'revenue',  t: 't3', label: 'Revenue',     value: `LKR ${stats.revenue.toFixed(0)}`,     colorVar: 'c3', up: true,  icon: <IcRevenue />,  spark: sparkData.revenue },
    { key: 'pending',  t: 't4', label: 'Pending',     value: stats.pending,                         colorVar: 'c4', up: false, icon: <IcPending />,  spark: sparkData.pending },
  ];

  const quickStats = [
    { label: 'Total packs',    value: stats.packs,                      colorVar: 'c1', icon: <IcPack />,     to: '/creator/packs' },
    { label: 'Total students', value: stats.students,                    colorVar: 'c2', icon: <IcStudents />, to: '/creator/enrollments' },
    { label: 'Total revenue',  value: `LKR ${stats.revenue.toFixed(0)}`, colorVar: 'c3', icon: <IcRevenue />,  to: '/creator/enrollments' },
    { label: 'Pending',        value: stats.pending,                     colorVar: 'c4', icon: <IcPending />,  to: '/creator/enrollments' },
  ];

  const onboardingSteps = [
    {
      id: 'profile',
      title: 'Complete Profile & Bio',
      desc: 'Add your bio, category, and contact number so learners know who you are.',
      done: Boolean(profile?.first_name && (creatorProfile?.about || profile?.contact_number)),
      ctaLabel: 'Complete profile',
      doneLabel: 'Edit profile',
      to: '/creator/settings',
    },
    {
      id: 'payouts',
      title: 'Add Bank Account / Payment Link',
      desc: 'Add up to 4 bank accounts or a payment link so students can pay you directly.',
      done: Boolean(hasBankDetails || creatorProfile?.payment_link),
      ctaLabel: 'Setup payouts',
      doneLabel: 'Manage banks',
      to: '/creator/settings',
    },
    {
      id: 'pack',
      title: 'Create Your First Session Pack',
      desc: 'Schedule live Zoom/YouTube classes or upload past catch-up recordings.',
      done: stats.packs > 0,
      ctaLabel: 'Create pack',
      doneLabel: 'View packs',
      to: '/creator/packs/new',
    },
    {
      id: 'share',
      title: 'Publish & Generate Promo Code',
      desc: 'Publish your course or create a usage-limited free code (LORA-FREE-7X9).',
      done: recentPacks.some(p => p.is_published),
      ctaLabel: 'Publish & promo codes',
      doneLabel: 'Manage promo codes',
      to: latestPack ? `/creator/packs/${latestPack.id}/edit` : '/creator/packs',
    },
  ];

  const completedCount = onboardingSteps.filter(s => s.done).length;

  return (
    <div className="lora-dash">
      <div className="page">

        {/* ── Toast message ── */}
        {toastMsg && (
          <div className="ld-rec-toast" role="alert">
            <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, fill: 'none', stroke: '#12a46f', strokeWidth: 2.5, flex: 'none' }}>
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <span>{toastMsg}</span>
          </div>
        )}

        {/* ── Trial banner ── */}
        <DashTrialBanner creatorProfile={creatorProfile} />

        {/* ── Header / Hello section matching lora-dashboard-v2.html ── */}
        <div className="hello">
          <div>
            <h1>Welcome back, {firstName}</h1>
            <p>Here's what's happening with your courses today.</p>
          </div>

          <div className="hb">
            <button
              type="button"
              className="pill"
              onClick={handleToggleChecklist}
              title={checklistOpen ? "Collapse checklist" : "Open checklist"}
            >
              <span className="ok">
                <svg className="ic" viewBox="0 0 24 24">
                  <path d="m5 12 5 5 9-10" />
                </svg>
              </span>
              Setup checklist ({completedCount}/{onboardingSteps.length})
            </button>

            <button
              type="button"
              className="pill pri"
              onClick={() => setTourOpen(true)}
            >
              <svg className="ic" viewBox="0 0 24 24">
                <path d="m12 3 2.2 5.6L20 9l-4.5 3.8L17 19l-5-3-5 3 1.5-6.2L4 9l5.8-.4z" />
              </svg>
              How LoraSpace works
            </button>

            <Link className="pill" to="/creator/guide">
              <svg className="ic" viewBox="0 0 24 24">
                <rect x="3" y="4" width="18" height="13" rx="2" />
                <path d="M8 21h8M12 17v4" />
              </svg>
              Creator guide
            </Link>
          </div>
        </div>

        {/* ── Interactive Setup Checklist (Collapsible) ── */}
        {checklistOpen && (
          <OnboardingChecklist
            steps={onboardingSteps}
            onOpenTour={() => setTourOpen(true)}
            onDismiss={handleDismissChecklist}
          />
        )}

        {/* ── Missing Recordings Alert Banner ── */}
        <MissingRecordingsAlert
          missingSessions={missingRecordings}
          onSaveRecording={handleSaveRecording}
          savingSessionId={savingSessionId}
        />

        {/* ── 4 Stats Cards matching lora-dashboard-v2.html ── */}
        <div className="stats">
          {statCards.map(s => (
            <div key={s.key} className={`card stat ${s.t}`}>
              <div className="r">
                <span
                  className="ib"
                  style={{
                    background: '#fff',
                    color: `var(--${s.colorVar})`,
                    boxShadow: `0 6px 14px -8px var(--${s.colorVar})`,
                  }}
                >
                  {s.icon}
                </span>
                <div>
                  <small>{s.label}</small>
                  <div className="big">{s.value}</div>
                </div>
              </div>
              <div className="trend">
                <b className={s.up ? 'up' : 'down'}>
                  {s.up ? '↗' : '↘'} 0%
                </b>
                vs last 7 days
              </div>
              <Sparkline data={s.spark} colorVar={s.colorVar} />
            </div>
          ))}
        </div>

        {/* ── Quick-action Cards matching lora-dashboard-v2.html ── */}
        <div className="acts">
          <Link className="card act dark" to="/creator/packs/new">
            <span className="ib"><IcCreate /></span>
            <div>
              <b>Create new pack</b>
              <span>Start a new course pack</span>
            </div>
          </Link>

          <Link className="card act" to="/creator/enrollments">
            <span className="ib" style={{ background: 'var(--c2s)', color: 'var(--c2)' }}>
              <IcEnroll />
            </span>
            <div>
              <b>Manage enrollments</b>
              <span>View &amp; manage your students</span>
            </div>
          </Link>

          <Link className="card act" to="/creator/guide">
            <span className="ib" style={{ background: 'var(--c3s)', color: 'var(--c3)' }}>
              <IcGuide />
            </span>
            <div>
              <b>Creator guide ✨</b>
              <span>Learn all features &amp; promo codes</span>
            </div>
          </Link>

          <Link className="card act" to="/creator/settings">
            <span className="ib" style={{ background: 'var(--soft)', color: 'var(--muted)' }}>
              <IcSettings />
            </span>
            <div>
              <b>Settings &amp; banks</b>
              <span>Update profile &amp; payout accounts</span>
            </div>
          </Link>
        </div>

        {/* ── Two-Column Area matching lora-dashboard-v2.html ── */}
        <div className="cols">

          {/* Left Column: Recent Packs */}
          <section className="card sec">
            <div className="sh">
              <span className="ib"><IcBarChart /></span>
              <div>
                <h2>Recent packs</h2>
                <p>Your latest course packs and their performance.</p>
              </div>
              <Link className="va" to="/creator/packs">
                View all <IcArrowRight />
              </Link>
            </div>

            {latestPack ? (
              <article className="pack">
                <div className="thumb">
                  {latestPack.thumbnail_url && (
                    <img src={latestPack.thumbnail_url} alt={latestPack.title} />
                  )}
                  <span className={`badge${latestPack.is_published ? '' : ' draft'}`}>
                    {latestPack.is_published ? 'Published' : 'Draft'}
                  </span>
                </div>

                <div className="pb">
                  <h3>{latestPack.title}</h3>
                  <p>{latestPack.description || 'No description provided.'}</p>

                  <div className="meta">
                    <span>
                      <IcLesson />
                      {sessionCount} lesson{sessionCount !== 1 ? 's' : ''}
                    </span>
                    <span>
                      <IcClock />
                      Learn at your own pace
                    </span>
                    {latestPack.category && (
                      <span>
                        <IcZap />
                        {latestPack.category}
                      </span>
                    )}
                  </div>

                  <div className="pf">
                    <span className="price">
                      {latestPack.currency} {latestPack.price}
                    </span>
                    <Link className="btn" to={`/learner/pack/${latestPack.id}`}>
                      View details <IcArrowRight />
                    </Link>
                  </div>
                </div>
              </article>
            ) : (
              <div className="empty">
                <span className="ib"><IcPack /></span>
                <h3>No packs yet</h3>
                <p>Create your first session pack and start teaching your audience today.</p>
                <Link
                  className="btn"
                  style={{ background: 'var(--brand)', color: '#fff', border: 0 }}
                  to="/creator/packs/new"
                >
                  <IcCreate /> Create Pack
                </Link>
              </div>
            )}
          </section>

          {/* Right Column: Quick Stats & Recent Activity */}
          <div className="side">

            {/* Quick Stats */}
            <section className="card sec qs">
              <div className="sh">
                <span className="ib"><IcBarChart /></span>
                <h2>Quick stats</h2>
              </div>
              {quickStats.map((q, i) => (
                <Link key={i} to={q.to || '#'}>
                  <span
                    className="ib"
                    style={{ background: `var(--${q.colorVar}s)`, color: `var(--${q.colorVar})` }}
                  >
                    {q.icon}
                  </span>
                  <span>{q.label}</span>
                  <b>{q.value}</b>
                  <IcChevRight />
                </Link>
              ))}
            </section>

            {/* Recent Activity */}
            <section className="card sec">
              <div className="sh">
                <span className="ib"><IcActivity /></span>
                <h2>Recent activity</h2>
                <Link className="va" to="/creator/enrollments">View all</Link>
              </div>

              {activity.length > 0 ? (
                <ul className="feed">
                  {activity.map(n => (
                    <li key={n.id}>
                      <span
                        className="ib"
                        style={{ background: 'var(--c3s)', color: 'var(--c3)' }}
                      >
                        <IcCheck />
                      </span>
                      <div>
                        <b>{n.title}</b>
                        <small>{n.message}</small>
                      </div>
                      <time>
                        {(() => {
                          const diff = Date.now() - new Date(n.created_at).getTime();
                          const mins = Math.floor(diff / 60000);
                          if (mins < 60) return `${mins}m ago`;
                          const hrs = Math.floor(mins / 60);
                          if (hrs < 24) return `${hrs}h ago`;
                          return `${Math.floor(hrs / 24)}d ago`;
                        })()}
                      </time>
                    </li>
                  ))}
                </ul>
              ) : (
                <div style={{ padding: '12px 0', textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>
                  No recent activity yet.
                </div>
              )}
            </section>

          </div>
        </div>

        {/* ── First-Time Welcome Tour Modal ── */}
        <CreatorWelcomeTour isOpen={tourOpen} onClose={handleCloseTour} />

      </div>
    </div>
  );
}
