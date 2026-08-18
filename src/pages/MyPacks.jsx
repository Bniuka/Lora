import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Package, PlusCircle, Edit3, Trash2, Eye, Users } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { PageTransition, GoldBadge, Skeleton, EmptyState, Modal, ShareMenu } from '../components/ui';
import { useSubscriptionGuard } from '../hooks/useSubscriptionGuard';

export default function MyPacks() {
  useSubscriptionGuard();
  const { user } = useAuth();
  const [packs, setPacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchPacks = async () => {
    const { data } = await supabase
      .from('session_packs')
      .select('*, sessions(count), enrollments(count)')
      .eq('creator_id', user.id)
      .order('created_at', { ascending: false });
    setPacks(data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (user) fetchPacks();
  }, [user]);

  const handleDelete = async () => {
    if (!deleteModal) return;
    setDeleting(true);
    await supabase.from('session_packs').delete().eq('id', deleteModal);
    setDeleteModal(null);
    setDeleting(false);
    fetchPacks();
  };

  const togglePublish = async (pack) => {
    await supabase
      .from('session_packs')
      .update({ is_published: !pack.is_published })
      .eq('id', pack.id);
    fetchPacks();
  };

  return (
    <PageTransition>
      <div>
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#0F172A]" style={{ fontFamily: 'var(--font-heading)' }}>
              My Session Packs
            </h1>
            <p className="text-sm text-[#475569] mt-2">{packs.length} pack{packs.length !== 1 ? 's' : ''} created</p>
          </div>
          <Link to="/creator/packs/new" className="btn-primary text-sm py-3 px-6">
            <PlusCircle size={16} /> New Pack
          </Link>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        ) : packs.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No session packs yet"
            description="Create your first session pack to start teaching and earning."
            action={
              <Link to="/creator/packs/new" className="btn-primary text-sm py-2.5 px-6">
                <PlusCircle size={16} /> Create Pack
              </Link>
            }
          />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
            {packs.map((pack, i) => (
              <motion.div
                key={pack.id}
                className="bg-white rounded-2xl border border-[#F1F5F9] shadow-[0_2px_16px_rgba(0,0,0,0.06)] overflow-hidden flex flex-col hover:shadow-lg transition-all duration-300"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                {/* Thumbnail */}
                <div className="h-40 bg-[#F8FAFC] relative overflow-hidden">
                  {pack.thumbnail_url ? (
                    <img src={pack.thumbnail_url} alt={pack.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package size={36} className="text-[#E2E8F0]" />
                    </div>
                  )}
                  <div className="absolute top-3 right-3 flex items-center gap-2">
                    {pack.has_free_session && <GoldBadge>Free Session</GoldBadge>}
                    <ShareMenu url={`${window.location.origin}/learner/pack/${pack.id}`} title={pack.title} />
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-[#0F172A] line-clamp-1 flex-1">{pack.title}</h3>
                    <button
                      onClick={() => togglePublish(pack)}
                      className={`badge ml-2 cursor-pointer ${pack.is_published ? 'badge-success' : 'badge-pending'}`}
                    >
                      {pack.is_published ? 'Published' : 'Draft'}
                    </button>
                  </div>

                  <p className="text-xs text-[#94A6B8] mb-4">{pack.category} · {pack.currency} {pack.price}</p>

                  <div className="flex items-center gap-4 text-xs text-[#94A6B8] mb-5">
                    <span className="flex items-center gap-1">
                      <Users size={13} /> {pack.enrollments?.[0]?.count || 0} students
                    </span>
                    <span>{pack.sessions?.[0]?.count || 0} sessions</span>
                  </div>

                  <div className="flex items-center gap-3 mt-auto pt-4 border-t border-[#E2E8F0]">
                    <Link
                      to={`/creator/packs/${pack.id}/edit`}
                      className="btn-ghost text-xs py-1.5 px-3 flex-1 justify-center border border-[#E2E8F0]"
                    >
                      <Edit3 size={13} /> Edit
                    </Link>
                    <Link
                      to={`/learner/pack/${pack.id}`}
                      className="btn-ghost text-xs py-1.5 px-3 flex-1 justify-center border border-[#E2E8F0]"
                    >
                      <Eye size={13} /> View
                    </Link>
                    <button
                      onClick={() => setDeleteModal(pack.id)}
                      className="btn-ghost text-xs py-1.5 px-3 text-[#C0392B] hover:bg-red-50 border-transparent"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Delete confirmation modal */}
        <Modal isOpen={!!deleteModal} onClose={() => setDeleteModal(null)} title="Delete Pack?">
          <p className="text-sm text-[#475569] mb-6">
            This will permanently delete this session pack and all its sessions. This action cannot be undone.
          </p>
          <div className="flex gap-3">
            <button onClick={() => setDeleteModal(null)} className="btn-ghost flex-1 border border-[#E2E8F0]">Cancel</button>
            <button onClick={handleDelete} className="btn-danger bg-[#C0392B] text-white flex-1 border-[#C0392B]" disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete Pack'}
            </button>
          </div>
        </Modal>
      </div>
    </PageTransition>
  );
}
