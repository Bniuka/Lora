import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { useSubscriptionGuard } from '../hooks/useSubscriptionGuard';
import './dashboard.css';

/* ─── Sparkline SVG (pure, no external deps) ─── */
function Sparkline({ data, colorVar }) {
  const w = 200, h = 54;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const x = (i) => i * w / (data.length - 1);
  const y = (v) => h - 6 - (v - min) / ((max - min) || 1) * (h - 14);
  const pts = data.map((v, i) => `${x(i)},${y(v)}`);
  const line = 'M' + pts.join(' L');
  const area = `${line} L${w},${h} L0,${h}Z`;
  return (
    <svg
      className="ld-spark"
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

/* ─── Inline SVG icons ─── */
function IcPack() {
  return (
    <svg className="ld-ic" viewBox="0 0 24 24">
      <path d="M21 8 12 3 3 8v8l9 5 9-5z" />
      <path d="M3 8l9 5 9-5M12 13v8" />
    </svg>
  );
}
function IcStudents() {
  return (
    <svg className="ld-ic" viewBox="0 0 24 24">
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6" />
    </svg>
  );
}
function IcRevenue() {
  return (
    <svg className="ld-ic" viewBox="0 0 24 24">
      <path d="M12 3v18M16.5 7.5C15.5 6.5 14 6 12 6c-2.5 0-4 1.2-4 3s1.5 2.5 4 3 4 1.2 4 3-1.5 3-4 3c-2 0-3.5-.5-4.5-1.5" />
    </svg>
  );
}
function IcPending() {
  return (
    <svg className="ld-ic" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}
function IcCreate() {
  return (
    <svg className="ld-ic" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}
function IcEnroll() {
  return (
    <svg className="ld-ic" viewBox="0 0 24 24">
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6" />
    </svg>
  );
}
function IcPayout() {
  return (
    <svg className="ld-ic" viewBox="0 0 24 24">
      <path d="M12 3v18M16.5 7.5C15.5 6.5 14 6 12 6c-2.5 0-4 1.2-4 3s1.5 2.5 4 3 4 1.2 4 3-1.5 3-4 3c-2 0-3.5-.5-4.5-1.5" />
    </svg>
  );
}
function IcSettings() {
  return (
    <svg className="ld-ic" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" />
    </svg>
  );
}
function IcBarChart() {
  return (
    <svg className="ld-ic" viewBox="0 0 24 24">
      <path d="M6 20V10M12 20V4M18 20v-7" />
    </svg>
  );
}
function IcActivity() {
  return (
    <svg className="ld-ic" viewBox="0 0 24 24">
      <path d="M3 12h4l3-8 4 16 3-8h4" />
    </svg>
  );
}
function IcLesson() {
  return (
    <svg className="ld-ic" viewBox="0 0 24 24">
      <path d="M3 9l9-5 9 5-9 5z" />
      <path d="M7 11.5V16c3 2 7 2 10 0v-4.5" />
    </svg>
  );
}
function IcClock() {
  return (
    <svg className="ld-ic" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}
function IcZap() {
  return (
    <svg className="ld-ic" viewBox="0 0 24 24">
      <path d="M13 2 4 14h7l-1 8 9-12h-7z" />
    </svg>
  );
}
function IcArrowRight() {
  return (
    <svg className="ld-ic" viewBox="0 0 24 24" style={{ width: 15, height: 15 }}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}
function IcChevRight() {
  return (
    <svg className="ld-ic" style={{ width: 16, height: 16 }} viewBox="0 0 24 24">
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}
function IcCheck() {
  return (
    <svg className="ld-ic" viewBox="0 0 24 24">
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

/* ════════════════ MAIN COMPONENT ════════════════ */
export default function CreatorDashboard() {
  useSubscriptionGuard();
  const { user, profile, creatorProfile } = useAuth();

  const [stats, setStats] = useState({ packs: 0, students: 0, revenue: 0, pending: 0 });
  const [recentPacks, setRecentPacks] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const loadData = async () => {
      const [packsRes, enrollRes, notifRes] = await Promise.all([
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
      ]);

      const packs = packsRes.data || [];
      const enrollments = enrollRes.data || [];
      const confirmed = enrollments.filter(e => e.status === 'confirmed');
      const pending = enrollments.filter(e => e.status === 'pending');
      const revenue = confirmed.reduce((sum, e) => sum + (e.session_packs?.price || 0), 0);

      setStats({ packs: packs.length, students: confirmed.length, revenue, pending: pending.length });
      setRecentPacks(packs);
      setActivity(notifRes.data || []);
      setLoading(false);
    };
    loadData();
  }, [user]);

  /* ── Loading skeleton ── */
  if (loading) {
    return (
      <div className="lora-dash">
        <div className="ld-page">
          <div className="ld-stats">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="ld-card ld-stat" style={{ height: 160, opacity: 0.5, background: '#e3e7f1' }} />
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
    students: [3, 3.6, 3, 4, 3.5, 4.4, 4.2],
    revenue:  [2, 3, 2.6, 3.8, 3.2, 4.4, 5],
    pending:  [5, 4.4, 4.8, 3.8, 4, 3.2, 3],
  };

  const statCards = [
    { key: 'packs',    label: 'Total packs', value: stats.packs,                          colorVar: 'c1', up: true,  icon: <IcPack />,    spark: sparkData.packs },
    { key: 'students', label: 'Students',    value: stats.students,                        colorVar: 'c2', up: true,  icon: <IcStudents />, spark: sparkData.students },
    { key: 'revenue',  label: 'Revenue',     value: `LKR ${stats.revenue.toFixed(0)}`,     colorVar: 'c3', up: true,  icon: <IcRevenue />,  spark: sparkData.revenue },
    { key: 'pending',  label: 'Pending',     value: stats.pending,                         colorVar: 'c4', up: false, icon: <IcPending />,  spark: sparkData.pending },
  ];

  const quickStats = [
    { label: 'Total packs',    value: stats.packs,                      colorVar: 'c1', icon: <IcPack />,     to: '/creator/packs' },
    { label: 'Total students', value: stats.students,                    colorVar: 'c2', icon: <IcStudents />, to: '/creator/enrollments' },
    { label: 'Total revenue',  value: `LKR ${stats.revenue.toFixed(0)}`, colorVar: 'c3', icon: <IcRevenue />,  to: '/creator/enrollments' },
    { label: 'Pending',        value: stats.pending,                     colorVar: 'c4', icon: <IcPending />,  to: '/creator/enrollments' },
  ];

  return (
    <div className="lora-dash">
      <div className="ld-page">

        {/* ── Trial banner ── */}
        <DashTrialBanner creatorProfile={creatorProfile} />

        {/* ── Welcome heading ── */}
        <div className="ld-hello">
          <h1>Welcome back, {firstName}</h1>
          <p>Here's what's happening with your courses today.</p>
        </div>

        {/* ── KPI stat cards ── */}
        <div className="ld-stats">
          {statCards.map(s => (
            <div key={s.key} className="ld-card ld-stat">
              <div className="ld-r">
                <span
                  className="ld-ib"
                  style={{ background: `var(--${s.colorVar}s)`, color: `var(--${s.colorVar})` }}
                >
                  {s.icon}
                </span>
                <div>
                  <small>{s.label}</small>
                  <div className="ld-big">{s.value}</div>
                </div>
              </div>
              <div className="ld-trend">
                <b className={s.up ? 'ld-up' : 'ld-down'}>
                  {s.up ? '↗' : '↘'} 0%
                </b>
                vs last 7 days
              </div>
              <Sparkline data={s.spark} colorVar={s.colorVar} />
            </div>
          ))}
        </div>

        {/* ── Quick-action cards ── */}
        <div className="ld-acts">
          <Link className="ld-card ld-act dark" to="/creator/packs/new">
            <span className="ld-ib"><IcCreate /></span>
            <div>
              <b>Create new pack</b>
              <span>Start a new course pack</span>
            </div>
          </Link>

          <Link className="ld-card ld-act" to="/creator/enrollments">
            <span className="ld-ib" style={{ background: 'var(--c2s)', color: 'var(--c2)' }}>
              <IcEnroll />
            </span>
            <div>
              <b>Manage enrollments</b>
              <span>View &amp; manage your students</span>
            </div>
          </Link>

          <Link className="ld-card ld-act" to="/creator/payouts">
            <span className="ld-ib" style={{ background: 'var(--c3s)', color: 'var(--c3)' }}>
              <IcPayout />
            </span>
            <div>
              <b>View payouts</b>
              <span>Track your earnings</span>
            </div>
          </Link>

          <Link className="ld-card ld-act" to="/creator/settings">
            <span className="ld-ib" style={{ background: 'var(--bg)', color: 'var(--muted)' }}>
              <IcSettings />
            </span>
            <div>
              <b>Settings</b>
              <span>Update your profile &amp; preferences</span>
            </div>
          </Link>
        </div>

        {/* ── Main two-column area ── */}
        <div className="ld-cols">

          {/* ── Recent Packs ── */}
          <section className="ld-card ld-sec">
            <div className="ld-sh">
              <span className="ld-ib"><IcBarChart /></span>
              <div>
                <h2>Recent packs</h2>
                <p>Your latest course packs and their performance.</p>
              </div>
              <Link className="ld-va" to="/creator/packs">
                View all <IcArrowRight />
              </Link>
            </div>

            {latestPack ? (
              <article className="ld-pack">
                {/* Thumbnail */}
                <div className="ld-thumb">
                  {latestPack.thumbnail_url && (
                    <img src={latestPack.thumbnail_url} alt={latestPack.title} />
                  )}
                  <span className={`ld-badge${latestPack.is_published ? '' : ' draft'}`}>
                    {latestPack.is_published ? 'Published' : 'Draft'}
                  </span>
                </div>

                {/* Content */}
                <div className="ld-pb">
                  <h3>{latestPack.title}</h3>
                  <p>{latestPack.description || 'No description provided.'}</p>

                  <div className="ld-meta">
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

                  <div className="ld-pf">
                    <span className="ld-price">
                      {latestPack.currency} {latestPack.price}
                    </span>
                    <Link className="ld-btn" to={`/learner/pack/${latestPack.id}`}>
                      View details <IcArrowRight />
                    </Link>
                  </div>
                </div>
              </article>
            ) : (
              <div className="ld-empty">
                <span className="ld-ib"><IcPack /></span>
                <h3>No packs yet</h3>
                <p>Create your first session pack and start teaching your audience today.</p>
                <Link className="ld-btn-primary" to="/creator/packs/new">
                  <IcCreate /> Create Pack
                </Link>
              </div>
            )}
          </section>

          {/* ── Right column ── */}
          <div className="ld-side">

            {/* Quick Stats */}
            <section className="ld-card ld-sec ld-qs">
              <div className="ld-sh">
                <span className="ld-ib"><IcBarChart /></span>
                <h2>Quick stats</h2>
              </div>

              {quickStats.map((q, i) => (
                <Link key={i} to={q.to || '#'}>
                  <span
                    className="ld-ib"
                    style={{ background: `var(--${q.colorVar}s)`, color: `var(--${q.colorVar})` }}
                  >
                    {q.icon}
                  </span>
                  <span className="ld-qs-label">{q.label}</span>
                  <b className="ld-qs-val">{q.value}</b>
                  <IcChevRight />
                </Link>
              ))}
            </section>

            {/* Recent Activity */}
            <section className="ld-card ld-sec ld-feed">
              <div className="ld-sh">
                <span className="ld-ib"><IcActivity /></span>
                <h2>Recent activity</h2>
                <Link className="ld-va" to="/creator/enrollments">View all</Link>
              </div>

              {activity.length > 0 ? (
                <ul>
                  {activity.map(n => (
                    <li key={n.id}>
                      <span
                        className="ld-ib"
                        style={{ background: 'var(--c3s)', color: 'var(--c3)', width: 38, height: 38 }}
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

      </div>
    </div>
  );
}
