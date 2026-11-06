import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Package,
  PlusCircle,
  Edit3,
  Trash2,
  Eye,
  Users,
  Lock,
  EyeOff,
  KeyRound,
  Check,
  Layers,
  Search,
  X,
  Sparkles,
  Video,
  ArrowRight,
  Globe,
  AlertTriangle,
  FolderOpen,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { PageTransition, GoldBadge, Skeleton, EmptyState, Modal, ShareMenu } from '../components/ui';
import { useSubscriptionGuard } from '../hooks/useSubscriptionGuard';
import { getPackShareUrl } from '../lib/utils';
import './my-packs.css';

export default function MyPacks() {
  useSubscriptionGuard();
  const { user } = useAuth();
  const [packs, setPacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [copiedInviteId, setCopiedInviteId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'multi' | 'single' | 'published' | 'draft' | 'private'
  const [toastMsg, setToastMsg] = useState('');

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2800);
  };

  const handleCopyInviteLink = (pack) => {
    const shareUrl = getPackShareUrl(pack, { includeInvite: true });
    navigator.clipboard.writeText(shareUrl);
    setCopiedInviteId(pack.id);
    showToast('Secret invite link copied to clipboard! 📋');
    setTimeout(() => setCopiedInviteId(null), 2200);
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
    try {
      // Clean up child sub-pack sessions and sub-packs if deleting a Multi-Pack
      const childIds = packs.filter(p => p.parent_pack_id === deleteModal).map(p => p.id);
      if (childIds.length > 0) {
        await supabase.from('sessions').delete().in('pack_id', childIds);
        await supabase.from('session_packs').delete().in('id', childIds);
      }
      await supabase.from('sessions').delete().eq('pack_id', deleteModal);
      await supabase.from('session_packs').delete().eq('id', deleteModal);
      showToast('Course pack deleted successfully');
      setDeleteModal(null);
      fetchPacks();
    } catch (err) {
      console.error('Delete error:', err);
      showToast('Failed to delete pack: ' + err.message);
    } finally {
      setDeleting(false);
    }
  };

  const togglePublish = async (pack) => {
    const next = !pack.is_published;
    setPacks(prev => prev.map(p => p.id === pack.id ? { ...p, is_published: next } : p));
    await supabase
      .from('session_packs')
      .update({ is_published: next })
      .eq('id', pack.id);
    showToast(next ? `"${pack.title}" published! 🚀` : `"${pack.title}" saved as draft 📝`);
  };

  // Grouping & Data Parsing
  const topLevelPacks = useMemo(() => packs.filter(p => !p.parent_pack_id), [packs]);

  const subPacksByParent = useMemo(() => {
    return packs.reduce((acc, p) => {
      if (p.parent_pack_id) {
        if (!acc[p.parent_pack_id]) acc[p.parent_pack_id] = [];
        acc[p.parent_pack_id].push(p);
      }
      return acc;
    }, {});
  }, [packs]);

  // Overall statistics
  const stats = useMemo(() => {
    const totalCourses = topLevelPacks.length;
    const multiCount = topLevelPacks.filter(p => p.is_multi_pack).length;
    const singleCount = totalCourses - multiCount;
    const publishedCount = topLevelPacks.filter(p => p.is_published).length;
    const draftCount = totalCourses - publishedCount;
    const privateCount = topLevelPacks.filter(p => p.visibility === 'private' || p.visibility === 'unlisted').length;

    let totalLearners = 0;
    let totalSessions = 0;

    packs.forEach(p => {
      totalLearners += (p.enrollments?.[0]?.count || 0);
      totalSessions += (p.sessions?.[0]?.count || 0);
    });

    return {
      totalCourses,
      multiCount,
      singleCount,
      publishedCount,
      draftCount,
      privateCount,
      totalLearners,
      totalSessions,
    };
  }, [topLevelPacks, packs]);

  // Filtered & Searched List
  const filteredPacks = useMemo(() => {
    return topLevelPacks.filter(p => {
      // Filter tab
      if (activeFilter === 'multi' && !p.is_multi_pack) return false;
      if (activeFilter === 'single' && p.is_multi_pack) return false;
      if (activeFilter === 'published' && !p.is_published) return false;
      if (activeFilter === 'draft' && p.is_published) return false;
      if (activeFilter === 'private' && p.visibility !== 'private' && p.visibility !== 'unlisted') return false;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const titleMatch = (p.title || '').toLowerCase().includes(query);
        const catMatch = (p.category || '').toLowerCase().includes(query);
        const descMatch = (p.description || '').toLowerCase().includes(query);
        const priceMatch = String(p.price || '').toLowerCase().includes(query);
        return titleMatch || catMatch || descMatch || priceMatch;
      }

      return true;
    });
  }, [topLevelPacks, activeFilter, searchQuery]);

  const deletingPackObj = packs.find(p => p.id === deleteModal);

  return (
    <PageTransition>
      <div className="mpk-container">
        {/* Floating Ambient Mesh Glow Orbs */}
        <div className="mpk-ambient-orb mpk-orb-1" aria-hidden="true" />
        <div className="mpk-ambient-orb mpk-orb-2" aria-hidden="true" />
        <div className="mpk-ambient-orb mpk-orb-3" aria-hidden="true" />

        {/* Hero Header Section */}
        <motion.div
          className="mpk-hero"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="mpk-hero-top">
            <div>
              <div className="mpk-hero-tag">
                <span className="tag-dot" />
                <span>Creator Studio Hub</span>
              </div>
              <h1 className="mpk-hero-title">
                My <span className="mpk-title-gradient">Course Packs</span> & Showcases
              </h1>
              <p className="mpk-hero-sub">
                Manage your single masterclasses and Multi-Pack course batches. Track student enrollment, publish recordings, and share private invite links.
              </p>
            </div>

            <div className="mpk-hero-actions">
              <Link to="/creator/multi-packs/new" className="mpk-btn-multi">
                <span className="btn-icon-float">
                  <Layers size={17} />
                </span>
                <span>New Multi-Pack</span>
              </Link>
              <Link to="/creator/packs/new" className="mpk-btn-new">
                <span className="btn-plus-spin">
                  <PlusCircle size={17} />
                </span>
                <span>New Pack</span>
              </Link>
            </div>
          </div>

          {/* Stats Ribbon */}
          <div className="mpk-stats-ribbon">
            <div className="mpk-stat-item">
              <div className="mpk-stat-icon icon-blue">
                <Package size={20} />
              </div>
              <div>
                <div className="mpk-stat-val">{stats.totalCourses}</div>
                <div className="mpk-stat-lbl">{stats.multiCount} Multi · {stats.singleCount} Single</div>
              </div>
            </div>

            <div className="mpk-stat-item">
              <div className="mpk-stat-icon icon-violet">
                <Users size={20} />
              </div>
              <div>
                <div className="mpk-stat-val">{stats.totalLearners}</div>
                <div className="mpk-stat-lbl">Active Learners</div>
              </div>
            </div>

            <div className="mpk-stat-item">
              <div className="mpk-stat-icon icon-emerald">
                <Video size={20} />
              </div>
              <div>
                <div className="mpk-stat-val">{stats.totalSessions}</div>
                <div className="mpk-stat-lbl">Live & Recorded Sessions</div>
              </div>
            </div>

            <div className="mpk-stat-item">
              <div className="mpk-stat-icon icon-amber">
                <Globe size={20} />
              </div>
              <div>
                <div className="mpk-stat-val">{stats.publishedCount} / {stats.totalCourses}</div>
                <div className="mpk-stat-lbl">{stats.privateCount} Private · {stats.draftCount} Draft</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Toolbar: Live Search & Filter Pills */}
        <div className="mpk-toolbar">
          <div className="mpk-search-box">
            <Search size={16} className="mpk-search-icon" />
            <input
              type="text"
              placeholder="Search by course title, category, price..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mpk-search-input"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="mpk-search-clear"
                title="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <div className="mpk-filter-pills" role="tablist">
            <button
              type="button"
              className={`mpk-filter-pill ${activeFilter === 'all' ? 'active' : ''}`}
              onClick={() => setActiveFilter('all')}
            >
              <span>All Courses</span>
              <span className="mpk-pill-count">{stats.totalCourses}</span>
            </button>
            <button
              type="button"
              className={`mpk-filter-pill filter-multi ${activeFilter === 'multi' ? 'active' : ''}`}
              onClick={() => setActiveFilter('multi')}
            >
              <Layers size={13} />
              <span>Multi-Packs</span>
              <span className="mpk-pill-count">{stats.multiCount}</span>
            </button>
            <button
              type="button"
              className={`mpk-filter-pill ${activeFilter === 'single' ? 'active' : ''}`}
              onClick={() => setActiveFilter('single')}
            >
              <Package size={13} />
              <span>Single Packs</span>
              <span className="mpk-pill-count">{stats.singleCount}</span>
            </button>
            <button
              type="button"
              className={`mpk-filter-pill ${activeFilter === 'published' ? 'active' : ''}`}
              onClick={() => setActiveFilter('published')}
            >
              <span style={{ color: '#10b981' }}>●</span>
              <span>Published</span>
              <span className="mpk-pill-count">{stats.publishedCount}</span>
            </button>
            <button
              type="button"
              className={`mpk-filter-pill ${activeFilter === 'draft' ? 'active' : ''}`}
              onClick={() => setActiveFilter('draft')}
            >
              <span style={{ color: '#f59e0b' }}>●</span>
              <span>Drafts</span>
              <span className="mpk-pill-count">{stats.draftCount}</span>
            </button>
            <button
              type="button"
              className={`mpk-filter-pill ${activeFilter === 'private' ? 'active' : ''}`}
              onClick={() => setActiveFilter('private')}
            >
              <Lock size={12} />
              <span>Private</span>
              <span className="mpk-pill-count">{stats.privateCount}</span>
            </button>
          </div>
        </div>

        {/* Content Section: Loading Skeletons, Empty State, or Masterpiece Cards */}
        {loading ? (
          <div className="mpk-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="mpk-card" style={{ height: 420 }}>
                <Skeleton className="h-44 w-full" />
                <div className="p-5 flex flex-col gap-3 flex-1">
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-5 w-20" />
                  <div className="mt-auto pt-4 border-t border-slate-100 flex gap-2">
                    <Skeleton className="h-10 flex-1 rounded-xl" />
                    <Skeleton className="h-10 w-16 rounded-xl" />
                    <Skeleton className="h-10 w-10 rounded-xl" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredPacks.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-md rounded-3xl border border-slate-200/80 p-8 shadow-sm">
            <EmptyState
              icon={searchQuery || activeFilter !== 'all' ? FolderOpen : Package}
              title={
                searchQuery
                  ? `No course packs matching "${searchQuery}"`
                  : activeFilter !== 'all'
                  ? `No ${activeFilter} course packs found`
                  : "No session packs yet"
              }
              description={
                searchQuery
                  ? "Try searching with a different term or clear the search filter."
                  : "Create your first single masterclass or a Multi-Pack batch container to start teaching learners."
              }
              action={
                searchQuery || activeFilter !== 'all' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setActiveFilter('all');
                    }}
                    className="btn-primary text-sm py-2.5 px-6 rounded-full"
                  >
                    Reset Filters
                  </button>
                ) : (
                  <div className="flex flex-wrap items-center justify-center gap-3.5">
                    <Link to="/creator/multi-packs/new" className="mpk-btn-multi">
                      <Layers size={16} /> Create Multi-Pack
                    </Link>
                    <Link to="/creator/packs/new" className="mpk-btn-new">
                      <PlusCircle size={16} /> Create Normal Pack
                    </Link>
                  </div>
                )
              }
            />
          </div>
        ) : (
          <motion.div layout className="mpk-grid">
            <AnimatePresence>
              {filteredPacks.map((pack, i) => {
                const isMulti = Boolean(pack.is_multi_pack);
                const children = subPacksByParent[pack.id] || [];
                const totalStudents = isMulti
                  ? children.reduce((sum, c) => sum + (c.enrollments?.[0]?.count || 0), 0)
                  : (pack.enrollments?.[0]?.count || 0);
                const totalSessions = isMulti
                  ? children.reduce((sum, c) => sum + (c.sessions?.[0]?.count || 0), 0)
                  : (pack.sessions?.[0]?.count || 0);
                const isFree = Number(pack.price) === 0;

                return (
                  <motion.div
                    key={pack.id}
                    layout
                    initial={{ opacity: 0, y: 22, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{
                      duration: 0.35,
                      delay: Math.min(i * 0.05, 0.3),
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    className={`mpk-card ${isMulti ? 'is-multi-card' : ''}`}
                  >
                    {/* Thumbnail & Badges Container */}
                    <div className="mpk-card-media">
                      {pack.thumbnail_url ? (
                        <img
                          src={pack.thumbnail_url}
                          alt={pack.title}
                          className="mpk-card-img"
                          loading="lazy"
                        />
                      ) : (
                        <div className={`mpk-media-fallback ${isMulti ? 'fallback-multi' : 'fallback-single'}`}>
                          <div className="mpk-fallback-ring" />
                          <div className="mpk-fallback-icon">
                            {isMulti ? (
                              <Layers size={46} className="text-white/90 drop-shadow-md" />
                            ) : (
                              <Package size={46} className="text-white/90 drop-shadow-md" />
                            )}
                          </div>
                        </div>
                      )}

                      {/* Scrim Gradient */}
                      <div className="mpk-media-scrim" />

                      {/* Floating Top-Left Badges */}
                      <div className="mpk-media-badges-left">
                        {isMulti && (
                          <span className="mpk-badge-multi">
                            <span className="badge-pulse-dot" />
                            <Layers size={11} />
                            <span>Multi-Pack · {children.length} Batch{children.length !== 1 ? 'es' : ''}</span>
                          </span>
                        )}
                        {pack.visibility === 'private' && (
                          <span className="mpk-badge-private">
                            <Lock size={11} /> Private (Invite)
                          </span>
                        )}
                        {pack.visibility === 'unlisted' && (
                          <span className="mpk-badge-unlisted">
                            <EyeOff size={11} /> Unlisted
                          </span>
                        )}
                        {!isMulti && isFree && (
                          <span className="mpk-badge-free">
                            <Sparkles size={11} /> 100% Free Access
                          </span>
                        )}
                        {!isMulti && !isFree && pack.has_free_session && (
                          <GoldBadge className="text-[10.5px]">Free Preview</GoldBadge>
                        )}
                      </div>

                      {/* Floating Top-Right Share Action */}
                      <div className="mpk-media-actions-right">
                        <ShareMenu
                          url={getPackShareUrl(pack, { includeInvite: true })}
                          title={pack.title}
                          pack={pack}
                        />
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="mpk-card-body">
                      {/* Category & Status Switch */}
                      <div className="mpk-card-meta-row">
                        <span className={`mpk-category-pill ${isMulti ? 'multi-cat' : ''}`}>
                          {pack.category || (isMulti ? 'Multi-Course' : 'General')}
                        </span>

                        <button
                          type="button"
                          onClick={() => togglePublish(pack)}
                          className={`mpk-status-switch ${pack.is_published ? 'is-published' : 'is-draft'}`}
                          title={`Click to ${pack.is_published ? 'unpublish (move to draft)' : 'publish course'}`}
                        >
                          <span className="mpk-status-led" />
                          <span>{pack.is_published ? 'Published' : 'Draft'}</span>
                        </button>
                      </div>

                      {/* Course Title */}
                      <h3 className="mpk-card-title" title={pack.title}>
                        {pack.title}
                      </h3>

                      {/* Pricing Tag */}
                      <div className="mpk-pricing-tag">
                        {isMulti ? (
                          <>
                            <span className="mpk-price-main">Multi-Pack</span>
                            <span className="mpk-price-sub">
                              ({children.length} Sub-Pack{children.length !== 1 ? 's' : ''})
                            </span>
                          </>
                        ) : isFree ? (
                          <>
                            <span className="mpk-price-main price-free">100% Free</span>
                            <span className="mpk-price-sub">No payment required</span>
                          </>
                        ) : (
                          <>
                            <span className="mpk-price-main">
                              {pack.currency} {Number(pack.price || 0).toLocaleString()}
                            </span>
                            <span className="mpk-price-sub">one-time payment</span>
                          </>
                        )}
                      </div>

                      {/* Multi-Pack Sub-Batches Visual Strip */}
                      {isMulti && children.length > 0 && (
                        <div className="mpk-batch-preview-strip">
                          {children.slice(0, 3).map((child, idx) => (
                            <span key={child.id || idx} className="mpk-batch-pill-chip">
                              <span>#{idx + 1}</span> {child.title}
                            </span>
                          ))}
                          {children.length > 3 && (
                            <span className="mpk-batch-more-chip">
                              +{children.length - 3} more
                            </span>
                          )}
                        </div>
                      )}

                      {/* Stats Row */}
                      <div className="mpk-card-stats-row">
                        <span className="mpk-card-stat">
                          <Users size={14} className="text-blue-500" />
                          <span><b>{totalStudents}</b> student{totalStudents !== 1 ? 's' : ''}</span>
                        </span>
                        <span>·</span>
                        <span className="mpk-card-stat">
                          <Video size={14} className="text-violet-500" />
                          <span><b>{totalSessions}</b> session{totalSessions !== 1 ? 's' : ''}</span>
                        </span>
                      </div>

                      {/* Secret Invite Link Magnetic Strip (For Private / Unlisted) */}
                      {(pack.visibility === 'private' || pack.visibility === 'unlisted') && (
                        <div className="mpk-secret-invite-strip">
                          <div className="mpk-invite-info">
                            <KeyRound size={13} style={{ flexShrink: 0 }} />
                            <span>Secret Link: <b>{pack.invite_token || 'Available'}</b></span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopyInviteLink(pack)}
                            className={`mpk-btn-copy-chip ${copiedInviteId === pack.id ? 'copied' : ''}`}
                            title="Copy secret invite link to share with students"
                          >
                            {copiedInviteId === pack.id ? (
                              <>
                                <Check size={12} /> Copied!
                              </>
                            ) : (
                              'Copy Link'
                            )}
                          </button>
                        </div>
                      )}

                      {/* Action Buttons Toolbar */}
                      <div className="mpk-card-actions">
                        {isMulti ? (
                          <Link
                            to={`/creator/multi-packs/${pack.id}`}
                            className="mpk-action-batches"
                            title="Manage batches, order and sequential unlock"
                          >
                            <Layers size={14} />
                            <span>Manage Batches</span>
                            <ArrowRight size={13} className="arrow-glide" />
                          </Link>
                        ) : (
                          <Link
                            to={`/creator/packs/${pack.id}/edit`}
                            className="mpk-action-edit"
                            title="Edit pack details, pricing and sessions"
                          >
                            <Edit3 size={14} className="edit-icon-tilt" />
                            <span>Edit Course</span>
                          </Link>
                        )}

                        <Link
                          to={`/creator/packs/${pack.id}`}
                          className="mpk-action-view"
                          title="View public preview as seen by students"
                        >
                          <Eye size={14} className="eye-icon-zoom" />
                          <span>Preview</span>
                        </Link>

                        <button
                          type="button"
                          onClick={() => setDeleteModal(pack.id)}
                          className="mpk-action-delete"
                          title={isMulti ? "Delete Multi-Pack" : "Delete Pack"}
                          aria-label="Delete pack"
                        >
                          <Trash2 size={15} className="trash-icon-shake" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={Boolean(deleteModal)}
          onClose={() => setDeleteModal(null)}
          title={deletingPackObj?.is_multi_pack ? 'Delete Multi-Pack?' : 'Delete Session Pack?'}
        >
          <div className="text-center py-2">
            <div className="mpk-modal-danger-icon">
              <AlertTriangle size={28} />
            </div>

            <p className="text-base font-bold text-[#0F172A] mb-2">
              Are you sure you want to delete "{deletingPackObj?.title}"?
            </p>

            <p className="text-sm text-[#475569] mb-6 leading-relaxed max-w-sm mx-auto">
              {deletingPackObj?.is_multi_pack
                ? 'This will permanently remove this Multi-Pack along with ALL of its sub-packs, schedules, and attached session records. This action cannot be reversed.'
                : 'This will permanently remove this course pack and all its session records. Enrolled students will lose direct course access.'}
            </p>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setDeleteModal(null)}
                className="btn-ghost flex-1 py-3 border border-slate-200 rounded-xl font-semibold"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="btn-danger flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white border-rose-600 rounded-xl font-bold shadow-md shadow-rose-600/30"
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </Modal>

        {/* Floating Quick Toast Notification */}
        {toastMsg && (
          <div className="mpk-toast" role="status">
            <span>✨</span>
            <span>{toastMsg}</span>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
