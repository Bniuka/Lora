import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { Loader2, Tag, Copy, Check, Trash2, RefreshCw, Sparkles, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { PageTransition, Skeleton } from '../components/ui';
import { useSubscriptionGuard } from '../hooks/useSubscriptionGuard';
import { generateUniquePackSlug } from '../lib/utils';
import { generatePromoCode, normalizePromoCode } from '../lib/promo';
import './edit-pack.css';

const CATEGORIES = ['Technology', 'Design', 'Business', 'Language', 'Music', 'Fitness', 'Other'];
const CURRENCIES = ['USD', 'EUR', 'GBP', 'BDT', 'INR', 'PKR', 'NGN', 'KES', 'PHP', 'BRL', 'LKR'];

export default function EditPack() {
  useSubscriptionGuard();
  const { id } = useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pack, setPack] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [thumbnail, setThumbnail] = useState(null);
  const [thumbPreview, setThumbPreview] = useState(null);
  const [previousPrice, setPreviousPrice] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const toastTimeoutRef = useRef(null);

  // Promo Code State
  const [promoCodes, setPromoCodes] = useState([]);
  const [promoModalOpen, setPromoModalOpen] = useState(false);
  const [newPromoCode, setNewPromoCode] = useState(generatePromoCode());
  const [newPromoMaxUses, setNewPromoMaxUses] = useState(15);
  const [generatingPromo, setGeneratingPromo] = useState(false);
  const [copiedCodeId, setCopiedCodeId] = useState(null);

  const showToast = (msg) => {
    setToastMsg(msg);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMsg('');
    }, 2800);
  };

  const fetchPromoCodes = async () => {
    try {
      const { data, error } = await supabase
        .from('pack_promo_codes')
        .select('*')
        .eq('pack_id', id)
        .order('created_at', { ascending: false });
      if (!error && data) {
        setPromoCodes(data);
      }
    } catch (_) {}
  };

  const handleCreatePromoCode = async (e) => {
    e?.preventDefault();
    if (!newPromoCode) return;
    setGeneratingPromo(true);
    try {
      const formattedCode = normalizePromoCode(newPromoCode);
      const attempts = parseInt(newPromoMaxUses, 10) || 1;
      const { error } = await supabase
        .from('pack_promo_codes')
        .insert({
          pack_id: id,
          creator_id: user.id,
          code: formattedCode,
          max_uses: attempts,
          used_count: 0,
          is_active: true,
        });

      if (error) throw error;
      showToast(`Promo code ${formattedCode} created for ${attempts} learners!`);
      setPromoModalOpen(false);
      setNewPromoCode(generatePromoCode());
      fetchPromoCodes();
    } catch (err) {
      showToast('Error creating promo code: ' + err.message);
    } finally {
      setGeneratingPromo(false);
    }
  };

  const handleDeletePromo = async (promoId) => {
    if (!window.confirm("Are you sure you want to delete this promo code?")) return;
    try {
      await supabase.from('pack_promo_codes').delete().eq('id', promoId);
      showToast("Promo code deleted");
      fetchPromoCodes();
    } catch (err) {
      showToast("Error deleting: " + err.message);
    }
  };

  const handleCopyPromo = (codeText, promoId) => {
    navigator.clipboard.writeText(codeText);
    setCopiedCodeId(promoId);
    showToast(`Copied ${codeText} to clipboard!`);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  const handleCopyPromoLink = (codeText) => {
    const origin = window.location.origin;
    const packSlug = pack?.slug || id;
    const link = `${origin}/p/${packSlug}?promo=${encodeURIComponent(codeText)}`;
    navigator.clipboard.writeText(link);
    showToast(`Copied invite link with promo code!`);
  };

  useEffect(() => {
    const fetch = async () => {
      const [packRes, sessRes] = await Promise.all([
        supabase.from('session_packs').select('*').eq('id', id).single(),
        supabase.from('sessions').select('*').eq('pack_id', id).order('order_index'),
      ]);
      if (packRes.data) {
        setPack(packRes.data);
        setThumbPreview(packRes.data.thumbnail_url);
      }
      fetchPromoCodes();
      const formatLocal = (iso) => {
        if (!iso) return '';
        const d = new Date(iso);
        if (isNaN(d.getTime())) return '';
        const pad = (n) => n.toString().padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      };
      setSessions(
        sessRes.data
          ? sessRes.data.map(s => ({
              ...s,
              scheduled_at: formatLocal(s.scheduled_at),
              is_past_session: Boolean(s.is_past_session) || Boolean(s.recording_url && s.recording_url.trim()),
            }))
          : []
      );
      setLoading(false);
    };
    fetch();
  }, [id]);

  const updatePack = (field, value) => {
    setPack(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const updateSession = (idx, field, value) => {
    setSessions(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
    setIsDirty(true);
  };

  const toggleFreePreview = (idx) => {
    setSessions(prev => prev.map((s, i) => i === idx ? { ...s, is_free_session: !s.is_free_session } : s));
    setIsDirty(true);
  };

  const addSession = () => {
    setSessions(prev => [
      ...prev,
      {
        id: null,
        pack_id: id,
        title: '',
        zoom_link: '',
        youtube_live_link: '',
        scheduled_at: '',
        duration_minutes: 60,
        order_index: prev.length,
        is_free_session: false,
        is_past_session: false,
        recording_url: null,
        _isNew: true,
      },
    ]);
    setIsDirty(true);
    setTimeout(() => {
      const list = document.getElementById('sessions');
      if (list?.lastElementChild) {
        list.lastElementChild.scrollIntoView({ behavior: 'smooth', block: 'center' });
        list.lastElementChild.querySelector('input')?.focus({ preventScroll: true });
      }
    }, 100);
  };

  const removeSession = async (idx) => {
    if (!window.confirm(`Delete session ${idx + 1}?`)) return;
    const session = sessions[idx];
    if (session.id && !session._isNew) {
      await supabase.from('sessions').delete().eq('id', session.id);
    }
    setSessions(prev => prev.filter((_, i) => i !== idx));
    setIsDirty(true);
    showToast(`Session ${idx + 1} deleted`);
  };

  const handleThumbnail = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setThumbnail(file);
    setThumbPreview(URL.createObjectURL(file));
    setIsDirty(true);
  };

  const handleRemoveThumbnail = () => {
    setThumbnail(null);
    setThumbPreview(null);
    updatePack('thumbnail_url', null);
    setIsDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let thumbnailUrl = pack.thumbnail_url;
      if (thumbnail) {
        const ext = thumbnail.name.split('.').pop();
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        await supabase.storage.from('thumbnails').upload(path, thumbnail);
        const { data: urlData } = supabase.storage.from('thumbnails').getPublicUrl(path);
        thumbnailUrl = urlData.publicUrl;
      }

      const hasFree = sessions.some(s => s.is_free_session);

      const packUpdate = {
        title: pack.title,
        description: pack.description,
        category: pack.category,
        price: parseFloat(pack.price),
        currency: pack.currency,
        thumbnail_url: thumbnailUrl,
        intro_video_url: pack.intro_video_url || null,
        whatsapp_number: pack.whatsapp_number || null,
        whatsapp_link: pack.whatsapp_link || null,
        telegram_link: pack.telegram_link || null,
        upsell_title: pack.upsell_title || null,
        upsell_link: pack.upsell_link || null,
        has_free_session: hasFree,
      };

      if (!pack.slug && pack.title) {
        packUpdate.slug = await generateUniquePackSlug(pack.title, id);
      }

      let { error: updateErr } = await supabase.from('session_packs').update(packUpdate).eq('id', id);
      if (updateErr && (updateErr.message?.includes('whatsapp_number') || updateErr.message?.includes('slug') || updateErr.message?.includes('upsell_'))) {
        if (updateErr.message?.includes('whatsapp_number')) delete packUpdate.whatsapp_number;
        if (updateErr.message?.includes('slug')) delete packUpdate.slug;
        if (updateErr.message?.includes('upsell_')) {
          delete packUpdate.upsell_title;
          delete packUpdate.upsell_link;
        }
        const retry = await supabase.from('session_packs').update(packUpdate).eq('id', id);
        updateErr = retry.error;
      }
      if (updateErr) throw updateErr;

      for (let sIdx = 0; sIdx < sessions.length; sIdx++) {
        const s = sessions[sIdx];
        const isPast = Boolean(s.is_past_session);
        const sessionData = {
          pack_id: id,
          title: s.title,
          zoom_link: s.zoom_link || '',
          youtube_live_link: s.youtube_live_link || null,
          scheduled_at: s.scheduled_at
            ? new Date(s.scheduled_at).toISOString()
            : isPast
            ? new Date(Date.now() - 86400000 * (sessions.length - sIdx)).toISOString()
            : new Date().toISOString(),
          duration_minutes: parseInt(s.duration_minutes) || 60,
          order_index: s.order_index,
          is_free_session: s.is_free_session,
          is_past_session: isPast,
          recording_url: s.recording_url || null,
        };

        if (s._isNew || !s.id) {
          let { error: inErr } = await supabase.from('sessions').insert(sessionData);
          if (inErr && (inErr.message?.includes('youtube_live_link') || inErr.message?.includes('is_past_session'))) {
            if (inErr.message?.includes('youtube_live_link')) delete sessionData.youtube_live_link;
            if (inErr.message?.includes('is_past_session')) delete sessionData.is_past_session;
            await supabase.from('sessions').insert(sessionData);
          } else if (inErr) {
            throw inErr;
          }
        } else {
          let { error: upErr } = await supabase.from('sessions').update(sessionData).eq('id', s.id);
          if (upErr && (upErr.message?.includes('youtube_live_link') || upErr.message?.includes('is_past_session'))) {
            if (upErr.message?.includes('youtube_live_link')) delete sessionData.youtube_live_link;
            if (upErr.message?.includes('is_past_session')) delete sessionData.is_past_session;
            await supabase.from('sessions').update(sessionData).eq('id', s.id);
          } else if (upErr) {
            throw upErr;
          }
        }
      }

      setIsDirty(false);
      showToast('Pack saved successfully');
      setTimeout(() => {
        navigate('/creator/packs');
      }, 700);
    } catch (err) {
      showToast('Error: ' + err.message);
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="lora-edit">
        <div className="page">
          <Skeleton className="h-10 w-48" style={{ height: 40, width: 220, borderRadius: 12, marginBottom: 20 }} />
          <Skeleton className="h-64 w-full" style={{ height: 260, borderRadius: 24, marginBottom: 20 }} />
          <Skeleton className="h-48 w-full" style={{ height: 200, borderRadius: 24 }} />
        </div>
      </div>
    );
  }

  if (!pack) {
    return (
      <div className="lora-edit">
        <div className="page" style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--muted)' }}>
          <h2>Pack not found</h2>
          <Link to="/creator/packs" className="backl" style={{ marginTop: 20, display: 'inline-flex' }}>
            Back to packs
          </Link>
        </div>
      </div>
    );
  }

  const now = new Date();

  return (
    <PageTransition>
      <div className="lora-edit">
        {/* Sticky action bar */}
        <div className="actions">
          <div className="in">
            <Link to="/creator/packs" className="backl">
              <svg className="ic" viewBox="0 0 24 24"><path d="M19 12H5M11 6l-6 6 6 6" /></svg>
              <span>Back to packs</span>
            </Link>
            {isDirty && <span className="dirty show">Unsaved changes</span>}
            <button className="save" id="save" type="button" onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="ic animate-spin" />
              ) : (
                <svg className="ic" viewBox="0 0 24 24">
                  <path d="M5 3h11l4 4v14H5z" />
                  <path d="M8 3v6h8V3M8 21v-7h8v7" />
                </svg>
              )}
              <span>{saving ? 'Saving...' : 'Save changes'}</span>
            </button>
          </div>
        </div>

        {/* Main page form container */}
        <div className="page">
          <h1>Edit pack</h1>

          {/* Section 1: Basic Info */}
          <section className="card">
            <div className="sh">
              <span className="ib">
                <svg className="ic" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h10" /></svg>
              </span>
              <div>
                <h2>Basic info</h2>
                <p>The title, description and price learners see.</p>
              </div>
            </div>

            {/* Top Switch for 100% Free Pack */}
            <label className={`sw free-banner ${Number(pack.price) === 0 ? 'active' : ''}`}>
              <div className="sw-info">
                <div className="sw-title">
                  <b>Offer this pack 100% Free</b>
                  <span className="sw-pill">{Number(pack.price) === 0 ? 'FREE PACK' : 'OPTIONAL'}</span>
                </div>
                <p className="sw-desc">
                  Learners get 1-click instant enrollment without payment. Perfect for free workshops, client acquisition, and audience building!
                </p>
              </div>
              <input
                type="checkbox"
                checked={Number(pack.price) === 0}
                onChange={(e) => {
                  const checked = e.target.checked;
                  if (checked) {
                    if (pack.price && Number(pack.price) !== 0) {
                      setPreviousPrice(pack.price);
                    }
                    updatePack('price', 0);
                  } else {
                    updatePack('price', previousPrice || 29.99);
                  }
                }}
              />
              <span className="tg"></span>
            </label>

            <div className="g">
              <div className="f">
                <label htmlFor="title">Title</label>
                <input
                  id="title"
                  name="title"
                  value={pack.title || ''}
                  onChange={e => updatePack('title', e.target.value)}
                  placeholder="e.g. Master React & Node.js"
                  required
                />
              </div>
              <div className="f">
                <label htmlFor="desc">Description</label>
                <textarea
                  id="desc"
                  name="description"
                  value={pack.description || ''}
                  onChange={e => updatePack('description', e.target.value)}
                  placeholder="Detailed overview of what students will learn..."
                />
              </div>
              <div className="g g3">
                <div className="f">
                  <label htmlFor="cat">Category</label>
                  <select
                    id="cat"
                    name="category"
                    value={pack.category || 'Technology'}
                    onChange={e => updatePack('category', e.target.value)}
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="f">
                  <label htmlFor="price">
                    Price {Number(pack.price) === 0 ? <span style={{ color: '#059669', fontWeight: 700 }}>(Free)</span> : <em>*</em>}
                  </label>
                  <input
                    id="price"
                    name="price"
                    type="number"
                    inputMode="decimal"
                    placeholder="29.99"
                    value={pack.price ?? ''}
                    disabled={Number(pack.price) === 0}
                    onChange={e => updatePack('price', e.target.value)}
                    style={Number(pack.price) === 0 ? { background: '#f0fdf4', borderColor: '#86efac', color: '#047857', fontWeight: 700 } : {}}
                    required
                  />
                  {Number(pack.price) === 0 && (
                    <small style={{ color: '#059669', fontWeight: 600, marginTop: 4, display: 'block' }}>
                      ✓ 100% Free mode is ON. Toggle switch above to set a price.
                    </small>
                  )}
                </div>
                <div className="f">
                  <label htmlFor="cur">Currency</label>
                  <select
                    id="cur"
                    name="currency"
                    value={pack.currency || 'USD'}
                    disabled={Number(pack.price) === 0}
                    onChange={e => updatePack('currency', e.target.value)}
                  >
                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </section>

          {/* Section 2: Thumbnail */}
          <section className="card c2">
            <div className="sh">
              <span className="ib">
                <svg className="ic" viewBox="0 0 24 24">
                  <rect x="3" y="4" width="18" height="16" rx="2" />
                  <circle cx="9" cy="10" r="2" />
                  <path d="m21 16-5-5-9 9" />
                </svg>
              </span>
              <div>
                <h2>Thumbnail</h2>
                <p>The cover image for your course.</p>
              </div>
            </div>
            <div className="thumb">
              {thumbPreview ? (
                <>
                  <img src={thumbPreview} alt="Pack thumbnail" />
                  <div className="tb">
                    <label className="btn-change">
                      Change
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleThumbnail}
                        style={{ display: 'none' }}
                      />
                    </label>
                    <button
                      className="rm"
                      type="button"
                      onClick={handleRemoveThumbnail}
                      aria-label="Remove thumbnail"
                    >
                      <svg className="ic" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18" /></svg>
                    </button>
                  </div>
                </>
              ) : (
                <label className="thumb-empty">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleThumbnail}
                    style={{ display: 'none' }}
                  />
                  <div className="ib">
                    <svg className="ic" viewBox="0 0 24 24">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                    </svg>
                  </div>
                  <b>Upload thumbnail</b>
                  <span>PNG, JPG or WebP (16:9 recommended)</span>
                </label>
              )}
            </div>
          </section>

          {/* Section 3: Inquiry Contact & Community Links */}
          <section className="card c3">
            <div className="sh">
              <span className="ib">
                <svg className="ic" viewBox="0 0 24 24">
                  <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z" />
                </svg>
              </span>
              <div>
                <h2>Inquiry contact &amp; links</h2>
                <p>Help learners reach you and join your community.</p>
              </div>
            </div>
            <div className="g">
              <div className="f">
                <label htmlFor="wa">WhatsApp &amp; contact number for inquiries</label>
                <div className="h">
                  Learners can use this to chat on WhatsApp or call you directly if they need more info or trust before joining.
                </div>
                <PhoneInput
                  international
                  defaultCountry="LK"
                  value={pack.whatsapp_number || ''}
                  onChange={v => updatePack('whatsapp_number', v || '')}
                />
                {profile?.contact_number && pack.whatsapp_number !== profile.contact_number && (
                  <button
                    type="button"
                    onClick={() => updatePack('whatsapp_number', profile.contact_number)}
                    className="use-profile-num"
                  >
                    Use my profile number ({profile.contact_number})
                  </button>
                )}
              </div>

              <div className="f">
                <label htmlFor="intro">Intro video URL <span>(YouTube/Vimeo)</span></label>
                <input
                  id="intro"
                  name="introVideo"
                  type="url"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={pack.intro_video_url || ''}
                  onChange={e => updatePack('intro_video_url', e.target.value)}
                />
              </div>

              <div className="f">
                <label htmlFor="wag">WhatsApp group <span>(for enrolled students)</span></label>
                <input
                  id="wag"
                  name="whatsappGroup"
                  type="url"
                  placeholder="https://chat.whatsapp.com/..."
                  value={pack.whatsapp_link || ''}
                  onChange={e => updatePack('whatsapp_link', e.target.value)}
                />
              </div>

              <div className="f">
                <label htmlFor="tg">Telegram channel <span>(for enrolled students)</span></label>
                <input
                  id="tg"
                  name="telegram"
                  type="url"
                  placeholder="https://t.me/..."
                  value={pack.telegram_link || ''}
                  onChange={e => updatePack('telegram_link', e.target.value)}
                />
              </div>

              <div className="f" style={{ marginTop: 16, borderTop: '1px solid var(--line)', paddingTop: 16 }}>
                <label htmlFor="upsell_title">Upsell: Next course title <span>(optional)</span></label>
                <input
                  id="upsell_title"
                  placeholder="e.g. Master Full-Stack Development 12-Week Bootcamp"
                  value={pack.upsell_title || ''}
                  onChange={e => updatePack('upsell_title', e.target.value)}
                />
                <div className="h">
                  Displayed as a prominent next-step banner to students inside their sessions view.
                </div>
              </div>

              <div className="f">
                <label htmlFor="upsell_link">Upsell: Next course link <span>(optional)</span></label>
                <input
                  id="upsell_link"
                  type="url"
                  placeholder="https://lora.live/p/next-course-slug or full URL"
                  value={pack.upsell_link || ''}
                  onChange={e => updatePack('upsell_link', e.target.value)}
                />
              </div>
            </div>
          </section>

          {/* Section: Promo Codes (Free Student Access) */}
          <section className="card promo-section">
            <div className="sh" style={{ justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', gap: 14 }}>
                <span className="ib" style={{ background: '#fef3c7', color: '#d97706' }}>
                  <Tag className="ic" />
                </span>
                <div>
                  <h2>Free Access Promo Codes</h2>
                  <p>Generate usage-limited codes (e.g. 1 attempt, 15 attempts) to grant free access without payment slips.</p>
                </div>
              </div>

              <button
                type="button"
                className="btn"
                style={{
                  background: '#2563eb',
                  color: '#fff',
                  border: 0,
                  borderRadius: 12,
                  padding: '9px 16px',
                  fontWeight: 700,
                  fontSize: 13.5,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 7,
                  flexShrink: 0,
                }}
                onClick={() => {
                  setNewPromoCode(generatePromoCode());
                  setNewPromoMaxUses(15);
                  setPromoModalOpen(true);
                }}
              >
                <Sparkles size={15} /> + Generate Promo Code
              </button>
            </div>

            {promoCodes.length === 0 ? (
              <div style={{
                background: '#f8fafc',
                border: '1.5px dashed #cbd5e1',
                borderRadius: 16,
                padding: '24px 20px',
                textAlign: 'center',
                color: '#64748b',
                fontSize: 14,
              }}>
                No promo codes generated for this course yet. Click <b>+ Generate Promo Code</b> to create your first free access code.
              </div>
            ) : (
              <div className="promo-list">
                {promoCodes.map((p) => {
                  const isExhausted = p.used_count >= p.max_uses;
                  const remaining = Math.max(0, p.max_uses - p.used_count);
                  const isCopied = copiedCodeId === p.id;

                  return (
                    <div key={p.id} className={`promo-card ${isExhausted ? 'exhausted' : ''}`}>
                      <div className="promo-card-left">
                        <span className="promo-code-badge">
                          <Tag size={15} />
                          {p.code}
                        </span>
                        <div className="promo-meta">
                          <span className="promo-uses">
                            {p.used_count} / {p.max_uses} claimed {isExhausted ? '(Expired)' : `(${remaining} left)`}
                          </span>
                          <span className="promo-sub">
                            {isExhausted 
                              ? 'Max attempts reached · Expired' 
                              : `100% Free enrollment · Auto-expires after ${p.max_uses} students`}
                          </span>
                        </div>
                      </div>

                      <div className="promo-actions">
                        <button
                          type="button"
                          className="promo-btn-copy"
                          onClick={() => handleCopyPromo(p.code, p.id)}
                          title="Copy Code"
                        >
                          {isCopied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                          <span>{isCopied ? 'Copied' : 'Copy Code'}</span>
                        </button>
                        <button
                          type="button"
                          className="promo-btn-copy"
                          onClick={() => handleCopyPromoLink(p.code)}
                          title="Copy Direct Link with code pre-filled"
                        >
                          <span>🔗 Copy Invite Link</span>
                        </button>
                        <button
                          type="button"
                          className="promo-btn-del"
                          onClick={() => handleDeletePromo(p.id)}
                          title="Delete code"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Section 4: Sessions */}
          <section className="card c4">
            <div className="sh">
              <span className="ib">
                <svg className="ic" viewBox="0 0 24 24">
                  <rect x="3" y="6" width="13" height="12" rx="2" />
                  <path d="m16 10 5-3v10l-5-3" />
                </svg>
              </span>
              <div>
                <h2>Sessions</h2>
                <p>Add your live sessions and recordings.</p>
              </div>
            </div>

            <div id="sessions">
              {sessions.map((s, idx) => {
                const isPast = s.is_past_session || (s.scheduled_at && new Date(s.scheduled_at) < now);
                const isFree = Boolean(s.is_free_session);

                return (
                  <div key={s.id || idx} className={`sess ${isFree ? 'free' : ''} ${s.is_past_session ? 'past' : ''}`}>
                    <div className="sh2">
                      <span className="num">{idx + 1}</span>
                      <button
                        type="button"
                        className={`free-t ${isFree ? 'on' : ''}`}
                        onClick={() => toggleFreePreview(idx)}
                        aria-pressed={isFree}
                      >
                        {isFree ? '✓ ' : ''}FREE PREVIEW
                      </button>

                      <div className="session-type-toggle" role="radiogroup" aria-label="Session mode">
                        <button
                          type="button"
                          className={`st-opt ${!s.is_past_session ? 'active live' : ''}`}
                          onClick={() => updateSession(idx, 'is_past_session', false)}
                        >
                          <span className="st-dot live"></span>
                          Live Upcoming
                        </button>
                        <button
                          type="button"
                          className={`st-opt ${s.is_past_session ? 'active past' : ''}`}
                          onClick={() => updateSession(idx, 'is_past_session', true)}
                        >
                          <span>📼</span>
                          Past Recording
                        </button>
                      </div>

                      {isPast && !s.recording_url && !s.is_past_session && (
                        <span className="needs-rec-pill">Needs Recording</span>
                      )}

                      <button
                        type="button"
                        className="del"
                        onClick={() => removeSession(idx)}
                        aria-label={`Delete session ${idx + 1}`}
                      >
                        <svg className="ic" viewBox="0 0 24 24">
                          <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
                        </svg>
                      </button>
                    </div>

                    <div className="g">
                      <div className="f">
                        <label>Session title <em>*</em></label>
                        <input
                          value={s.title || ''}
                          placeholder="e.g. Introduction & Setup"
                          onChange={e => updateSession(idx, 'title', e.target.value)}
                          required
                        />
                      </div>

                      {s.is_past_session ? (
                        <>
                          <div className="f">
                            <label>Recording URL <em>*</em> <span>(Google Drive, YouTube unlisted, Vimeo, Zoom cloud)</span></label>
                            <input
                              type="url"
                              placeholder="https://drive.google.com/... or https://youtube.com/..."
                              value={s.recording_url || ''}
                              onChange={e => updateSession(idx, 'recording_url', e.target.value)}
                              required
                            />
                            <small style={{ color: '#7c3aed', fontSize: 12, fontWeight: 600 }}>
                              ✓ Catch-up Recording: Learners get immediate access to watch this session the moment they enroll.
                            </small>
                          </div>

                          <div className="g g2 keep">
                            <div className="f">
                              <label>Date conducted <span>(optional)</span></label>
                              <input
                                type="datetime-local"
                                value={s.scheduled_at || ''}
                                onChange={e => updateSession(idx, 'scheduled_at', e.target.value)}
                              />
                            </div>

                            <div className="f">
                              <label>Duration <span>(min)</span></label>
                              <input
                                type="number"
                                inputMode="numeric"
                                placeholder="60"
                                value={s.duration_minutes ?? ''}
                                onChange={e => updateSession(idx, 'duration_minutes', e.target.value)}
                              />
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="f">
                            <label>Zoom link</label>
                            <input
                              type="url"
                              placeholder="https://zoom.us/j/..."
                              value={s.zoom_link || ''}
                              onChange={e => updateSession(idx, 'zoom_link', e.target.value)}
                            />
                          </div>

                          <div className="f">
                            <label>YouTube Live link <span>(optional)</span></label>
                            <input
                              type="url"
                              placeholder="https://youtube.com/live/... or unlisted stream"
                              value={s.youtube_live_link || ''}
                              onChange={e => updateSession(idx, 'youtube_live_link', e.target.value)}
                            />
                          </div>

                          <div className="g g2 keep">
                            <div className="f">
                              <label>Date &amp; time <em>*</em></label>
                              <input
                                type="datetime-local"
                                value={s.scheduled_at || ''}
                                onChange={e => updateSession(idx, 'scheduled_at', e.target.value)}
                              />
                            </div>

                            <div className="f">
                              <label>Duration <span>(min)</span></label>
                              <input
                                type="number"
                                inputMode="numeric"
                                placeholder="60"
                                value={s.duration_minutes ?? ''}
                                onChange={e => updateSession(idx, 'duration_minutes', e.target.value)}
                              />
                            </div>
                          </div>

                          <div className="f">
                            <label>Recording URL <span>(optional)</span></label>
                            <input
                              type="url"
                              placeholder="Add after the session is conducted"
                              value={s.recording_url || ''}
                              onChange={e => updateSession(idx, 'recording_url', e.target.value)}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <button className="add" id="add" type="button" onClick={addSession}>
              <svg className="ic" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg>
              Add session
            </button>
          </section>
        </div>

        {/* Modal: Generate Promo Code */}
        {promoModalOpen && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.6)',
              backdropFilter: 'blur(4px)',
              zIndex: 9999,
              display: 'grid',
              placeItems: 'center',
              padding: 16,
            }}
            onClick={() => !generatingPromo && setPromoModalOpen(false)}
          >
            <div
              style={{
                width: '100%',
                maxWidth: 460,
                background: '#fff',
                borderRadius: 22,
                boxShadow: '0 25px 60px -15px rgba(0,0,0,0.3)',
                padding: '24px 26px',
              }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 19, fontWeight: 800 }}>Generate Promo Code</h3>
                <button
                  type="button"
                  onClick={() => setPromoModalOpen(false)}
                  style={{ background: '#f1f5f9', border: 0, borderRadius: '50%', width: 30, height: 30, cursor: 'pointer', display: 'grid', placeItems: 'center' }}
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleCreatePromoCode}>
                {/* Code Field */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
                    Promo Code (100% Free Access)
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="text"
                      required
                      value={newPromoCode}
                      onChange={e => setNewPromoCode(e.target.value.toUpperCase())}
                      style={{
                        flex: 1,
                        height: 46,
                        border: '1.5px solid #cbd5e1',
                        borderRadius: 12,
                        padding: '0 14px',
                        fontWeight: 700,
                        fontSize: 16,
                        fontFamily: 'monospace',
                        letterSpacing: '0.05em',
                        color: '#2563eb',
                      }}
                    />
                    <button
                      type="button"
                      title="Roll another code"
                      onClick={() => setNewPromoCode(generatePromoCode())}
                      style={{
                        padding: '0 14px',
                        background: '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        borderRadius: 12,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      <RefreshCw size={14} /> Roll
                    </button>
                  </div>
                  <small style={{ color: '#64748b', fontSize: 12, marginTop: 4, display: 'block' }}>
                    Auto-generated format: <code>LORA-FREE-7X9</code>
                  </small>
                </div>

                {/* Max Claims / Attempts */}
                <div style={{ marginBottom: 22 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
                    Usage Limit / Attempts
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    required
                    value={newPromoMaxUses}
                    onChange={e => setNewPromoMaxUses(e.target.value)}
                    style={{
                      width: '100%',
                      height: 46,
                      border: '1.5px solid #cbd5e1',
                      borderRadius: 12,
                      padding: '0 14px',
                      fontSize: 15,
                      fontWeight: 600,
                      marginBottom: 10,
                    }}
                  />
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {[1, 5, 10, 15, 25, 50].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setNewPromoMaxUses(num)}
                        style={{
                          border: Number(newPromoMaxUses) === num ? '1.5px solid #2563eb' : '1px solid #e2e8f0',
                          background: Number(newPromoMaxUses) === num ? '#eff6ff' : '#fff',
                          color: Number(newPromoMaxUses) === num ? '#2563eb' : '#475569',
                          fontWeight: 700,
                          fontSize: 12.5,
                          padding: '5px 12px',
                          borderRadius: 8,
                          cursor: 'pointer',
                        }}
                      >
                        {num === 1 ? '1 student' : `${num} students`}
                      </button>
                    ))}
                  </div>
                  <small style={{ color: '#64748b', fontSize: 12, marginTop: 8, display: 'block' }}>
                    Once {newPromoMaxUses} learner{newPromoMaxUses > 1 ? 's have' : ' has'} claimed this code, it will automatically expire.
                  </small>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => setPromoModalOpen(false)}
                    style={{
                      border: '1px solid #e2e8f0',
                      background: '#fff',
                      padding: '10px 18px',
                      borderRadius: 12,
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                    disabled={generatingPromo}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{
                      background: '#2563eb',
                      color: '#fff',
                      border: 0,
                      padding: '10px 22px',
                      borderRadius: 12,
                      fontSize: 14,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                    disabled={generatingPromo}
                  >
                    {generatingPromo ? <Loader2 size={16} className="animate-spin" /> : 'Create Promo Code'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Floating toast notification */}
        <div className={`toast ${toastMsg ? 'show' : ''}`} role="status">
          {toastMsg}
        </div>
      </div>
    </PageTransition>
  );
}
