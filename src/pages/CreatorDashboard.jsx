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
    <svg viewBox="0 0 90 18" className="w-full mt-4" style={{ height: 42 }} preserveAspectRatio="none">
      <path d={path} fill={color} fillOpacity="0.08" />
      <path d={line} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ─── KPI Card ─── */
function KpiCard({ icon: Icon, label, value, iconBg, iconColor, sparkColor, up = true }) {
  return (
    <div
      className="bg-white rounded-[24px] flex flex-col"
      style={{
        border: '1px solid #E8EDF3',
        boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
        padding: '32px 32px 24px',
        minHeight: 180,
      }}
    >
      {/* top row: icon + label + value */}
      <div className="flex items-start gap-4 mb-6">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm"
          style={{ background: iconBg }}
        >
          <Icon size={24} color={iconColor} />
        </div>
        <div>
          <p className="text-[14px] font-semibold text-[#64748B] mb-2 uppercase tracking-wide">{label}</p>
          <p className="text-[32px] font-extrabold text-[#0F172A] leading-none tracking-tight">{value}</p>
        </div>
      </div>

      {/* trend row */}
      <div className="flex items-center gap-2 mb-2">
        <div className={`flex items-center gap-1 px-2 py-1 rounded-md ${up ? 'bg-[#DCFCE7]' : 'bg-[#FEE2E2]'}`}>
          {up ? <TrendingUp size={14} color="#16A34A" /> : <TrendingDown size={14} color="#DC2626" />}
          <span style={{ color: up ? '#16A34A' : '#DC2626' }} className="text-[13px] font-bold">0%</span>
        </div>
        <span className="text-[13px] text-[#94A3B8] font-medium ml-1">vs last 7 days</span>
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
      className="flex items-center gap-5 rounded-[20px] transition-all duration-300 hover:-translate-y-1 hover:shadow-lg group"
      style={{
        background: primary ? '#0F172A' : 'white',
        border: primary ? 'none' : '1px solid #E8EDF3',
        boxShadow: primary
          ? '0 8px 24px rgba(15,23,42,0.2)'
          : '0 4px 16px rgba(0,0,0,0.03)',
        padding: '24px 28px',
      }}
    >
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm"
        style={{ background: primary ? 'rgba(255,255,255,0.15)' : iconBg }}
      >
        <Icon size={22} color={primary ? 'white' : iconColor} />
      </div>
      <div>
        <p className={`text-[15px] font-bold mb-1 ${primary ? 'text-white' : 'text-[#0F172A]'}`}>{title}</p>
        <p className={`text-[13px] leading-relaxed ${primary ? 'text-[#94A3B8]' : 'text-[#64748B]'}`}>{subtitle}</p>
      </div>
    </Link>
  );
}

