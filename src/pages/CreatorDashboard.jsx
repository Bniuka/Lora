import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Package, DollarSign, Users, Clock, PlusCircle, Sparkles,
  TrendingUp, TrendingDown, ArrowRight, Settings, CheckCircle,
  GraduationCap, ChevronRight, BarChart2, Zap, Activity
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { PageTransition, Skeleton } from '../components/ui';
import { useSubscriptionGuard } from '../hooks/useSubscriptionGuard';
import TrialBanner from '../components/TrialBanner';

/* ─── Sparkline SVG ─── */
function Sparkline({ color, up }) {
  const path = up
    ? 'M0,14 C10,12 20,8 30,10 C40,12 50,4 60,6 C70,8 80,4 90,2 L90,18 L0,18Z'
    : 'M0,4 C10,6 20,10 30,8 C40,6 50,14 60,12 C70,10 80,14 90,16 L90,18 L0,18Z';
  const line = up
    ? 'M0,14 C10,12 20,8 30,10 C40,12 50,4 60,6 C70,8 80,4 90,2'
    : 'M0,4 C10,6 20,10 30,8 C40,6 50,14 60,12 C70,10 80,14 90,16';
  return (
    <svg viewBox="0 0 90 18" className="w-full" style={{ height: 36 }} preserveAspectRatio="none">
      <path d={path} fill={color} fillOpacity="0.08" />
      <path d={line} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ─── KPI Card ─── */
function KpiCard({ icon: Icon, label, value, iconBg, iconColor, sparkColor, up = true }) {
  return (
    <div
      className="bg-white rounded-2xl flex flex-col"
      style={{
        border: '1px solid #E8EDF3',
        boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
        padding: '22px 22px 18px',
        minHeight: 155,
      }}
    >
      {/* top row: icon + label + value */}
      <div className="flex items-start gap-3 mb-4">
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: iconBg }}
        >
          <Icon size={19} color={iconColor} />
        </div>
        <div>
          <p className="text-[12.5px] font-medium text-[#64748B] leading-none mb-1.5">{label}</p>
          <p className="text-[28px] font-bold text-[#0F172A] leading-none tracking-tight">{value}</p>
        </div>
      </div>

      {/* trend row */}
      <div className="flex items-center gap-1.5 mb-3">
        {up
          ? <TrendingUp size={13} color="#16A34A" />
          : <TrendingDown size={13} color="#DC2626" />
        }
        <span style={{ color: up ? '#16A34A' : '#DC2626' }} className="text-[12px] font-semibold">0%</span>
        <span className="text-[11.5px] text-[#94A3B8] font-normal">vs last 7 days</span>
      </div>

      {/* sparkline */}
      <div className="mt-auto">
        <Sparkline color={sparkColor} up={up} />
      </div>
    </div>
  );
}

/* ─── Quick-action card ─── */
function ActionCard({ to, icon: Icon, iconBg, iconColor, title, subtitle, primary }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-4 rounded-2xl transition-all hover:-translate-y-0.5 group"
      style={{
        background: primary ? '#0F172A' : 'white',
        border: primary ? 'none' : '1px solid #E8EDF3',
        boxShadow: primary
          ? '0 4px 14px rgba(15,23,42,0.18)'
          : '0 1px 4px rgba(0,0,0,0.05)',
        padding: '18px 20px',
      }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: primary ? 'rgba(255,255,255,0.12)' : iconBg }}
      >
        <Icon size={18} color={primary ? 'white' : iconColor} />
      </div>
      <div>
        <p className={`text-[13.5px] font-semibold leading-tight ${primary ? 'text-white' : 'text-[#0F172A]'}`}>{title}</p>
        <p className={`text-[11.5px] mt-0.5 leading-tight ${primary ? 'text-[#94A3B8]' : 'text-[#64748B]'}`}>{subtitle}</p>
      </div>
    </Link>
  );
}

/* ─── Quick stats row ─── */
function StatRow({ icon: Icon, iconBg, iconColor, label, value, last }) {
  return (
    <div className={`flex items-center justify-between py-3.5 ${!last ? 'border-b border-[#F1F5F9]' : ''}`}>
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: iconBg }}>
          <Icon size={14} color={iconColor} />
        </div>
        <span className="text-[13px] font-medium text-[#475569]">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[14px] font-bold text-[#0F172A]">{value}</span>
        <ChevronRight size={13} className="text-[#CBD5E1]" />
      </div>
    </div>
  );
}

