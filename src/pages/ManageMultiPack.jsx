import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import {
  Layers,
  PlusCircle,
  Edit3,
  Trash2,
  Eye,
  Users,
  Calendar,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Lock,
  Unlock,
  Globe2,
  EyeOff,
  KeyRound,
  Check,
  Loader2,
  GitBranch,
  Settings,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { PageTransition, Modal, ShareMenu, Skeleton } from '../components/ui';
import { useSubscriptionGuard } from '../hooks/useSubscriptionGuard';
import { getPackShareUrl, generateInviteToken, generateUniquePackSlug } from '../lib/utils';

const CATEGORIES = ['Technology', 'Design', 'Business', 'Language', 'Music', 'Fitness', 'Other'];
const CURRENCIES = ['USD', 'EUR', 'GBP', 'BDT', 'INR', 'PKR', 'NGN', 'KES', 'PHP', 'BRL', 'LKR'];

export default function ManageMultiPack() {
  useSubscriptionGuard();
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [pack, setPack] = useState(null);
  const [subPacks, setSubPacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('subpacks'); // 'subpacks' | 'details'

  const [savingMain, setSavingMain] = useState(false);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbPreview, setThumbPreview] = useState(null);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [deleteSubModal, setDeleteSubModal] = useState(null);
  const [deletingSub, setDeletingSub] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2800);
  };

  const fetchMultiPackData = async () => {
    setLoading(true);
    const [mainRes, subRes] = await Promise.all([
      supabase.from('session_packs').select('*').eq('id', id).maybeSingle(),
      supabase
        .from('session_packs')
        .select('*, sessions(count), enrollments(count)')
        .eq('parent_pack_id', id)
        .order('sub_pack_order', { ascending: true })
        .order('created_at', { ascending: true }),
    ]);

    if (mainRes.data) {
      if (!mainRes.data.is_multi_pack) {
        navigate(`/creator/packs/${id}/edit`, { replace: true });
        return;
      }
      setPack({
        ...mainRes.data,
        visibility: mainRes.data.visibility || 'public',
        invite_token: mainRes.data.invite_token || generateInviteToken(),
      });
      setThumbPreview(mainRes.data.thumbnail_url);
    }

    setSubPacks(subRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (user && id) fetchMultiPackData();
  }, [user, id]);

  const toggleMainPublish = async () => {
    if (!pack) return;
    const next = !pack.is_published;
    await supabase.from('session_packs').update({ is_published: next }).eq('id', pack.id);
    setPack(prev => ({ ...prev, is_published: next }));
    showToast(next ? 'Main course published!' : 'Main course moved to draft');
  };

  const toggleSubPublish = async (sub) => {
    const next = !sub.is_published;
    await supabase.from('session_packs').update({ is_published: next }).eq('id', sub.id);
    setSubPacks(prev => prev.map(s => (s.id === sub.id ? { ...s, is_published: next } : s)));
    showToast(next ? `"${sub.title}" published` : `"${sub.title}" unpublished`);
  };

  const toggleSubRequirePrevious = async (sub) => {
    const next = !sub.require_previous_pack;
    await supabase.from('session_packs').update({ require_previous_pack: next }).eq('id', sub.id);
    setSubPacks(prev => prev.map(s => (s.id === sub.id ? { ...s, require_previous_pack: next } : s)));
    showToast(
      next
        ? `"${sub.title}" now requires enrolling in the previous batch first`
        : `"${sub.title}" is now open for direct enrollment`
    );
  };

  const moveSubPack = async (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= subPacks.length) return;

    const updated = [...subPacks];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);

    const reindexed = updated.map((item, idx) => ({ ...item, sub_pack_order: idx }));
    setSubPacks(reindexed);

    await Promise.all(
      reindexed.map(item =>
        supabase.from('session_packs').update({ sub_pack_order: item.sub_pack_order }).eq('id', item.id)
      )
    );
    showToast('Batch order updated');
  };

  const handleDeleteSubPack = async () => {
    if (!deleteSubModal) return;
    setDeletingSub(true);
    await supabase.from('sessions').delete().eq('pack_id', deleteSubModal.id);
    await supabase.from('session_packs').delete().eq('id', deleteSubModal.id);
    setDeleteSubModal(null);
    setDeletingSub(false);
    showToast('Sub-pack deleted');
    fetchMultiPackData();
  };

  const handleSaveMainDetails = async (e) => {
    e.preventDefault();
    if (!pack) return;
    setSavingMain(true);
    try {
      let thumbnailUrl = pack.thumbnail_url;
      if (thumbnailFile) {
        const ext = thumbnailFile.name.split('.').pop();
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        await supabase.storage.from('thumbnails').upload(path, thumbnailFile);
        const { data: urlData } = supabase.storage.from('thumbnails').getPublicUrl(path);
        thumbnailUrl = urlData.publicUrl;
      }

      const updatePayload = {
        title: pack.title.trim(),
        description: pack.description?.trim() || '',
        category: pack.category,
        currency: pack.currency,
        visibility: pack.visibility || 'public',
        invite_token: pack.invite_token || generateInviteToken(),
        sequential_unlock: Boolean(pack.sequential_unlock),
        thumbnail_url: thumbnailUrl,
        intro_video_url: pack.intro_video_url || null,
        whatsapp_number: pack.whatsapp_number || null,
        whatsapp_link: pack.whatsapp_link || null,
        telegram_link: pack.telegram_link || null,
      };

      if (!pack.slug && pack.title) {
        updatePayload.slug = await generateUniquePackSlug(pack.title, pack.id);
      }

      const { error } = await supabase.from('session_packs').update(updatePayload).eq('id', pack.id);
      if (error) throw error;

      setPack(prev => ({ ...prev, ...updatePayload }));
      setThumbnailFile(null);
      showToast('Main course details saved!');
    } catch (err) {
      alert('Failed to update Multi-Pack: ' + err.message);
    } finally {
      setSavingMain(false);
    }
  };

  const handleCopyInvite = () => {
    const shareUrl = getPackShareUrl(pack, { includeInvite: true });
    navigator.clipboard.writeText(shareUrl);
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 2000);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-72" />
        <Skeleton className="h-36 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (!pack) {
    return (
      <div className="text-center py-20">
        <p className="text-[#64748B] mb-4">Multi-Pack not found.</p>
        <Link to="/creator/packs" className="btn-primary py-2.5 px-6">
          Back to My Packs
        </Link>
      </div>
    );
  }

  const totalStudents = subPacks.reduce((acc, s) => acc + (s.enrollments?.[0]?.count || 0), 0);

  return (
    <PageTransition>
      <div className="max-w-5xl mx-auto">
        {/* Breadcrumb */}
        <Link
          to="/creator/packs"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#64748B] hover:text-[#2563EB] mb-5 transition-colors"
        >
          <ArrowLeft size={15} /> Back to My Session Packs
        </Link>

        {/* Hero Summary Card */}
        <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-[0_4px_24px_rgba(15,23,42,0.05)] p-6 sm:p-8 mb-7">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-start gap-5">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-[#EFF6FF] border border-[#DBEAFE] overflow-hidden flex-shrink-0 flex items-center justify-center">
                {thumbPreview ? (
                  <img src={thumbPreview} alt={pack.title} className="w-full h-full object-cover" />
                ) : (
                  <Layers size={32} className="text-[#2563EB]" />
                )}
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]">
                    <Layers size={12} /> Multi-Course Pack
                  </span>
                  <button
                    type="button"
                    onClick={toggleMainPublish}
                    className={`badge cursor-pointer ${pack.is_published ? 'badge-success' : 'badge-pending'}`}
                    title="Click to toggle Published / Draft"
                  >
                    {pack.is_published ? 'Published on Discover' : 'Draft (Hidden)'}
                  </button>
                  {pack.sequential_unlock && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#F5F3FF] text-[#6D28D9] border border-[#DDD6FE]">
                      <GitBranch size={11} /> Step-by-Step Order
                    </span>
                  )}
                </div>

                <h1 className="text-2xl sm:text-3xl font-bold text-[#0F172A]" style={{ fontFamily: 'var(--font-heading)' }}>
                  {pack.title}
                </h1>

                <p className="text-xs sm:text-sm text-[#64748B] mt-1.5">
                  <b>{subPacks.length}</b> Sub-Pack{subPacks.length !== 1 ? 's' : ''} ·{' '}
                  <b>{totalStudents}</b> total enrollment{totalStudents !== 1 ? 's' : ''} ·{' '}
                  {pack.category || 'Uncategorized'} · Default {pack.currency}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                to={`/creator/packs/new?parent=${pack.id}`}
                className="btn-primary text-sm py-3 px-5 shadow-md shadow-[#2563EB]/20"
              >
                <PlusCircle size={17} /> Create Sub-Pack
              </Link>
              <Link
                to={`/learner/pack/${pack.slug || pack.id}`}
                className="btn-ghost text-sm py-3 px-4 border border-[#E2E8F0]"
              >
                <Eye size={16} /> View Page
              </Link>
              <ShareMenu
                url={getPackShareUrl(pack, { includeInvite: true })}
                title={pack.title}
                pack={pack}
              />
            </div>
          </div>

          {(pack.visibility === 'private' || pack.visibility === 'unlisted') && (
            <div className="mt-5 pt-4 border-t border-[#F1F5F9] flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-[#5B21B6] font-medium flex items-center gap-1.5">
                <Lock size={13} /> This Multi-Pack is <b>{pack.visibility}</b>. Share your secret invite link so students can unlock it:
              </span>
              <button
                type="button"
                onClick={handleCopyInvite}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-[#F5F3FF] text-[#6D28D9] border border-[#DDD6FE] hover:bg-[#EDE9FE] cursor-pointer"
              >
                {copiedInvite ? <><Check size={13} /> Copied Invite Link!</> : <><KeyRound size={13} /> Copy Secret Invite Link</>}
              </button>
            </div>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-[#E2E8F0] mb-7">
          <button
            type="button"
            onClick={() => setActiveTab('subpacks')}
            className={`px-5 py-3 text-sm font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'subpacks'
                ? 'border-[#2563EB] text-[#2563EB]'
                : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            <Layers size={16} />
            Sub-Packs / Monthly Batches ({subPacks.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`px-5 py-3 text-sm font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'details'
                ? 'border-[#2563EB] text-[#2563EB]'
                : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            <Settings size={16} />
            Edit Main Course Info
          </button>
        </div>

        {/* TAB 1: SUB-PACKS LIST */}
        {activeTab === 'subpacks' && (
          <div>
            {subPacks.length === 0 ? (
              <div className="bg-white rounded-3xl border-2 border-dashed border-[#CBD5E1] p-10 sm:p-14 text-center">
                <div className="w-16 h-16 rounded-2xl bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center mx-auto mb-4">
                  <Calendar size={30} />
                </div>
                <h2 className="text-xl font-bold text-[#0F172A] mb-2">
                  Add your first Sub-Pack (Month or Batch)
                </h2>
                <p className="text-sm text-[#64748B] max-w-md mx-auto mb-6 leading-relaxed">
                  Create your first sub-pack — such as <b>&ldquo;August Month&rdquo;</b> or <b>&ldquo;1st Batch&rdquo;</b> — with its own thumbnail, price, and scheduled live or recorded sessions. Category, currency, and community links will be pre-filled automatically!
                </p>
                <Link
                  to={`/creator/packs/new?parent=${pack.id}`}
                  className="btn-primary text-sm py-3.5 px-7 inline-flex items-center gap-2"
                >
                  <PlusCircle size={18} /> Create First Sub-Pack
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {subPacks.map((sub, idx) => {
                  const sessionCount = sub.sessions?.[0]?.count || 0;
                  const studentCount = sub.enrollments?.[0]?.count || 0;
                  const effectiveLocked = idx > 0 && (Boolean(pack.sequential_unlock) || Boolean(sub.require_previous_pack));

                  return (
                    <div
                      key={sub.id}
                      className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm hover:shadow-md transition-all p-5 flex flex-col md:flex-row md:items-center gap-5"
                    >
                      {/* Order Controls + Number */}
                      <div className="flex md:flex-col items-center gap-1.5 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => moveSubPack(idx, -1)}
                          disabled={idx === 0}
                          className="p-1 rounded-lg border border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A] disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                          title="Move up"
                        >
                          <ArrowUp size={13} />
                        </button>
                        <span className="w-8 h-8 rounded-xl bg-[#EFF6FF] text-[#2563EB] text-xs font-extrabold flex items-center justify-center">
                          #{idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => moveSubPack(idx, 1)}
                          disabled={idx === subPacks.length - 1}
                          className="p-1 rounded-lg border border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A] disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                          title="Move down"
                        >
                          <ArrowDown size={13} />
                        </button>
                      </div>

                      {/* Sub-pack Thumbnail */}
                      <div className="w-full md:w-36 h-24 rounded-xl bg-[#F8FAFC] border border-[#F1F5F9] overflow-hidden flex-shrink-0">
                        {sub.thumbnail_url || pack.thumbnail_url ? (
                          <img
                            src={sub.thumbnail_url || pack.thumbnail_url}
                            alt={sub.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[#CBD5E1]">
                            <Layers size={24} />
                          </div>
                        )}
                      </div>

                      {/* Sub-pack Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="font-bold text-[#0F172A] text-base truncate">{sub.title}</h3>
                          <button
                            type="button"
                            onClick={() => toggleSubPublish(sub)}
                            className={`badge cursor-pointer text-[11px] ${sub.is_published ? 'badge-success' : 'badge-pending'}`}
                          >
                            {sub.is_published ? 'Published' : 'Draft'}
                          </button>
                        </div>

                        <p className="text-xs text-[#64748B] line-clamp-1 mb-2.5">
                          {sub.description || 'No description'}
                        </p>

                        <div className="flex flex-wrap items-center gap-4 text-xs text-[#475569]">
                          <span className="font-bold text-[#2563EB] text-sm">
                            {Number(sub.price) === 0 ? 'FREE' : `${sub.currency} ${sub.price}`}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar size={13} className="text-[#94A6B8]" /> {sessionCount} session{sessionCount !== 1 ? 's' : ''}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users size={13} className="text-[#94A6B8]" /> {studentCount} student{studentCount !== 1 ? 's' : ''}
                          </span>

                          {/* Per-sub-pack sequential lock toggle for Batch #2+ */}
                          {idx > 0 && !pack.sequential_unlock && (
                            <button
                              type="button"
                              onClick={() => toggleSubRequirePrevious(sub)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border cursor-pointer transition-colors ${
                                sub.require_previous_pack
                                  ? 'bg-[#F5F3FF] text-[#6D28D9] border-[#DDD6FE]'
                                  : 'bg-[#F8FAFC] text-[#64748B] border-[#E2E8F0] hover:border-[#CBD5E1]'
                              }`}
                              title="Toggle whether students must complete the previous batch before enrolling in this one"
                            >
                              {sub.require_previous_pack ? (
                                <>
                                  <Lock size={11} /> Requires Batch #{idx}
                                </>
                              ) : (
                                <>
                                  <Unlock size={11} /> Open to anyone
                                </>
                              )}
                            </button>
                          )}

                          {idx > 0 && pack.sequential_unlock && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#F5F3FF] text-[#6D28D9] border border-[#DDD6FE]">
                              <Lock size={11} /> Unlocks after Batch #{idx}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-3 md:pt-0 border-t md:border-t-0 border-[#F1F5F9]">
                        <Link
                          to={`/creator/packs/${sub.id}/edit`}
                          className="btn-ghost text-xs py-2 px-3.5 border border-[#E2E8F0]"
                        >
                          <Edit3 size={14} /> Edit
                        </Link>
                        <Link
                          to={`/learner/pack/${sub.slug || sub.id}`}
                          className="btn-ghost text-xs py-2 px-3.5 border border-[#E2E8F0]"
                        >
                          <Eye size={14} /> View
                        </Link>
                        <button
                          type="button"
                          onClick={() => setDeleteSubModal(sub)}
                          className="btn-ghost text-xs py-2 px-2.5 text-[#C0392B] hover:bg-red-50 border-transparent cursor-pointer"
                          title="Delete Sub-Pack"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  );
                })}

                <div className="pt-3">
                  <Link
                    to={`/creator/packs/new?parent=${pack.id}`}
                    className="w-full py-4 rounded-2xl border-2 border-dashed border-[#BFDBFE] bg-[#EFF6FF]/50 hover:bg-[#EFF6FF] text-[#2563EB] font-bold text-sm flex items-center justify-center gap-2 transition-colors"
                  >
                    <PlusCircle size={18} /> Add Next Month / Next Batch Sub-Pack
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: EDIT MAIN COURSE DETAILS */}
        {activeTab === 'details' && (
          <form
            onSubmit={handleSaveMainDetails}
            className="bg-white rounded-3xl border border-[#E2E8F0] p-6 sm:p-8 space-y-6"
          >
            <div>
              <h2 className="text-lg font-bold text-[#0F172A]">Main Course Showcase Settings</h2>
              <p className="text-xs text-[#64748B] mt-1">
                Changes here update the main course page shown on Discover and your Creator Profile.
              </p>
            </div>

            <div className="grid sm:grid-cols-3 gap-3">
              {[
                { id: 'public', label: 'Public', icon: Globe2 },
                { id: 'private', label: 'Private Showcase', icon: Lock },
                { id: 'unlisted', label: 'Unlisted (Hidden)', icon: EyeOff },
              ].map(opt => {
                const Icon = opt.icon;
                const active = (pack.visibility || 'public') === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setPack(prev => ({ ...prev, visibility: opt.id }))}
                    className={`p-3.5 rounded-xl border text-left flex items-center gap-2.5 text-sm font-semibold cursor-pointer transition-all ${
                      active
                        ? 'border-[#2563EB] bg-[#EFF6FF] text-[#2563EB]'
                        : 'border-[#E2E8F0] bg-white text-[#475569]'
                    }`}
                  >
                    <Icon size={16} />
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>

            <div>
              <label className="form-label">Main Course Title *</label>
              <input
                className="input-field"
                value={pack.title || ''}
                onChange={e => setPack(prev => ({ ...prev, title: e.target.value }))}
                required
              />
            </div>

            <div>
              <label className="form-label">Full Course Description *</label>
              <textarea
                rows={4}
                className="input-field"
                value={pack.description || ''}
                onChange={e => setPack(prev => ({ ...prev, description: e.target.value }))}
                required
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Category</label>
                <select
                  className="select-field"
                  value={pack.category || ''}
                  onChange={e => setPack(prev => ({ ...prev, category: e.target.value }))}
                >
                  <option value="">Select category</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Default Currency for New Sub-Packs</label>
                <select
                  className="select-field"
                  value={pack.currency || 'LKR'}
                  onChange={e => setPack(prev => ({ ...prev, currency: e.target.value }))}
                >
                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
                  <GitBranch size={15} className="text-[#6D28D9]" />
                  Require Step-by-Step Batch Progression (1st → 2nd → 3rd)
                </p>
                <p className="text-xs text-[#64748B] mt-1">
                  When enabled, learners must enroll in Batch #1 before unlocking Batch #2, and so on. Turn off to allow students to join any monthly sub-pack directly.
                </p>
              </div>
              <input
                type="checkbox"
                className="w-5 h-5 accent-[#2563EB] cursor-pointer flex-shrink-0"
                checked={Boolean(pack.sequential_unlock)}
                onChange={e => setPack(prev => ({ ...prev, sequential_unlock: e.target.checked }))}
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Main Cover Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setThumbnailFile(f);
                      setThumbPreview(URL.createObjectURL(f));
                    }
                  }}
                  className="text-sm text-[#475569]"
                />
              </div>
              <div>
                <label className="form-label">Intro Video URL (YouTube / Vimeo)</label>
                <input
                  type="url"
                  className="input-field"
                  placeholder="https://youtube.com/watch?v=..."
                  value={pack.intro_video_url || ''}
                  onChange={e => setPack(prev => ({ ...prev, intro_video_url: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="form-label">WhatsApp Inquiry Number</label>
                <PhoneInput
                  international
                  defaultCountry="LK"
                  value={pack.whatsapp_number || ''}
                  onChange={v => setPack(prev => ({ ...prev, whatsapp_number: v || '' }))}
                />
              </div>
              <div>
                <label className="form-label">Default WhatsApp Group</label>
                <input
                  type="url"
                  className="input-field"
                  placeholder="https://chat.whatsapp.com/..."
                  value={pack.whatsapp_link || ''}
                  onChange={e => setPack(prev => ({ ...prev, whatsapp_link: e.target.value }))}
                />
              </div>
              <div>
                <label className="form-label">Default Telegram Channel</label>
                <input
                  type="url"
                  className="input-field"
                  placeholder="https://t.me/..."
                  value={pack.telegram_link || ''}
                  onChange={e => setPack(prev => ({ ...prev, telegram_link: e.target.value }))}
                />
              </div>
            </div>

            <div className="pt-4 border-t border-[#F1F5F9] flex justify-end">
              <button type="submit" className="btn-primary py-3 px-7" disabled={savingMain}>
                {savingMain ? <Loader2 size={16} className="animate-spin" /> : 'Save Main Course Details'}
              </button>
            </div>
          </form>
        )}

        {/* Delete Sub-Pack Modal */}
        <Modal
          isOpen={Boolean(deleteSubModal)}
          onClose={() => setDeleteSubModal(null)}
          title="Delete Sub-Pack?"
        >
          <p className="text-sm text-[#475569] mb-6">
            Are you sure you want to permanently delete <b>{deleteSubModal?.title}</b> and all its scheduled sessions?
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setDeleteSubModal(null)}
              className="btn-ghost flex-1 border border-[#E2E8F0]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteSubPack}
              disabled={deletingSub}
              className="btn-danger bg-[#C0392B] text-white flex-1 border-[#C0392B]"
            >
              {deletingSub ? 'Deleting...' : 'Delete Sub-Pack'}
            </button>
          </div>
        </Modal>

        {/* Floating Toast */}
        {toastMsg && (
          <div className="fixed bottom-6 right-6 z-50 bg-[#0F172A] text-white text-sm font-semibold px-5 py-3 rounded-xl shadow-xl">
            {toastMsg}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