/* ─── Quick stats row ─── */
function StatRow({ icon: Icon, iconBg, iconColor, label, value, last }) {
  return (
    <div className={`flex items-center justify-between py-5 ${!last ? 'border-b border-[#F1F5F9]' : ''}`}>
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: iconBg }}>
          <Icon size={18} color={iconColor} />
        </div>
        <span className="text-[14px] font-semibold text-[#475569]">{label}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-[16px] font-extrabold text-[#0F172A]">{value}</span>
        <ChevronRight size={16} className="text-[#CBD5E1]" />
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
      <div className="space-y-8" style={{ fontFamily: "'Inter', sans-serif" }}>
        <Skeleton className="h-56 w-full rounded-3xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-44 rounded-3xl" />)}
        </div>
      </div>
    );
  }

  const firstName = profile?.first_name || 'Creator';
  const latestPack = recentPacks[0] ?? null;
  const sessionCount = latestPack?.sessions?.[0]?.count ?? 0;

  return (
    <PageTransition>
      <div style={{ fontFamily: "'Inter', sans-serif" }} className="space-y-10 pb-10">
        <TrialBanner />

        {/* ══════════ WELCOME TEXT ══════════ */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="pb-2"
        >
          <motion.h1 
            className="text-[36px] md:text-[48px] font-extrabold tracking-tight mb-2 text-transparent bg-clip-text bg-gradient-to-r from-[#2563EB] via-[#9333EA] to-[#2563EB]"
            style={{ backgroundSize: '200% auto' }}
            animate={{ backgroundPosition: ['0% center', '200% center'] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
          >
            Welcome back, {firstName}
          </motion.h1>
          <p className="text-[16px] text-[#64748B] font-medium">
            Here's what's happening with your courses today.
          </p>
        </motion.div>

        {/* ══════════ KPI CARDS ══════════ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <KpiCard icon={Package}    label="Total Packs" value={stats.packs}                   iconBg="#EFF6FF" iconColor="#2563EB" sparkColor="#2563EB" up />
          <KpiCard icon={Users}      label="Students"    value={stats.students}                 iconBg="#F5F3FF" iconColor="#7C3AED" sparkColor="#7C3AED" up />
          <KpiCard icon={DollarSign} label="Revenue"     value={`$${stats.revenue.toFixed(0)}`} iconBg="#F0FDF4" iconColor="#16A34A" sparkColor="#16A34A" up />
          <KpiCard icon={Clock}      label="Pending"     value={stats.pending}                  iconBg="#FFF7ED" iconColor="#EA580C" sparkColor="#EA580C" up={false} />
        </div>

        {/* ══════════ QUICK ACTIONS ══════════ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <ActionCard to="/creator/packs/new"    icon={PlusCircle} iconBg="#EFF6FF" iconColor="#2563EB" title="Create New Pack"      subtitle="Start a new course pack"            primary />
          <ActionCard to="/creator/enrollments"  icon={Users}      iconBg="#F5F3FF" iconColor="#7C3AED" title="Manage Enrollments"   subtitle="View & manage your students" />
          <ActionCard to="/creator/dashboard"    icon={DollarSign} iconBg="#F0FDF4" iconColor="#16A34A" title="View Payouts"         subtitle="Track your earnings" />
          <ActionCard to="/creator/settings"     icon={Settings}   iconBg="#F1F5F9" iconColor="#475569" title="Settings"            subtitle="Update your profile & preferences" />
        </div>

        {/* ══════════ BOTTOM: RECENT PACKS + RIGHT COLUMN ══════════ */}
        <div className="grid lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_380px] gap-8 items-start">

          {/* ── Recent Packs ── */}
          <div className="space-y-6">
            {/* Section header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm border border-[#E8EDF3]">
                  <BarChart2 size={20} className="text-[#64748B]" />
                </div>
                <div>
                  <h2 className="text-[18px] font-extrabold text-[#0F172A] leading-tight">Recent Packs</h2>
                  <p className="text-[14px] text-[#64748B] leading-relaxed mt-0.5">Your latest course packs and their performance.</p>
                </div>
              </div>
              <Link
                to="/creator/packs"
                className="text-[14px] font-bold text-[#2563EB] hover:text-[#1D4ED8] flex items-center gap-1.5 transition-colors"
              >
                View All <ArrowRight size={16} />
              </Link>
            </div>

            {latestPack ? (
              <div
                className="bg-white rounded-[24px] overflow-hidden flex flex-col md:flex-row transition-shadow hover:shadow-md"
                style={{ border: '1px solid #E8EDF3', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}
              >
                {/* Thumbnail */}
                <div className="md:w-[300px] md:flex-shrink-0 relative" style={{ minHeight: 220 }}>
                  {latestPack.thumbnail_url ? (
                    <img
                      src={latestPack.thumbnail_url}
                      alt={latestPack.title}
                      className="w-full h-full object-cover"
                      style={{ minHeight: 220 }}
                    />
                  ) : (
                    <div className="w-full h-full bg-[#1E293B] flex items-center justify-center" style={{ minHeight: 220 }}>
                      <Package size={48} className="text-white/20" />
                    </div>
                  )}
                  {/* Published badge overlay */}
                  {latestPack.is_published && (
                    <div className="absolute top-4 left-4 flex items-center gap-2 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-sm">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A] animate-pulse" />
                      <span className="text-[12px] font-bold text-[#16A34A] uppercase tracking-wide">Published</span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col justify-between p-8">
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-bold uppercase tracking-wide ${
                        latestPack.is_published
                          ? 'bg-[#F0FDF4] text-[#16A34A]'
                          : 'bg-[#FEF3C7] text-[#D97706]'
                      }`}>
                        <CheckCircle size={14} />
                        {latestPack.is_published ? 'Published' : 'Draft'}
                      </span>
                    </div>

                    <h3 className="text-[22px] font-extrabold text-[#0F172A] leading-snug mb-3">
                      {latestPack.title}
                    </h3>
                    <p className="text-[14.5px] text-[#64748B] leading-relaxed mb-6 line-clamp-2">
                      {latestPack.description || 'Learn practical ways to master the topic. This course covers real strategies, tools and step-by-step methods.'}
                    </p>

                    {/* Meta row */}
                    <div className="flex flex-wrap items-center gap-6 text-[13.5px] font-medium text-[#475569]">
                      <span className="flex items-center gap-2">
                        <GraduationCap size={18} className="text-[#94A3B8]" />
                        {sessionCount} lessons
                      </span>
                      <span className="flex items-center gap-2">
                        <Clock size={18} className="text-[#94A3B8]" />
                        Learn at your own pace
                      </span>
                      {latestPack.category && (
                        <span className="flex items-center gap-2">
                          <Zap size={18} className="text-[#94A3B8]" />
                          {latestPack.category}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Price + CTA */}
                  <div className="flex items-center justify-between mt-8 pt-6 border-t border-[#F1F5F9]">
                    <p className="text-[24px] font-extrabold text-[#2563EB] tracking-tight">
                      {latestPack.currency} {latestPack.price}
                    </p>
                    <Link
                      to={`/creator/packs/edit/${latestPack.id}`}
                      className="flex items-center gap-2.5 text-[14px] font-bold text-[#2563EB] border-2 border-[#BFDBFE] rounded-xl px-6 py-2.5 hover:bg-[#EFF6FF] hover:border-[#93C5FD] transition-all"
                    >
                      View Details <ArrowRight size={16} />
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              /* Empty state */
              <div
                className="bg-white rounded-[24px] p-12 flex flex-col items-center justify-center text-center"
                style={{ border: '2px dashed #CBD5E1' }}
              >
                <div className="w-16 h-16 rounded-full bg-[#F1F5F9] flex items-center justify-center mb-5">
                  <Package size={28} className="text-[#94A3B8]" />
                </div>
                <p className="text-[18px] font-extrabold text-[#0F172A] mb-2">No packs yet</p>
                <p className="text-[14.5px] text-[#64748B] max-w-[300px] mb-8 leading-relaxed">
                  Create your first session pack and start teaching your audience today.
                </p>
                <Link
                  to="/creator/packs/new"
                  className="inline-flex items-center gap-2 text-[15px] font-bold text-white px-8 py-4 rounded-xl transition-all hover:-translate-y-1"
                  style={{ background: '#2563EB', boxShadow: '0 8px 24px rgba(37,99,235,0.3)' }}
                >
                  <PlusCircle size={18} /> Create Pack
                </Link>
              </div>
            )}
          </div>

          {/* ── Right column ── */}
          <div className="space-y-6">

            {/* Quick Stats card */}
            <div
              className="bg-white rounded-[24px]"
              style={{ border: '1px solid #E8EDF3', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', padding: '28px 28px 8px' }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#F8FAFC] flex items-center justify-center border border-[#E2E8F0]">
                  <BarChart2 size={18} className="text-[#64748B]" />
                </div>
                <h3 className="text-[16px] font-extrabold text-[#0F172A]">Quick Stats</h3>
              </div>

              <StatRow icon={Package}    iconBg="#EFF6FF" iconColor="#2563EB" label="Total Packs"     value={stats.packs} />
              <StatRow icon={Users}      iconBg="#F5F3FF" iconColor="#7C3AED" label="Total Students"  value={stats.students} />
              <StatRow icon={DollarSign} iconBg="#F0FDF4" iconColor="#16A34A" label="Total Revenue"   value={`$${stats.revenue.toFixed(0)}`} />
              <StatRow icon={Clock}      iconBg="#FFF7ED" iconColor="#EA580C" label="Pending Payouts" value={0} last />
            </div>

            {/* Recent Activity card */}
            <div
              className="bg-white rounded-[24px]"
              style={{ border: '1px solid #E8EDF3', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', padding: '28px' }}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#F8FAFC] flex items-center justify-center border border-[#E2E8F0]">
                    <Activity size={18} className="text-[#64748B]" />
                  </div>
                  <h3 className="text-[16px] font-extrabold text-[#0F172A]">Recent Activity</h3>
                </div>
                <Link
                  to="/creator/enrollments"
                  className="text-[13px] font-bold text-[#2563EB] hover:text-[#1D4ED8] flex items-center gap-1 transition-colors"
                >
                  View All <ArrowRight size={14} />
                </Link>
              </div>

              <div className="rounded-[16px] p-4 flex gap-4 items-start" style={{ background: '#F8FAFC' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#DCFCE7' }}>
                  <CheckCircle size={18} color="#16A34A" />
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <p className="text-[14px] font-bold text-[#0F172A] leading-tight mb-1">New enrollment</p>
                  <p className="text-[13px] text-[#64748B] leading-relaxed">Someone enrolled in your course</p>
                </div>
                <span className="text-[12px] font-medium text-[#94A3B8] whitespace-nowrap flex-shrink-0 pt-1">2 days ago</span>
              </div>
            </div>

          </div>
        </div>

      </div>
    </PageTransition>
  );
}
