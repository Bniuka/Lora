import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  Package, DollarSign, Users, Clock, PlusCircle, Sparkles, Eye, 
  ExternalLink, TrendingUp, TrendingDown, ArrowRight, Settings, CheckCircle, GraduationCap, ChevronRight
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { PageTransition, Skeleton } from '../components/ui';
import { useSubscriptionGuard } from '../hooks/useSubscriptionGuard';
import TrialBanner from '../components/TrialBanner';

function StatCard({ icon: Icon, label, value, trend, trendValue, accentClass }) {
  const isPositive = trend === 'up';
  return (
    <div className="bg-white rounded-[24px] p-6 border border-[#E2E8F0] shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-4 mb-4">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${accentClass}`}>
          <Icon size={20} />
        </div>
        <div>
          <p className="text-sm font-semibold text-[#64748B]">{label}</p>
          <h3 className="text-3xl font-black text-[#0F172A] tracking-tight">{value}</h3>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-xs font-bold flex items-center gap-1 ${isPositive ? 'text-[#16A34A]' : 'text-[#EF4444]'}`}>
          {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />} {trendValue}%
        </span>
        <span className="text-xs text-[#94A6B8] font-medium">vs last 7 days</span>
      </div>
      <svg className="w-full h-8 mt-4" viewBox="0 0 100 20" preserveAspectRatio="none">
        <path d="M0,10 C20,15 40,0 60,10 C80,20 100,5 100,5" fill="none" stroke={isPositive ? '#16A34A' : '#EF4444'} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

export default function CreatorDashboard() {
  useSubscriptionGuard();
  const { user, profile } = useAuth();
  const [stats, setStats] = useState({ packs: 0, students: 0, revenue: 0, pending: 0 });
  const [recentPacks, setRecentPacks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const [packsRes, enrollRes] = await Promise.all([
        supabase.from('session_packs').select('*, sessions(count)').eq('creator_id', user.id).order('created_at', { ascending: false }),
        supabase.from('enrollments').select('*, session_packs!inner(creator_id, price, currency)')
          .eq('session_packs.creator_id', user.id),
      ]);
      const packs = packsRes.data || [];
      const enrollments = enrollRes.data || [];

      const confirmed = enrollments.filter(e => e.status === 'confirmed');
      const pending = enrollments.filter(e => e.status === 'pending');
      const revenue = confirmed.reduce((sum, e) => sum + (e.session_packs?.price || 0), 0);

      setStats({
        packs: packs.length,
        students: confirmed.length,
        revenue: revenue,
        pending: pending.length,
      });
      setRecentPacks(packs);
      setLoading(false);
    };
    fetch();
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 rounded-[32px]" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          <Skeleton className="h-40 rounded-[24px]" count={4} />
        </div>
      </div>
    );
  }

  const latestPack = recentPacks[0];

  return (
    <PageTransition>
      <div className="space-y-10">
        <TrialBanner />
        
        {/* Banner */}
        <div className="relative bg-gradient-to-r from-[#F0F5FF] via-[#E0E7FF] to-[#DBEAFE] rounded-[32px] border border-[#DBEAFE] shadow-sm overflow-hidden flex flex-col md:flex-row items-center justify-between p-8 md:p-12">
          <div className="relative z-10 md:w-3/5">
            <h1 className="text-3xl md:text-5xl font-black text-[#0F172A] mb-4 tracking-tight leading-tight" style={{ fontFamily: 'var(--font-heading)' }}>
              <span className="text-4xl md:text-5xl mr-2">👋</span> Welcome back, {profile?.first_name}
            </h1>
            <p className="text-[#475569] text-base md:text-lg mb-8 max-w-xl leading-relaxed">
              Keep creating, teaching and making an impact. Your journey as a creator is just getting bigger.
            </p>
            
            <div className="flex flex-wrap items-center gap-4">
              <div className="bg-white/80 backdrop-blur-md rounded-2xl px-5 py-3 border border-white/50 shadow-sm flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#DBEAFE] flex items-center justify-center text-[#1D4ED8]">
                  <Sparkles size={16} />
                </div>
                <div>
                  <p className="text-sm font-bold text-[#0F172A]">Creator</p>
                  <p className="text-[11px] text-[#64748B] font-medium">Since Apr 2025</p>
                </div>
              </div>
              <div className="bg-white/80 backdrop-blur-md rounded-2xl px-5 py-3 border border-white/50 shadow-sm flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#F3E8FF] flex items-center justify-center text-[#7E22CE]">
                  <Users size={16} />
                </div>
                <div>
                  <p className="text-sm font-bold text-[#0F172A]">Your audience</p>
                  <p className="text-[11px] text-[#64748B] font-medium">Growing daily</p>
                </div>
              </div>
              <div className="bg-white/80 backdrop-blur-md rounded-2xl px-5 py-3 border border-white/50 shadow-sm flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#DCFCE7] flex items-center justify-center text-[#15803D]">
                  <TrendingUp size={16} />
                </div>
                <div>
                  <p className="text-sm font-bold text-[#0F172A]">Next goal</p>
                  <p className="text-[11px] text-[#64748B] font-medium">Reach 100+ students</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="hidden md:block md:w-2/5 relative h-full">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[60%] w-[500px]">
              <img src="/banner_illustration.png" alt="Creator journey" className="w-full h-auto drop-shadow-2xl" />
            </div>
            <div className="absolute top-0 right-10 -rotate-6">
              <p className="font-mono text-xl text-[#1E3A8A] font-bold opacity-70">" Great creators<br/>build a better future. "</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard icon={Package} label="Total Packs" value={stats.packs} trend="up" trendValue="0" accentClass="bg-[#EFF6FF] text-[#2563EB]" />
          <StatCard icon={Users} label="Students" value={stats.students} trend="up" trendValue="0" accentClass="bg-[#F5F3FF] text-[#8B5CF6]" />
          <StatCard icon={DollarSign} label="Revenue" value={`$${stats.revenue.toFixed(0)}`} trend="up" trendValue="0" accentClass="bg-[#F0FDF4] text-[#16A34A]" />
          <StatCard icon={Clock} label="Pending" value={stats.pending} trend="down" trendValue="0" accentClass="bg-[#FFF7ED] text-[#EA580C]" />
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap items-center gap-4">
          <Link to="/creator/packs/new" className="flex items-center gap-3 bg-[#0F172A] hover:bg-[#1E293B] text-white px-6 py-4 rounded-[20px] font-bold shadow-lg shadow-slate-900/20 transition-all group border border-transparent">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <PlusCircle size={18} />
            </div>
            <div>
              <p className="text-sm">Create New Pack</p>
              <p className="text-[10px] text-slate-300 font-medium">Start a new course pack</p>
            </div>
          </Link>
          <Link to="/creator/enrollments" className="flex items-center gap-3 bg-white hover:bg-[#F8FAFC] border border-[#E2E8F0] px-6 py-4 rounded-[20px] shadow-sm transition-all">
            <div className="w-8 h-8 rounded-full bg-[#EFF6FF] flex items-center justify-center text-[#2563EB]">
              <Users size={18} />
            </div>
            <div>
              <p className="text-sm font-bold text-[#0F172A]">Manage Enrollments</p>
              <p className="text-[10px] text-[#64748B] font-medium">View & manage your students</p>
            </div>
          </Link>
          <Link to="/creator/dashboard" className="flex items-center gap-3 bg-white hover:bg-[#F8FAFC] border border-[#E2E8F0] px-6 py-4 rounded-[20px] shadow-sm transition-all">
            <div className="w-8 h-8 rounded-full bg-[#F0FDF4] flex items-center justify-center text-[#16A34A]">
              <DollarSign size={18} />
            </div>
            <div>
              <p className="text-sm font-bold text-[#0F172A]">View Payouts</p>
              <p className="text-[10px] text-[#64748B] font-medium">Track your earnings</p>
            </div>
          </Link>
          <Link to="/creator/settings" className="flex items-center gap-3 bg-white hover:bg-[#F8FAFC] border border-[#E2E8F0] px-6 py-4 rounded-[20px] shadow-sm transition-all">
            <div className="w-8 h-8 rounded-full bg-[#F5F3FF] flex items-center justify-center text-[#8B5CF6]">
              <Settings size={18} />
            </div>
            <div>
              <p className="text-sm font-bold text-[#0F172A]">Settings</p>
              <p className="text-[10px] text-[#64748B] font-medium">Update your profile & preferences</p>
            </div>
          </Link>
        </div>

        {/* Lower Section */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Recent Packs */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-[#0F172A] flex items-center gap-2" style={{ fontFamily: 'var(--font-heading)' }}>
                  <Package size={20} className="text-[#64748B]" /> Recent Packs
                </h2>
                <p className="text-sm text-[#64748B] mt-1">Your latest course packs and their performance.</p>
              </div>
              <Link to="/creator/packs" className="text-sm font-bold text-[#2563EB] hover:text-[#1D4ED8] flex items-center gap-1">
                View All <ArrowRight size={16} />
              </Link>
            </div>

            {latestPack ? (
              <div className="bg-white border border-[#E2E8F0] rounded-[32px] p-6 flex flex-col md:flex-row gap-8 shadow-sm">
                <div className="w-full md:w-[320px] aspect-video md:aspect-[4/3] rounded-[24px] overflow-hidden relative shadow-lg">
                  {latestPack.thumbnail_url ? (
                    <img src={latestPack.thumbnail_url} alt={latestPack.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-[#1E293B]" />
                  )}
                  {latestPack.has_free_session && (
                    <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1.5 shadow-sm border border-white/50 flex items-center gap-1">
                      <Sparkles size={14} className="text-[#D97706]" />
                      <span className="text-xs font-bold text-[#D97706] uppercase tracking-wide">Preview</span>
                    </div>
                  )}
                </div>
                
                <div className="flex-1 flex flex-col justify-center">
                  <div className="flex items-center gap-2 mb-4">
                    <span className={`px-3 py-1 text-xs font-bold rounded-lg uppercase tracking-wider flex items-center gap-1 ${
                      latestPack.is_published ? 'bg-[#DCFCE7] text-[#16A34A]' : 'bg-[#FEF3C7] text-[#D97706]'
                    }`}>
                      <CheckCircle size={12} /> {latestPack.is_published ? 'Published' : 'Draft'}
                    </span>
                  </div>
                  
                  <h3 className="text-2xl font-black text-[#0F172A] mb-3 leading-tight">{latestPack.title}</h3>
                  <p className="text-sm text-[#64748B] mb-6 line-clamp-2 leading-relaxed">
                    {latestPack.description || 'Learn practical ways to master the topic. This course covers real strategies, tools, and step-by-step methods.'}
                  </p>
                  
                  <div className="flex flex-wrap items-center gap-5 text-sm text-[#475569] font-medium mb-8">
                    <span className="flex items-center gap-2">
                      <Package size={16} className="text-[#94A6B8]" /> {latestPack.sessions?.[0]?.count || 0} lessons
                    </span>
                    <span className="flex items-center gap-2">
                      <Clock size={16} className="text-[#94A6B8]" /> Learn at own pace
                    </span>
                    <span className="flex items-center gap-2">
                      <GraduationCap size={16} className="text-[#94A6B8]" /> {latestPack.category}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between mt-auto">
                    <p className="text-2xl font-black text-[#2563EB] tracking-tight">{latestPack.currency} {latestPack.price}</p>
                    <Link to={`/creator/packs/edit/${latestPack.id}`} className="px-6 py-3 bg-white border border-[#2563EB] text-[#2563EB] hover:bg-[#EFF6FF] font-bold rounded-full text-sm transition-colors flex items-center gap-2">
                      View Details <ArrowRight size={16} />
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-[#E2E8F0] border-dashed rounded-[32px] p-12 text-center flex flex-col items-center justify-center text-[#94A6B8]">
                <Package size={48} className="mb-4 text-[#CBD5E1]" />
                <p className="text-lg font-bold text-[#0F172A] mb-2">No packs yet</p>
                <p className="text-sm mb-6 max-w-sm">Create your first session pack and start teaching your audience today!</p>
                <Link to="/creator/packs/new" className="px-6 py-3 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-full font-bold text-sm shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2">
                  <PlusCircle size={18} /> Create Pack
                </Link>
              </div>
            )}
          </div>

          {/* Quick Stats & Activity */}
          <div className="space-y-8">
            <div className="bg-white border border-[#E2E8F0] rounded-[32px] p-8 shadow-sm">
              <h3 className="text-lg font-bold text-[#0F172A] mb-6 flex items-center gap-2" style={{ fontFamily: 'var(--font-heading)' }}>
                <TrendingUp size={20} className="text-[#64748B]" /> Quick Stats
              </h3>
              <div className="space-y-5">
                <div className="flex items-center justify-between pb-4 border-b border-[#F1F5F9]">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#EFF6FF] flex items-center justify-center text-[#2563EB]"><Package size={14}/></div>
                    <span className="text-sm font-medium text-[#475569]">Total Packs</span>
                  </div>
                  <span className="font-black text-[#0F172A] flex items-center gap-3">{stats.packs} <ChevronRight size={14} className="text-[#CBD5E1]" /></span>
                </div>
                <div className="flex items-center justify-between pb-4 border-b border-[#F1F5F9]">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#F5F3FF] flex items-center justify-center text-[#8B5CF6]"><Users size={14}/></div>
                    <span className="text-sm font-medium text-[#475569]">Total Students</span>
                  </div>
                  <span className="font-black text-[#0F172A] flex items-center gap-3">{stats.students} <ChevronRight size={14} className="text-[#CBD5E1]" /></span>
                </div>
                <div className="flex items-center justify-between pb-4 border-b border-[#F1F5F9]">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#F0FDF4] flex items-center justify-center text-[#16A34A]"><DollarSign size={14}/></div>
                    <span className="text-sm font-medium text-[#475569]">Total Revenue</span>
                  </div>
                  <span className="font-black text-[#0F172A] flex items-center gap-3">${stats.revenue.toFixed(0)} <ChevronRight size={14} className="text-[#CBD5E1]" /></span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#FFF7ED] flex items-center justify-center text-[#EA580C]"><Clock size={14}/></div>
                    <span className="text-sm font-medium text-[#475569]">Pending Payouts</span>
                  </div>
                  <span className="font-black text-[#0F172A] flex items-center gap-3">0 <ChevronRight size={14} className="text-[#CBD5E1]" /></span>
                </div>
              </div>
            </div>

            <div className="bg-white border border-[#E2E8F0] rounded-[32px] p-8 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-[#0F172A] flex items-center gap-2" style={{ fontFamily: 'var(--font-heading)' }}>
                  <Sparkles size={20} className="text-[#64748B]" /> Recent Activity
                </h3>
                <Link to="/creator/enrollments" className="text-xs font-bold text-[#2563EB] hover:text-[#1D4ED8] flex items-center gap-1">
                  View All <ArrowRight size={14} />
                </Link>
              </div>
              
              <div className="space-y-4">
                <div className="flex gap-4 p-4 rounded-2xl bg-[#F8FAFC]">
                  <div className="w-10 h-10 rounded-full bg-[#DCFCE7] flex items-center justify-center text-[#16A34A] shrink-0">
                    <CheckCircle size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#0F172A]">New enrollment</p>
                    <p className="text-[11px] text-[#64748B] mt-1 leading-relaxed">Someone enrolled in your course. Check enrollments tab.</p>
                  </div>
                  <div className="text-[10px] text-[#94A6B8] whitespace-nowrap pt-1">
                    2 days ago
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
