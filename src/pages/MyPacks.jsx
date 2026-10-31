import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Package, PlusCircle, Edit3, Trash2, Eye, Users, Lock, EyeOff, KeyRound, Check, Layers } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { PageTransition, GoldBadge, Skeleton, EmptyState, Modal, ShareMenu } from '../components/ui';
import { useSubscriptionGuard } from '../hooks/useSubscriptionGuard';
import { getPackShareUrl } from '../lib/utils';

export default function MyPacks() {
  useSubscriptionGuard();
  const { user } = useAuth();
  const [packs, setPacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [copiedInviteId, setCopiedInviteId] = useState(null);

  const handleCopyInviteLink = (pack) => {
    const shareUrl = getPackShareUrl(pack, { includeInvite: true });
    navigator.clipboard.writeText(shareUrl);
    setCopiedInviteId(pack.id);
    setTimeout(() => setCopiedInviteId(null), 2000);
  };

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
    // Clean up child sub-pack sessions and sub-packs if deleting a Multi-Pack
    const childIds = packs.filter(p => p.parent_pack_id === deleteModal).map(p => p.id);
    if (childIds.length > 0) {
      await supabase.from('sessions').delete().in('pack_id', childIds);
      await supabase.from('session_packs').delete().in('id', childIds);
    }
    await supabase.from('sessions').delete().eq('pack_id', deleteModal);
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

  const topLevelPacks = packs.filter(p => !p.parent_pack_id);
  const subPacksByParent = packs.reduce((acc, p) => {
    if (p.parent_pack_id) {
      if (!acc[p.parent_pack_id]) acc[p.parent_pack_id] = [];
      acc[p.parent_pack_id].push(p);
    }
    return acc;
  }, {});
  const deletingPackObj = packs.find(p => p.id === deleteModal);

  return (
    <PageTransition>
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#0F172A]" style={{ fontFamily: 'var(--font-heading)' }}>
              My Session Packs
            </h1>
            <p className="text-sm text-[#475569] mt-2">{topLevelPacks.length} course{topLevelPacks.length !== 1 ? 's' : ''} created</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/creator/multi-packs/new"
              className="btn-ghost text-sm py-3 px-5 border-2 border-[#BFDBFE] bg-[#EFF6FF] text-[#2563EB] hover:bg-[#DBEAFE] font-semibold"
            >
              <Layers size={16} /> New Multi-Pack
            </Link>
            <Link to="/creator/packs/new" className="btn-primary text-sm py-3 px-6">
              <PlusCircle size={16} /> New Pack
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        ) : topLevelPacks.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No session packs yet"
            description="Create a normal session pack or a Multi-Pack with monthly/batch sub-packs to start teaching."
            action={
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Link to="/creator/packs/new" className="btn-primary text-sm py-2.5 px-6">
                  <PlusCircle size={16} /> Create Normal Pack
                </Link>
                <Link to="/creator/multi-packs/new" className="btn-ghost text-sm py-2.5 px-5 border border-[#BFDBFE] bg-[#EFF6FF] text-[#2563EB]">
                  <Layers size={16} /> Create Multi-Pack
                </Link>
              </div>
            }
          />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
            {topLevelPacks.map((pack, i) => {
              const isMulti = Boolean(pack.is_multi_pack);
              const children = subPacksByParent[pack.id] || [];
              const totalStudents = isMulti
                ? children.reduce((sum, c) => sum + (c.enrollments?.[0]?.count || 0), 0)
                : (pack.enrollments?.[0]?.count || 0);
              const totalSessions = isMulti
                ? children.reduce((sum, c) => sum + (c.sessions?.[0]?.count || 0), 0)
                : (pack.sessions?.[0]?.count || 0);

              return (
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
                      {isMulti ? <Layers size={36} className="text-[#93C5FD]" /> : <Package size={36} className="text-[#E2E8F0]" />}
                    </div>
                  )}
                  <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                    {isMulti && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[#2563EB]/95 text-white backdrop-blur-sm shadow-sm">
                        <Layers size={11} /> Multi-Pack · {children.length} Batch{children.length !== 1 ? 'es' : ''}
                      </span>
                    )}
                    {pack.visibility === 'private' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#5B21B6]/90 text-white backdrop-blur-sm shadow-sm">
                        <Lock size={11} /> Private
                      </span>
                    )}
                    {pack.visibility === 'unlisted' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#0F172A]/90 text-white backdrop-blur-sm shadow-sm">
                        <EyeOff size={11} /> Unlisted
                      </span>
                    )}
                  </div>
                  <div className="absolute top-3 right-3 flex items-center gap-2">
                    {!isMulti && pack.has_free_session && <GoldBadge>Free Session</GoldBadge>}
                    <ShareMenu url={getPackShareUrl(pack, { includeInvite: true })} title={pack.title} pack={pack} />
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

                  <p className="text-xs text-[#94A6B8] mb-4">
                    {pack.category} ·{' '}
                    {isMulti
                      ? `Multi-Course (${children.length} Sub-Pack${children.length !== 1 ? 's' : ''})`
                      : `${pack.currency} ${pack.price}`}
                  </p>

                  <div className="flex items-center gap-4 text-xs text-[#94A6B8] mb-5">
                    <span className="flex items-center gap-1">
                      <Users size={13} /> {totalStudents} students
                    </span>
                    <span>{totalSessions} sessions</span>
                  </div>

                  {(pack.visibility === 'private' || pack.visibility === 'unlisted') && (
                    <button
                      type="button"
                      onClick={() => handleCopyInviteLink(pack)}
                      className="mb-4 w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold bg-[#F5F3FF] text-[#6D28D9] border border-[#DDD6FE] hover:bg-[#EDE9FE] transition-colors cursor-pointer"
                    >
                      {copiedInviteId === pack.id ? (
                        <>
                          <Check size={13} /> Copied Secret Invite Link!
                        </>
                      ) : (
                        <>
                          <KeyRound size={13} /> Copy Secret Invite Link
                        </>
                      )}
                    </button>
                  )}

                  <div className="flex items-center gap-2.5 mt-auto pt-4 border-t border-[#E2E8F0]">
                    <Link
                      to={isMulti ? `/creator/multi-packs/${pack.id}` : `/creator/packs/${pack.id}/edit`}
                      className={`btn-ghost text-xs py-1.5 px-3 flex-1 justify-center border ${
                        isMulti ? 'border-[#BFDBFE] bg-[#EFF6FF] text-[#2563EB] font-semibold' : 'border-[#E2E8F0]'
                      }`}
                    >
                      {isMulti ? <><Layers size={13} /> Batches</> : <><Edit3 size={13} /> Edit</>}
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
              );
            })}
          </div>
        )}

        {/* Delete confirmation modal */}
        <Modal isOpen={!!deleteModal} onClose={() => setDeleteModal(null)} title={deletingPackObj?.is_multi_pack ? 'Delete Multi-Pack?' : 'Delete Pack?'}>
          <p className="text-sm text-[#475569] mb-6">
            {deletingPackObj?.is_multi_pack
              ? 'This will permanently delete this Main Multi-Pack AND all of its monthly/batch Sub-Packs and sessions. This action cannot be undone.'
              : 'This will permanently delete this session pack and all its sessions. This action cannot be undone.'}
          </p>
          <div className="flex gap-3">
            <button onClick={() => setDeleteModal(null)} className="btn-ghost flex-1 border border-[#E2E8F0]">Cancel</button>
            <button onClick={handleDelete} className="btn-danger bg-[#C0392B] text-white flex-1 border-[#C0392B]" disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </Modal>
      </div>
    </PageTransition>
  );
}
