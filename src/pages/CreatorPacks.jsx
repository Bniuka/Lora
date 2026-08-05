import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Package, PlusCircle, Eye, Edit3, Sparkles, ExternalLink, Trash2, Globe } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { PageTransition, StatusBadge, GoldBadge, Skeleton, EmptyState, Modal } from '../components/ui';

export default function CreatorPacks() {
  const { user } = useAuth();
  const [packs, setPacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState(null);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase.from('session_packs')
        .select('*, sessions(count), enrollments(count)')
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false });
      setPacks(data || []);
      setLoading(false);
    };
    fetch();
  }, [user]);

  const togglePublish = async (pack) => {
    await supabase.from('session_packs').update({ is_published: !pack.is_published }).eq('id', pack.id);
    setPacks(prev => prev.map(p => p.id === pack.id ? { ...p, is_published: !p.is_published } : p));
  };

  const deletePack = async (id) => {
    await supabase.from('sessions').delete().eq('pack_id', id);
    await supabase.from('session_packs').delete().eq('id', id);
    setPacks(prev => prev.filter(p => p.id !== id));
    setDeleteModal(null);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid sm:grid-cols-2 gap-5">
          <Skeleton className="h-64" count={4} />
        </div>
      </div>
    );
  }

  return (
    <PageTransition>
      <div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-10 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#0F172A]" style={{ fontFamily: 'var(--font-heading)' }}>
              My Packs
            </h1>
            <p className="text-[#475569] mt-1 text-sm">{packs.length} session pack{packs.length !== 1 ? 's' : ''}</p>
          </div>
          <Link to="/creator/packs/new" className="btn-primary py-3 px-6">
            <PlusCircle size={18} /> Create Pack
          </Link>
        </div>

        {packs.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No packs yet"
            description="Create your first session pack and start teaching students worldwide."
            action={
              <Link to="/creator/packs/new" className="btn-primary py-3 px-6">
                <PlusCircle size={18} /> Create Pack
              </Link>
            }
          />
        ) : (
          <div className="grid sm:grid-cols-2 gap-5 md:gap-6">
            {packs.map((pack, i) => (
              <motion.div
                key={pack.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white rounded-2xl border border-[#F1F5F9] shadow-[0_2px_16px_rgba(0,0,0,0.06)] overflow-hidden hover:shadow-lg transition-all duration-300"
              >
                <div className="relative h-40 bg-[#F8FAFC]">
                  {pack.thumbnail_url ? (
                    <img src={pack.thumbnail_url} alt={pack.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package size={36} className="text-[#E2E8F0]" />
                    </div>
                  )}
                  <div className="absolute top-3 left-3 flex gap-2">
                    <StatusBadge status={pack.is_published ? 'published' : 'draft'} />
                    {pack.has_free_session && <GoldBadge icon={Sparkles}>Preview</GoldBadge>}
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="font-semibold text-[#0F172A] mb-1 line-clamp-1">{pack.title}</h3>
                  <p className="text-xs text-[#94A6B8] mb-3">
                    {pack.sessions?.[0]?.count || 0} sessions · {pack.enrollments?.[0]?.count || 0} students
                  </p>
                  <p className="text-sm font-semibold text-[#2563EB] mb-4">{pack.currency} {pack.price}</p>
                  <div className="flex items-center gap-2">
                    <Link to={`/creator/packs/edit/${pack.id}`} className="btn-ghost text-xs px-3 py-2 flex-1 justify-center border-[#E2E8F0] border">
                      <Edit3 size={13} /> Edit
                    </Link>
                    <button
                      onClick={() => togglePublish(pack)}
                      className={`btn-ghost text-xs px-3 py-2 flex-1 justify-center border ${
                        pack.is_published
                          ? 'border-[#E2E8F0] text-[#475569]'
                          : 'border-[#2563EB] text-[#2563EB]'
                      }`}
                    >
                      <Globe size={13} /> {pack.is_published ? 'Unpublish' : 'Publish'}
                    </button>
                    <button
                      onClick={() => setDeleteModal(pack.id)}
                      className="p-2 text-[#94A6B8] hover:text-[#C0392B] transition-colors rounded-lg hover:bg-red-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        <Modal isOpen={!!deleteModal} onClose={() => setDeleteModal(null)} title="Delete Pack?">
          <p className="text-sm text-[#475569] mb-8 leading-relaxed">
            This will permanently delete this pack and all its sessions. This action cannot be undone.
          </p>
          <div className="flex gap-4">
            <button onClick={() => setDeleteModal(null)} className="btn-ghost flex-1 py-3 border border-[#E2E8F0]">Cancel</button>
            <button onClick={() => deletePack(deleteModal)} className="btn-danger flex-1 py-3 bg-[#C0392B] text-white border-[#C0392B]">Delete</button>
          </div>
        </Modal>
      </div>
    </PageTransition>
  );
}
