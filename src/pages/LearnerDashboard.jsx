import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Package, ArrowRight, BookOpen, Sparkles, Clock, XCircle, Copy } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { PageTransition, StatusBadge, GoldBadge, Skeleton, EmptyState } from '../components/ui';
import { generatePaymentReference } from '../lib/utils';

export default function LearnerDashboard() {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState([]);
  const [discover, setDiscover] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const [enrRes, discRes] = await Promise.all([
        supabase.from('enrollments')
          .select('*, session_packs(id, title, thumbnail_url, category, has_free_session, sessions(count))')
          .eq('learner_id', user.id)
          .order('created_at', { ascending: false }),
        supabase.from('session_packs')
          .select('*, creator_profiles(id, profiles(first_name, last_name))')
          .eq('is_published', true)
          .order('created_at', { ascending: false })
          .limit(6),
      ]);
      setEnrollments(enrRes.data || []);
      setDiscover(discRes.data || []);
      setLoading(false);
    };
    fetch();
  }, [user]);

  const handleRegenerateCode = async (enrollmentId) => {
    const code = await generatePaymentReference();
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    
    await supabase.from('enrollments').update({
      payment_reference_code: code,
      code_expires_at: expiresAt,
    }).eq('id', enrollmentId);
    
    // Refresh enrollments locally
    setEnrollments(prev => prev.map(enr => 
      enr.id === enrollmentId 
        ? { ...enr, payment_reference_code: code, code_expires_at: expiresAt } 
        : enr
    ));
  };

  return (
    <PageTransition>
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#0F172A] mb-10" style={{ fontFamily: 'var(--font-heading)' }}>
          My Dashboard
        </h1>

        {/* Enrolled Packs */}
        <section className="mb-14">
          <h2 className="text-lg font-semibold text-[#0F172A] mb-6" style={{ fontFamily: 'var(--font-heading)' }}>
            My Enrolled Packs
          </h2>

          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-52" />)}
            </div>
          ) : enrollments.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="No enrollments yet"
              description="Discover courses and start learning today!"
              action={<Link to="/learner/discover" className="btn-primary text-sm py-2.5 px-6">Discover Courses</Link>}
            />
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
              {enrollments.map((enr, i) => {
                const pack = enr.session_packs;
                return (
                  <motion.div
                    key={enr.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                  >
                    <Link
                      to={enr.status === 'confirmed' ? `/learner/pack/${pack.id}/sessions` : `/learner/pack/${pack.id}`}
                      className="bg-white rounded-2xl border border-[#F1F5F9] shadow-[0_2px_16px_rgba(0,0,0,0.06)] hover:shadow-lg hover:-translate-y-1 transition-all duration-300 overflow-hidden block"
                    >
                      <div className="h-36 bg-[#F8FAFC] relative">
                        {pack.thumbnail_url ? (
                          <img src={pack.thumbnail_url} alt={pack.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package size={32} className="text-[#E2E8F0]" />
                          </div>
                        )}
                        <div className="absolute top-3 right-3">
                          <StatusBadge status={enr.status === 'confirmed' ? 'confirmed' : enr.status === 'pending' ? 'pending' : 'rejected'} />
                        </div>
                      </div>
                      <div className="p-5">
                        <h3 className="font-semibold text-[#0F172A] mb-1 line-clamp-1">{pack.title}</h3>
                        <p className="text-xs text-[#475569] mt-1 mb-4">{pack.category}</p>
                        
                        {enr.status === 'pending' && enr.payment_method_used === 'bank' && (
                          <div className="p-3 rounded-lg bg-[#DBEAFE]/20 border border-[#DBEAFE] mb-2">
                            <p className="text-[11px] font-medium text-[#1D4ED8] mb-1 flex items-center gap-1">
                              <Clock size={10} /> Awaiting verification
                            </p>
                            <div className="flex items-center justify-between mt-2">
                              <p className="text-xs font-mono text-[#0F172A]">{enr.payment_reference_code}</p>
                              {new Date(enr.code_expires_at) < new Date() ? (
                                <span className="text-[10px] text-white font-semibold bg-[#C0392B] px-2 py-0.5 rounded">Expired</span>
                              ) : (
                                <button onClick={(e) => { e.preventDefault(); navigator.clipboard.writeText(enr.payment_reference_code); }} className="text-[#475569] hover:text-[#2563EB]">
                                  <Copy size={12} />
                                </button>
                              )}
                            </div>
                            
                            {new Date(enr.code_expires_at) < new Date() && (
                              <button 
                                onClick={(e) => { e.preventDefault(); handleRegenerateCode(enr.id); }}
                                className="w-full mt-3 py-1.5 btn-primary text-xs"
                              >
                                Request New Code
                              </button>
                            )}
                          </div>
                        )}

                        {enr.status === 'rejected' && (
                          <div className="p-3 rounded-lg bg-red-50 border border-red-100">
                            <p className="text-[11px] font-medium text-[#C0392B] flex items-center gap-1">
                              <XCircle size={10} /> Payment rejected
                            </p>
                            {enr.rejection_reason && (
                              <p className="text-xs text-[#475569] mt-1 leading-relaxed">Reason: {enr.rejection_reason}</p>
                            )}
                            <Link to={`/learner/pack/${pack.id}`} className="mt-2 text-xs text-[#2563EB] font-medium underline inline-block">
                              Try Again
                            </Link>
                          </div>
                        )}
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}
        </section>

        {/* Discover */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-[#0F172A]" style={{ fontFamily: 'var(--font-heading)' }}>
              Discover New Courses
            </h2>
            <Link to="/learner/discover" className="text-sm text-[#2563EB] hover:text-[#1D4ED8] font-semibold flex items-center gap-1">
              See all <ArrowRight size={14} />
            </Link>
          </div>
          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-52" />)}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
              {discover.map((pack, i) => (
                <motion.div key={pack.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                  <Link to={`/learner/pack/${pack.id}`} className="bg-white rounded-2xl border border-[#F1F5F9] shadow-[0_2px_16px_rgba(0,0,0,0.06)] hover:shadow-lg hover:-translate-y-1 transition-all duration-300 overflow-hidden block">
                    <div className="h-36 bg-[#F8FAFC] relative">
                      {pack.thumbnail_url ? (
                        <img src={pack.thumbnail_url} alt={pack.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package size={32} className="text-[#E2E8F0]" />
                        </div>
                      )}
                      {pack.has_free_session && (
                        <div className="absolute top-3 left-3"><GoldBadge icon={Sparkles}>Free Preview</GoldBadge></div>
                      )}
                    </div>
                    <div className="p-5">
                      <h3 className="font-semibold text-[#0F172A] mb-1 line-clamp-1">{pack.title}</h3>
                      <p className="text-xs text-[#94A6B8] mb-3">
                        {pack.creator_profiles?.profiles?.first_name} {pack.creator_profiles?.profiles?.last_name} · {pack.category}
                      </p>
                      <p className="text-sm font-semibold text-[#2563EB]">{pack.currency} {pack.price}</p>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </section>
      </div>
    </PageTransition>
  );
}
