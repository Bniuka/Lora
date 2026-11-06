import { useEffect, useState, useRef } from 'react';
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
  UploadCloud,
  Image as ImageIcon,
  Video,
  MessageCircle,
  Send,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  HelpCircle,
  CheckCircle2,
  Smartphone,
  Info,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { PageTransition, Modal, ShareMenu, Skeleton } from '../components/ui';
import { useSubscriptionGuard } from '../hooks/useSubscriptionGuard';
import { getPackShareUrl, generateInviteToken, generateUniquePackSlug } from '../lib/utils';
import './manage-multi-pack.css';

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
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
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
  const paidPrices = subPacks.map(s => Number(s.price)).filter(n => n > 0);
  const minSubPrice = paidPrices.length > 0 ? Math.min(...paidPrices) : null;

  return (
    <PageTransition>
      <div className={`p-5 sm:p-8 pb-24 mx-auto transition-all ${activeTab === 'details' ? 'max-w-6xl' : 'max-w-5xl'}`}>
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
                className="btn-primary text-sm py-3 px-6"
              >
                <PlusCircle size={17} /> Create Sub-Pack
              </Link>
              <Link
                to={`/learner/pack/${pack.slug || pack.id}`}
                className="btn-ghost rounded-full text-sm py-3 px-5 border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC]"
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
          <div className="mmp-layout">
            {/* Left: Bento Form Cards */}
            <form onSubmit={handleSaveMainDetails} className="space-y-6">

              {/* BENTO 1: Course Identity & Visibility */}
              <div className="mmp-bento">
                <div className="mmp-bento-header">
                  <div className="mmp-bento-icon bg-blue-50 text-blue-600 border border-blue-200">
                    <Globe2 size={22} />
                  </div>
                  <div>
                    <h2 className="mmp-bento-title">Course Identity & Visibility</h2>
                    <p className="mmp-bento-sub">Control how learners discover and access your main multi-course showcase.</p>
                  </div>
                </div>

                {/* Visibility Selector */}
                <div className="mb-5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5 block">
                    Course Visibility
                  </label>
                  <div className="mmp-vis-grid">
                    {[
                      {
                        id: 'public',
                        label: 'Public on Discover',
                        desc: 'Searchable on Discover & listed on your creator profile for all learners.',
                        icon: Globe2,
                        iconColor: 'text-emerald-600',
                        activeClass: 'is-active-public',
                      },
                      {
                        id: 'private',
                        label: 'Private Showcase',
                        desc: 'Hidden from search. Learners can only view & enroll via your secret invite link.',
                        icon: Lock,
                        iconColor: 'text-purple-600',
                        activeClass: 'is-active-private',
                      },
                      {
                        id: 'unlisted',
                        label: 'Unlisted (Hidden)',
                        desc: 'Hidden from Discover. Only learners with the exact link can view it.',
                        icon: EyeOff,
                        iconColor: 'text-amber-600',
                        activeClass: 'is-active-unlisted',
                      },
                    ].map(opt => {
                      const Icon = opt.icon;
                      const active = (pack.visibility || 'public') === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setPack(prev => ({ ...prev, visibility: opt.id }))}
                          className={`mmp-vis-btn ${active ? opt.activeClass : ''}`}
                        >
                          <div className="mmp-vis-top">
                            <span className="mmp-vis-label">
                              <Icon size={16} className={opt.iconColor} />
                              {opt.label}
                            </span>
                            {active && (
                              <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">
                                <Check size={11} />
                              </span>
                            )}
                          </div>
                          <p className="mmp-vis-desc">{opt.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Course Title */}
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Main Course Title *
                    </label>
                    <span className="text-[11px] text-slate-400">
                      {(pack.title || '').length} / 120 chars
                    </span>
                  </div>
                  <input
                    type="text"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 font-semibold text-base focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                    placeholder="e.g. Complete Full-Stack Web Mastery (Monthly Cohort)"
                    value={pack.title || ''}
                    onChange={e => setPack(prev => ({ ...prev, title: e.target.value }))}
                    maxLength={120}
                    required
                  />
                </div>

                {/* Description */}
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Full Course Description *
                    </label>
                    <span className="text-[11px] text-slate-400">
                      {(pack.description || '').length} characters
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-sm focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none leading-relaxed"
                    placeholder="Describe what learners will learn across all batches, who this multi-course is for, and prerequisites..."
                    value={pack.description || ''}
                    onChange={e => setPack(prev => ({ ...prev, description: e.target.value }))}
                    required
                  />
                </div>

                {/* Category & Currency */}
                <div className="grid sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 block">
                      Course Category
                    </label>
                    <select
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm font-medium focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none mb-2"
                      value={pack.category || ''}
                      onChange={e => setPack(prev => ({ ...prev, category: e.target.value }))}
                    >
                      <option value="">Select category</option>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>

                    <div className="flex flex-wrap gap-1.5">
                      {CATEGORIES.slice(0, 5).map(cat => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setPack(prev => ({ ...prev, category: cat }))}
                          className={`mmp-cat-chip ${pack.category === cat ? 'is-active' : ''}`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 block">
                      Default Currency for New Batches
                    </label>
                    <select
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm font-semibold focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                      value={pack.currency || 'LKR'}
                      onChange={e => setPack(prev => ({ ...prev, currency: e.target.value }))}
                    >
                      {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <p className="text-[11px] text-slate-400 mt-2">
                      New sub-packs created under this multi-course will inherit this currency by default.
                    </p>
                  </div>
                </div>
              </div>

              {/* BENTO 2: Visual Showcase & Media */}
              <div className="mmp-bento">
                <div className="mmp-bento-header">
                  <div className="mmp-bento-icon bg-purple-50 text-purple-600 border border-purple-200">
                    <ImageIcon size={22} />
                  </div>
                  <div>
                    <h2 className="mmp-bento-title">Visual Media & Showcase</h2>
                    <p className="mmp-bento-sub">Attract learners with high-resolution 16:9 imagery and a preview video.</p>
                  </div>
                </div>

                {/* Drag and Drop Cover Image */}
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Main Showcase Cover Image
                    </label>
                    <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                      1280 × 720 (16:9)
                    </span>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) {
                        setThumbnailFile(f);
                        setThumbPreview(URL.createObjectURL(f));
                      }
                    }}
                  />

                  <div
                    className={`mmp-dropzone ${isDragging ? 'is-dragover' : ''}`}
                    onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={e => {
                      e.preventDefault();
                      setIsDragging(false);
                      const f = e.dataTransfer?.files?.[0];
                      if (f && f.type.startsWith('image/')) {
                        setThumbnailFile(f);
                        setThumbPreview(URL.createObjectURL(f));
                      }
                    }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {thumbPreview ? (
                      <div className="mmp-dropzone-preview-wrap">
                        <img
                          src={thumbPreview}
                          alt="Cover preview"
                          className="mmp-dropzone-preview-img"
                        />
                        <div className="mmp-dropzone-overlay">
                          <UploadCloud size={30} />
                          <span className="text-sm font-bold">Click or drag new image to replace</span>
                          <span className="text-xs text-white/80">Supports PNG, JPG, WebP up to 5MB</span>
                        </div>
                      </div>
                    ) : (
                      <div className="mmp-dropzone-inner">
                        <div className="w-14 h-14 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center shadow-sm">
                          <UploadCloud size={28} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">
                            Upload Main Course Cover Image
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            Drag & drop an image here, or <span className="text-purple-600 font-semibold underline">browse file</span>
                          </p>
                        </div>
                        <span className="text-[11px] text-slate-400">
                          Recommended 1280 × 720px • PNG, JPG, WebP max 5MB
                        </span>
                      </div>
                    )}
                  </div>

                  {thumbPreview && (
                    <div className="mt-2.5 flex items-center justify-between text-xs text-slate-500 px-1">
                      <span className="flex items-center gap-1.5 text-emerald-600 font-semibold">
                        <CheckCircle2 size={13} /> Cover image ready
                      </span>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-purple-600 font-bold hover:underline cursor-pointer"
                      >
                        Change Image
                      </button>
                    </div>
                  )}
                </div>

                {/* Intro Video URL */}
                <div className="pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <Video size={14} className="text-red-500" /> Intro Video Preview URL
                    </label>
                    {pack.intro_video_url && (
                      <a
                        href={pack.intro_video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-semibold text-blue-600 hover:underline flex items-center gap-1"
                      >
                        Test Link <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                  <input
                    type="url"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:bg-white focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all outline-none"
                    placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..."
                    value={pack.intro_video_url || ''}
                    onChange={e => setPack(prev => ({ ...prev, intro_video_url: e.target.value }))}
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    YouTube or Vimeo trailer shown on the course hero section to boost enrollments.
                  </p>
                </div>
              </div>

              {/* BENTO 3: Step-by-Step Batch Progression */}
              <div className="mmp-flowchart">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-purple-200/80 text-purple-700 flex items-center justify-center font-bold">
                        <GitBranch size={16} />
                      </span>
                      <h3 className="text-sm font-bold text-slate-900">
                        Step-by-Step Batch Progression (1st → 2nd → 3rd)
                      </h3>
                    </div>
                    <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                      When enabled, learners must enroll in <b>Batch #1</b> before unlocking <b>Batch #2</b>, and so on. Turn off to allow students to join any monthly batch directly without prerequisites.
                    </p>

                    <div className="mmp-flow-steps">
                      <span className="mmp-flow-node">
                        <Sparkles size={12} className="text-amber-500" /> 1. Batch #1 (Base)
                      </span>
                      <span className="mmp-flow-arrow">➔</span>
                      <span className="mmp-flow-node">
                        <Lock size={12} className="text-purple-600" /> 2. Batch #2
                      </span>
                      <span className="mmp-flow-arrow">➔</span>
                      <span className="mmp-flow-node">
                        <Lock size={12} className="text-purple-600" /> 3. Batch #3
                      </span>
                    </div>
                  </div>

                  <label className="mmp-switch" title="Toggle step-by-step progression">
                    <input
                      type="checkbox"
                      checked={Boolean(pack.sequential_unlock)}
                      onChange={e => setPack(prev => ({ ...prev, sequential_unlock: e.target.checked }))}
                    />
                    <span className="mmp-slider"></span>
                  </label>
                </div>
              </div>

              {/* BENTO 4: Community & Contact Hub */}
              <div className="mmp-bento">
                <div className="mmp-bento-header">
                  <div className="mmp-bento-icon bg-emerald-50 text-emerald-600 border border-emerald-200">
                    <MessageCircle size={22} />
                  </div>
                  <div>
                    <h2 className="mmp-bento-title">Community & Support Channels</h2>
                    <p className="mmp-bento-sub">Give enrolled learners instant access to WhatsApp & Telegram channels.</p>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  {/* WhatsApp Hub */}
                  <div className="mmp-brand-card whatsapp">
                    <div className="mmp-brand-head">
                      <div className="mmp-brand-pill wa">
                        <MessageCircle size={15} />
                      </div>
                      <span className="mmp-brand-title">WhatsApp Support & Group</span>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="text-[11px] font-bold uppercase tracking-wider text-emerald-900 mb-1 block">
                          Inquiry WhatsApp Number
                        </label>
                        <PhoneInput
                          international
                          defaultCountry="LK"
                          value={pack.whatsapp_number || ''}
                          onChange={v => setPack(prev => ({ ...prev, whatsapp_number: v || '' }))}
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold uppercase tracking-wider text-emerald-900 mb-1 block">
                          Default WhatsApp Group Link
                        </label>
                        <input
                          type="url"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-emerald-200 bg-white text-slate-800 text-xs focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 transition-all outline-none"
                          placeholder="https://chat.whatsapp.com/..."
                          value={pack.whatsapp_link || ''}
                          onChange={e => setPack(prev => ({ ...prev, whatsapp_link: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Telegram Hub */}
                  <div className="mmp-brand-card telegram">
                    <div className="mmp-brand-head">
                      <div className="mmp-brand-pill tg">
                        <Send size={14} />
                      </div>
                      <span className="mmp-brand-title">Telegram Community</span>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="text-[11px] font-bold uppercase tracking-wider text-sky-900 mb-1 block">
                          Default Telegram Channel / Group
                        </label>
                        <input
                          type="url"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-sky-200 bg-white text-slate-800 text-xs focus:border-sky-500 focus:ring-4 focus:ring-sky-100 transition-all outline-none"
                          placeholder="https://t.me/..."
                          value={pack.telegram_link || ''}
                          onChange={e => setPack(prev => ({ ...prev, telegram_link: e.target.value }))}
                        />
                      </div>
                      <p className="text-[11px] text-sky-700/80 leading-relaxed pt-2">
                        Shared with learners automatically after enrollment into any sub-pack or batch.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* SAVE ACTION BAR */}
              <div className="mmp-save-bar">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <CheckCircle2 size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">
                      Ready to apply changes?
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Updates are published immediately to your public course showcase.
                    </p>
                  </div>
                </div>

                <button
                  type="submit"
                  className="mmp-save-btn"
                  disabled={savingMain}
                >
                  {savingMain ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <Check size={16} /> Save Main Course Details
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Right: Sticky Live Learner Preview */}
            <aside className="mmp-preview-sticky">
              <div className="mmp-preview-badge-row">
                <span className="mmp-live-pill">
                  <span className="mmp-live-dot"></span> Live Discover Preview
                </span>
                <span className="text-[11px] font-semibold text-slate-400">
                  Learner View
                </span>
              </div>

              {/* Discover Card Mock */}
              <div className="mmp-discover-card">
                <div className="mmp-discover-thumb">
                  {thumbPreview ? (
                    <img
                      src={thumbPreview}
                      alt={pack.title || 'Course Preview'}
                      className="mmp-discover-img"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-400 gap-2">
                      <Layers size={36} className="text-blue-400" />
                      <span className="text-xs font-bold text-slate-300">No cover image yet</span>
                    </div>
                  )}

                  {/* Top Badges */}
                  <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-600/95 text-white backdrop-blur-sm shadow-sm">
                      <Layers size={11} />
                      {subPacks.length > 0 ? `${subPacks.length} Batch${subPacks.length !== 1 ? 'es' : ''}` : 'Multi-Pack'}
                    </span>

                    {pack.visibility === 'private' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-900/90 text-purple-200 backdrop-blur-sm shadow-sm">
                        <Lock size={10} /> Private
                      </span>
                    )}

                    {pack.visibility === 'unlisted' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-900/90 text-amber-200 backdrop-blur-sm shadow-sm">
                        <EyeOff size={10} /> Unlisted
                      </span>
                    )}
                  </div>
                </div>

                <div className="mmp-discover-body">
                  <h3 className="font-bold text-slate-900 text-base mb-1 line-clamp-1">
                    {pack.title || 'Untitled Multi-Course Pack'}
                  </h3>

                  <p className="text-xs text-slate-500 mb-3 flex items-center gap-1.5">
                    <span>
                      {profile?.first_name ? `${profile.first_name} ${profile?.last_name || ''}` : 'Creator'}
                    </span>
                    <span>•</span>
                    <span className="font-medium text-blue-600">
                      {pack.category || 'General'}
                    </span>
                  </p>

                  <div className="flex items-center justify-between pt-2.5 border-t border-slate-100">
                    <div>
                      {pack.visibility === 'private' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                          <Lock size={11} /> Invite Only
                        </span>
                      ) : (
                        <p className="text-sm font-extrabold text-blue-600">
                          {minSubPrice !== null ? `From ${pack.currency || 'USD'} ${minSubPrice}` : 'View Batches →'}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                      <Users size={12} /> {totalStudents} student{totalStudents !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </div>

              {/* Pro Tip Card */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50/60 rounded-2xl border border-amber-200/70 p-4 text-xs text-amber-950">
                <div className="flex items-center gap-2 font-bold text-amber-900 mb-1">
                  <Sparkles size={14} className="text-amber-600" />
                  <span>Pro Tip for Multi-Packs</span>
                </div>
                <p className="text-slate-600 leading-relaxed text-[11.5px]">
                  Courses with an enticing 16:9 cover image and an active WhatsApp group see <b>3x higher enrollment</b> and repeat retention across monthly cohorts.
                </p>
                <div className="mt-3 pt-2.5 border-t border-amber-200/60 flex items-center justify-between">
                  <Link
                    to={`/learner/pack/${pack.slug || pack.id}`}
                    target="_blank"
                    className="inline-flex items-center gap-1 text-amber-800 font-bold hover:underline text-[11px]"
                  >
                    View Public Course Page <ExternalLink size={11} />
                  </Link>
                  <span className="text-[10px] text-amber-600 font-semibold uppercase tracking-wider">
                    Auto Synced
                  </span>
                </div>
              </div>
            </aside>
          </div>
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