/* ════════════════ MAIN COMPONENT ════════════════ */
export default function CreatorDashboard() {
  useSubscriptionGuard();
  const { user, profile } = useAuth();
  const [stats, setStats] = useState({ packs: 0, students: 0, revenue: 0, pending: 0 });
  const [recentPacks, setRecentPacks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const loadData = async () => {
      const [packsRes, enrollRes] = await Promise.all([
        supabase
          .from('session_packs')
          .select('*, sessions(count)')
          .eq('creator_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('enrollments')
          .select('*, session_packs!inner(creator_id, price, currency)')
          .eq('session_packs.creator_id', user.id),
      ]);

      const packs = packsRes.data || [];
      const enrollments = enrollRes.data || [];
      const confirmed = enrollments.filter(e => e.status === 'confirmed');
      const pending = enrollments.filter(e => e.status === 'pending');
      const revenue = confirmed.reduce((sum, e) => sum + (e.session_packs?.price || 0), 0);

      setStats({ packs: packs.length, students: confirmed.length, revenue, pending: pending.length });
      setRecentPacks(packs);
      setLoading(false);
    };
    loadData();
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-5" style={{ fontFamily: "'Inter', sans-serif" }}>
        <Skeleton className="h-44 w-full rounded-2xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  const firstName = profile?.first_name || 'Creator';
  const latestPack = recentPacks[0] ?? null;
  const sessionCount = latestPack?.sessions?.[0]?.count ?? 0;

  return (
    <PageTransition>
      <div style={{ fontFamily: "'Inter', sans-serif" }} className="space-y-6">
        <TrialBanner />

        {/* ══════════ HERO BANNER ══════════ */}
        <div
          className="relative rounded-2xl overflow-hidden flex flex-col md:flex-row"
          style={{
            background: 'linear-gradient(120deg, #F0F5FF 0%, #E8EFFE 40%, #DCE8FD 100%)',
            border: '1px solid #DBEAFE',
            minHeight: 200,
          }}
        >
          {/* LEFT content */}
          <div className="relative z-10 flex flex-col justify-between p-8 md:p-10 md:w-[55%]">
            <div>
              <h1
                className="text-[28px] md:text-[34px] font-extrabold text-[#0F172A] leading-tight mb-3"
                style={{ letterSpacing: '-0.5px' }}
              >
                <span className="mr-2">👋</span>Welcome back, {firstName}
              </h1>
              <p className="text-[14px] text-[#475569] leading-relaxed max-w-[420px] mb-6">
                Keep creating, teaching and making an impact. Your journey as a creator is just getting bigger.
              </p>
            </div>

            {/* Info pills */}
            <div className="flex flex-wrap gap-2.5">
              {[
                { icon: Sparkles, label: 'Creator', sub: 'Since Apr 2025', bg: '#EFF6FF', c: '#1D4ED8' },
                { icon: Users, label: 'Your audience', sub: 'Growing daily', bg: '#F5F3FF', c: '#7C3AED' },
                { icon: TrendingUp, label: 'Next goal', sub: 'Reach 100+ students', bg: '#F0FDF4', c: '#16A34A' },
              ].map(({ icon: Icon, label, sub, bg, c }) => (
                <div
                  key={label}
                  className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5"
                  style={{ background: 'rgba(255,255,255,0.82)', border: '1px solid rgba(255,255,255,0.7)', backdropFilter: 'blur(8px)', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
                >
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
                    <Icon size={14} color={c} />
                  </div>
                  <div>
                    <p className="text-[12.5px] font-semibold text-[#0F172A] leading-none">{label}</p>
                    <p className="text-[11px] text-[#64748B] leading-none mt-0.5">{sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT image + quote */}
          <div className="hidden md:flex md:w-[45%] items-end justify-end relative overflow-hidden">
            {/* quote */}
            <div className="absolute top-6 right-6 text-right z-10">
              <p
                className="text-[15px] font-semibold text-[#1E3A8A] leading-snug italic"
                style={{ fontFamily: 'Georgia, serif', opacity: 0.8 }}
              >
                " Great creators<br />build a better future. "
              </p>
            </div>

            {/* illustration */}
            <img
              src="/banner_illustration.png"
              alt="Creator workspace"
              className="w-full h-full object-cover object-right-top"
              style={{ maxHeight: 220, opacity: 0.95 }}
              onError={e => { e.currentTarget.style.display = 'none'; }}
            />

            {/* fade overlay on left edge of image */}
            <div className="absolute inset-y-0 left-0 w-24 pointer-events-none"
              style={{ background: 'linear-gradient(to right, #E8EFFE, transparent)' }} />
          </div>
        </div>

        {/* ══════════ KPI CARDS ══════════ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard icon={Package}    label="Total Packs" value={stats.packs}                   iconBg="#EFF6FF" iconColor="#2563EB" sparkColor="#2563EB" up />
          <KpiCard icon={Users}      label="Students"    value={stats.students}                 iconBg="#F5F3FF" iconColor="#7C3AED" sparkColor="#7C3AED" up />
          <KpiCard icon={DollarSign} label="Revenue"     value={`$${stats.revenue.toFixed(0)}`} iconBg="#F0FDF4" iconColor="#16A34A" sparkColor="#16A34A" up />
          <KpiCard icon={Clock}      label="Pending"     value={stats.pending}                  iconBg="#FFF7ED" iconColor="#EA580C" sparkColor="#EA580C" up={false} />
        </div>

        {/* ══════════ QUICK ACTIONS ══════════ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <ActionCard to="/creator/packs/new"    icon={PlusCircle} iconBg="#EFF6FF" iconColor="#2563EB" title="Create New Pack"      subtitle="Start a new course pack"            primary />
          <ActionCard to="/creator/enrollments"  icon={Users}      iconBg="#F5F3FF" iconColor="#7C3AED" title="Manage Enrollments"   subtitle="View & manage your students" />
          <ActionCard to="/creator/dashboard"    icon={DollarSign} iconBg="#F0FDF4" iconColor="#16A34A" title="View Payouts"         subtitle="Track your earnings" />
          <ActionCard to="/creator/settings"     icon={Settings}   iconBg="#F1F5F9" iconColor="#475569" title="Settings"            subtitle="Update your profile & preferences" />
        </div>

        {/* ══════════ BOTTOM: RECENT PACKS + RIGHT COLUMN ══════════ */}
        <div className="grid lg:grid-cols-[1fr_300px] xl:grid-cols-[1fr_320px] gap-4 items-start">

          {/* ── Recent Packs ── */}
          <div>
            {/* Section header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <BarChart2 size={18} className="text-[#64748B]" />
                <div>
                  <h2 className="text-[15px] font-bold text-[#0F172A] leading-tight">Recent Packs</h2>
                  <p className="text-[12px] text-[#64748B] leading-tight">Your latest course packs and their performance.</p>
                </div>
              </div>
              <Link
                to="/creator/packs"
                className="text-[12.5px] font-semibold text-[#2563EB] hover:text-[#1D4ED8] flex items-center gap-1 transition-colors"
              >
                View All <ArrowRight size={13} />
              </Link>
            </div>

            {latestPack ? (
              <div
                className="bg-white rounded-2xl overflow-hidden flex flex-col md:flex-row"
                style={{ border: '1px solid #E8EDF3', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}
              >
                {/* Thumbnail */}
                <div className="md:w-[260px] md:flex-shrink-0 relative" style={{ minHeight: 180 }}>
                  {latestPack.thumbnail_url ? (
                    <img
                      src={latestPack.thumbnail_url}
                      alt={latestPack.title}
                      className="w-full h-full object-cover"
                      style={{ minHeight: 180 }}
                    />
                  ) : (
                    <div className="w-full h-full bg-[#1E293B] flex items-center justify-center" style={{ minHeight: 180 }}>
                      <Package size={40} className="text-white/20" />
                    </div>
                  )}
                  {/* Published badge overlay */}
                  {latestPack.is_published && (
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-lg">
                      <span className="w-2 h-2 rounded-full bg-[#16A34A]" />
                      <span className="text-[11.5px] font-semibold text-[#16A34A]">Published</span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col justify-between p-6">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11.5px] font-semibold ${
                        latestPack.is_published
                          ? 'bg-[#F0FDF4] text-[#16A34A]'
                          : 'bg-[#FEF3C7] text-[#D97706]'
                      }`}>
                        <CheckCircle size={11} />
                        {latestPack.is_published ? 'Published' : 'Draft'}
                      </span>
                    </div>

                    <h3 className="text-[19px] font-bold text-[#0F172A] leading-snug mb-2">
                      {latestPack.title}
                    </h3>
                    <p className="text-[13px] text-[#64748B] leading-relaxed mb-4 line-clamp-2">
                      {latestPack.description || 'Learn practical ways to master the topic. This course covers real strategies, tools and step-by-step methods.'}
                    </p>

                    {/* Meta row */}
                    <div className="flex flex-wrap items-center gap-4 text-[12.5px] text-[#475569]">
                      <span className="flex items-center gap-1.5">
                        <GraduationCap size={14} className="text-[#94A3B8]" />
                        {sessionCount} lessons
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock size={14} className="text-[#94A3B8]" />
                        Learn at your own pace
                      </span>
                      {latestPack.category && (
                        <span className="flex items-center gap-1.5">
                          <Zap size={14} className="text-[#94A3B8]" />
                          {latestPack.category}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Price + CTA */}
                  <div className="flex items-center justify-between mt-5 pt-4 border-t border-[#F1F5F9]">
                    <p className="text-[20px] font-extrabold text-[#2563EB] tracking-tight">
                      {latestPack.currency} {latestPack.price}
                    </p>
                    <Link
                      to={`/creator/packs/edit/${latestPack.id}`}
                      className="flex items-center gap-2 text-[13px] font-semibold text-[#2563EB] border border-[#BFDBFE] rounded-full px-5 py-2 hover:bg-[#EFF6FF] transition-colors"
                    >
                      View Details <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              /* Empty state */
              <div
                className="bg-white rounded-2xl p-8 flex flex-col items-center justify-center text-center"
                style={{ border: '1.5px dashed #CBD5E1' }}
              >
                <Package size={36} className="text-[#CBD5E1] mb-3" />
                <p className="text-[14px] font-bold text-[#0F172A] mb-1">No packs yet</p>
                <p className="text-[12.5px] text-[#64748B] max-w-[240px] mb-5">
                  Create your first session pack and start teaching your audience today.
                </p>
                <Link
                  to="/creator/packs/new"
                  className="inline-flex items-center gap-2 text-[13px] font-semibold text-white px-5 py-2.5 rounded-full transition-colors"
                  style={{ background: '#2563EB', boxShadow: '0 4px 14px rgba(37,99,235,0.3)' }}
                >
                  <PlusCircle size={15} /> Create Pack
                </Link>
              </div>
            )}
          </div>

          {/* ── Right column ── */}
          <div className="space-y-4">

            {/* Quick Stats card */}
            <div
              className="bg-white rounded-2xl"
              style={{ border: '1px solid #E8EDF3', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', padding: '20px 20px 4px' }}
            >
              <div className="flex items-center gap-2 mb-1">
                <BarChart2 size={16} className="text-[#64748B]" />
                <h3 className="text-[14px] font-bold text-[#0F172A]">Quick Stats</h3>
              </div>

              <StatRow icon={Package}    iconBg="#EFF6FF" iconColor="#2563EB" label="Total Packs"     value={stats.packs} />
              <StatRow icon={Users}      iconBg="#F5F3FF" iconColor="#7C3AED" label="Total Students"  value={stats.students} />
              <StatRow icon={DollarSign} iconBg="#F0FDF4" iconColor="#16A34A" label="Total Revenue"   value={`$${stats.revenue.toFixed(0)}`} />
              <StatRow icon={Clock}      iconBg="#FFF7ED" iconColor="#EA580C" label="Pending Payouts" value={0} last />
            </div>

            {/* Recent Activity card */}
            <div
              className="bg-white rounded-2xl"
              style={{ border: '1px solid #E8EDF3', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', padding: '20px' }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Activity size={16} className="text-[#64748B]" />
                  <h3 className="text-[14px] font-bold text-[#0F172A]">Recent Activity</h3>
                </div>
                <Link
                  to="/creator/enrollments"
                  className="text-[11.5px] font-semibold text-[#2563EB] hover:text-[#1D4ED8] flex items-center gap-0.5 transition-colors"
                >
                  View All <ArrowRight size={12} />
                </Link>
              </div>

              <div className="rounded-xl p-3 flex gap-3 items-start" style={{ background: '#F8FAFC' }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: '#DCFCE7' }}>
                  <CheckCircle size={15} color="#16A34A" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-[#0F172A] leading-tight">New enrollment</p>
                  <p className="text-[11.5px] text-[#64748B] leading-relaxed mt-0.5">Someone enrolled in your course</p>
                </div>
                <span className="text-[10.5px] text-[#94A3B8] whitespace-nowrap flex-shrink-0 mt-0.5">2 days ago</span>
              </div>
            </div>

          </div>
        </div>

      </div>
    </PageTransition>
  );
}
