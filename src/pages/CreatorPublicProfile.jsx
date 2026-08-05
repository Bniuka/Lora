import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Package, Star, Users, ArrowLeft, Sparkles, MapPin } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { PageTransition, GoldBadge, Skeleton, EmptyState } from '../components/ui';

export default function CreatorPublicProfile() {
  const { id } = useParams();
  const [creator, setCreator] = useState(null);
  const [packs, setPacks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const [creatorRes, packsRes] = await Promise.all([
        supabase.from('creator_profiles')
          .select('*, profiles(first_name, last_name, avatar_url, email)')
          .eq('id', id).single(),
        supabase.from('session_packs')
          .select('*, enrollments(count)')
          .eq('creator_id', id)
          .eq('is_published', true)
          .order('created_at', { ascending: false }),
      ]);
      setCreator(creatorRes.data);
      setPacks(packsRes.data || []);
      setLoading(false);
    };
    fetch();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12">
        <Skeleton className="h-40 rounded-2xl mb-6" />
        <Skeleton className="h-8 w-48 mb-4" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-60" />)}
        </div>
      </div>
    );
  }

  if (!creator) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="text-center">
          <p className="text-[#94A6B8] mb-4">Creator not found</p>
          <Link to="/" className="btn-primary text-sm">Go Home</Link>
        </div>
      </div>
    );
  }

  const profile = creator.profiles;

  return (
    <PageTransition>
      <div className="min-h-screen bg-[#F8FAFC]">
        {/* Navbar */}
        <nav className="sticky top-0 z-40 bg-white border-b border-[#E2E8F0]">
          <div className="max-w-6xl mx-auto px-8 md:px-16 py-5 flex items-center justify-between">
            <Link to="/" className="text-2xl font-bold text-[#2563EB]" style={{ fontFamily: 'var(--font-heading)' }}>
              Lora
            </Link>
            <div className="flex items-center gap-6">
              <Link to="/login" className="btn-ghost text-sm px-6 py-2.5 border-transparent text-[#475569] hover:bg-[#F5F5F5]">Log In</Link>
              <Link to="/signup" className="btn-primary text-sm py-3 px-8">Get Started</Link>
            </div>
          </div>
        </nav>

        <div className="max-w-4xl mx-auto px-8 md:px-12 py-14">
          {/* Profile Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row items-start gap-8 mb-12"
          >
            {/* Avatar */}
            <div className="w-24 h-24 rounded-2xl bg-[#DBEAFE] border border-[#DBEAFE] flex items-center justify-center text-[#2563EB] text-3xl font-bold flex-shrink-0"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover rounded-2xl" />
              ) : (
                <>{profile?.first_name?.[0]}{profile?.last_name?.[0]}</>
              )}
            </div>

            <div className="flex-1">
              <h1
                className="text-3xl font-bold text-[#0F172A] mb-1"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {profile?.first_name} {profile?.last_name}
              </h1>
              <div className="flex flex-wrap items-center gap-4 mb-4">
                <span className="badge badge-gold">{creator.category}</span>
                {creator.rating > 0 && (
                  <span className="flex items-center gap-1 text-sm text-[#2563EB]">
                    <Star size={14} fill="currentColor" /> {creator.rating.toFixed(1)}
                  </span>
                )}
                <span className="flex items-center gap-1 text-sm text-[#94A6B8]">
                  <Users size={14} /> {creator.total_students} student{creator.total_students !== 1 ? 's' : ''}
                </span>
              </div>
              <p className="text-sm text-[#475569] leading-relaxed max-w-xl">
                {creator.about}
              </p>
            </div>
          </motion.div>

          <hr className="border-[#E2E8F0] mb-12" />

          {/* Published Packs */}
          <div>
            <h2
              className="text-xl font-bold text-[#0F172A] mb-6"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Published Courses ({packs.length})
            </h2>

            {packs.length === 0 ? (
              <EmptyState
                icon={Package}
                title="No courses yet"
                description="This creator hasn't published any courses yet."
              />
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
                {packs.map((pack, i) => (
                  <motion.div
                    key={pack.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                  >
                    <Link
                      to={`/learner/pack/${pack.id}`}
                      className="bg-white rounded-2xl border border-[#F1F5F9] shadow-[0_2px_16px_rgba(0,0,0,0.06)] hover:shadow-lg hover:-translate-y-1 transition-all duration-300 overflow-hidden block group"
                    >
                      <div className="h-40 bg-[#F8FAFC] relative overflow-hidden">
                        {pack.thumbnail_url ? (
                          <img
                            src={pack.thumbnail_url}
                            alt={pack.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package size={36} className="text-[#E2E8F0]" />
                          </div>
                        )}
                        {pack.has_free_session && (
                          <div className="absolute top-3 left-3">
                            <GoldBadge icon={Sparkles}>Free Preview</GoldBadge>
                          </div>
                        )}
                      </div>
                      <div className="p-5">
                        <h3 className="font-semibold text-[#0F172A] mb-1 line-clamp-1">
                          {pack.title}
                        </h3>
                        <p className="text-xs text-[#94A6B8] mb-3">{pack.category}</p>
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-[#2563EB]">
                            {pack.currency} {pack.price}
                          </p>
                          <span className="text-xs text-[#94A6B8]">
                            {pack.enrollments?.[0]?.count || 0} students
                          </span>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-[#E2E8F0] bg-white py-12 px-8 md:px-16 mt-16">
          <div className="max-w-6xl mx-auto text-center text-sm text-[#94A6B8]">
            © {new Date().getFullYear()} Lora. Built for creators, everywhere.
          </div>
        </footer>
      </div>
    </PageTransition>
  );
}
