import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Package, DollarSign, Users, Clock, PlusCircle, Sparkles, Eye, ExternalLink } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { PageTransition, StatCard, Skeleton, EmptyState } from '../components/ui';
import { useSubscriptionGuard } from '../hooks/useSubscriptionGuard';
import TrialBanner from '../components/TrialBanner';

export default function CreatorDashboard() {
  useSubscriptionGuard();
  const { user, creatorProfile, profile } = useAuth();
  const [stats, setStats] = useState({ packs: 0, students: 0, revenue: 0, pending: 0 });
  const [recentPacks, setRecentPacks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const [packsRes, enrollRes] = await Promise.all([
        supabase.from('session_packs').select('*').eq('creator_id', user.id).order('created_at', { ascending: false }),
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
      setRecentPacks(packs.slice(0, 4));
      setLoading(false);
    };
    fetch();
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          <Skeleton className="h-32" count={4} />
        </div>
      </div>
    );
  }

  return (
    <PageTransition>
      <div>
        <TrialBanner />
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-[#0F172A] mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
            Welcome back, {profile?.first_name}
          </h1>
          <p className="text-[#475569]">Here's your creator overview</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
          <StatCard icon={Package} label="Total Packs" value={stats.packs} accent />
          <StatCard icon={Users} label="Students" value={stats.students} accent />
          <StatCard icon={DollarSign} label="Revenue" value={`$${stats.revenue.toFixed(0)}`} accent />
          <StatCard icon={Clock} label="Pending" value={stats.pending} />
        </div>

        {/* Quick Actions */}
        <div className="grid sm:grid-cols-2 gap-4 mb-10">
          <Link to="/creator/packs/new" className="bg-white rounded-2xl p-6 border border-[#F1F5F9] shadow-[0_2px_16px_rgba(0,0,0,0.06)] flex items-center gap-4 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
            <div className="w-12 h-12 bg-[#DBEAFE] rounded-xl flex items-center justify-center">
              <PlusCircle size={22} className="text-[#2563EB]" />
            </div>
            <div>
              <p className="font-semibold text-[#0F172A]">Create New Pack</p>
              <p className="text-xs text-[#94A6B8] mt-0.5">Start a new session pack</p>
            </div>
          </Link>
          <Link to="/creator/enrollments" className="bg-white rounded-2xl p-6 border border-[#F1F5F9] shadow-[0_2px_16px_rgba(0,0,0,0.06)] flex items-center gap-4 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
            <div className="w-12 h-12 bg-[#DBEAFE] rounded-xl flex items-center justify-center">
              <Eye size={22} className="text-[#2563EB]" />
            </div>
            <div>
              <p className="font-semibold text-[#0F172A]">Review Enrollments</p>
              <p className="text-xs text-[#94A6B8] mt-0.5">{stats.pending} pending review{stats.pending !== 1 ? 's' : ''}</p>
            </div>
          </Link>
        </div>

        {/* Recent Packs */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-[#0F172A]" style={{ fontFamily: 'var(--font-heading)' }}>
              Recent Packs
            </h2>
            <Link to="/creator/packs" className="text-sm text-[#2563EB] font-semibold hover:underline">
              View All →
            </Link>
          </div>

          {recentPacks.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No packs yet"
              description="Create your first session pack and start teaching!"
              action={
                <Link to="/creator/packs/new" className="btn-primary py-3 px-6">
                  <PlusCircle size={18} /> Create Pack
                </Link>
              }
            />
          ) : (
            <div className="grid sm:grid-cols-2 gap-5">
              {recentPacks.map((pack, i) => (
                <motion.div
                  key={pack.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link to={`/creator/packs/edit/${pack.id}`}
                    className="block bg-white rounded-2xl border border-[#F1F5F9] shadow-[0_2px_16px_rgba(0,0,0,0.06)] overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
                    {pack.thumbnail_url && (
                      <img src={pack.thumbnail_url} alt={pack.title} className="w-full h-36 object-cover" />
                    )}
                    <div className="p-5">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`badge ${pack.is_published ? 'badge-success' : 'badge-pending'}`}>
                          {pack.is_published ? 'Published' : 'Draft'}
                        </span>
                        {pack.has_free_session && (
                          <span className="badge badge-gold"><Sparkles size={10} /> Preview</span>
                        )}
                      </div>
                      <h3 className="font-semibold text-[#0F172A] mb-1 line-clamp-1">{pack.title}</h3>
                      <p className="text-sm text-[#2563EB] font-semibold">{pack.currency} {pack.price}</p>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
