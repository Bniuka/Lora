import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import {
  Loader2,
  Sparkles,
  Globe2,
  Lock,
  EyeOff,
  Layers,
  Calendar,
  CheckCircle2,
  ArrowRight,
  GitBranch,
  Unlock,
  X,
  HelpCircle,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { PageTransition } from '../components/ui';
import { useSubscriptionGuard } from '../hooks/useSubscriptionGuard';
import { generateUniquePackSlug, generateInviteToken } from '../lib/utils';
import './create-pack.css';

const STEPS = ['Main Course Info', 'Media', 'Contact & Community', 'Review'];
const CATEGORIES = ['Technology', 'Design', 'Business', 'Language', 'Music', 'Fitness', 'Other'];
const CURRENCIES = ['USD', 'EUR', 'GBP', 'BDT', 'INR', 'PKR', 'NGN', 'KES', 'PHP', 'BRL', 'LKR'];

const STEP_META = [
  {
    title: 'Main course info',
    desc: 'Set up your main course showcase. Sessions and prices will be added inside Sub-Packs.',
    icon: <path d="M4 6h16M4 12h16M4 18h10" />,
    sClass: 's1',
  },
  {
    title: 'Course media',
    desc: 'Add your main course cover image and intro video for Discover.',
    icon: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <circle cx="9" cy="10" r="2" />
        <path d="m21 16-5-5-9 9" />
      </>
    ),
    sClass: 's2',
  },
  {
    title: 'Contact & community',
    desc: 'Shared inquiry and community details (automatically pre-filled for your Sub-Packs).',
    icon: (
      <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z" />
    ),
    sClass: 's3',
  },
  {
    title: 'Review main course',
    desc: 'Publish your main course container, then add your Monthly or Batch Sub-Packs.',
    icon: <path d="m5 12 5 5 9-10" />,
    sClass: 's5',
  },
];

function MultiPackGuideModal({ isOpen, onClose }) {
  const [lang, setLang] = useState('en');
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 24,
          maxWidth: 640,
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 24px 64px rgba(15, 23, 42, 0.22)',
          border: '1px solid #e2e8f0',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '22px 26px 18px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
                color: '#fff',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
              }}
            >
              <Layers size={20} />
            </div>
            <div>
              <div style={{ fontSize: 11.5, fontWeight: 800, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {lang === 'si' ? 'ඉක්මන් මගපෙන්වීම' : 'Quick Guide'}
              </div>
              <h2 style={{ margin: 0, fontSize: 19, fontWeight: 800, color: '#0f172a' }}>
                {lang === 'si' ? 'Multi-Pack සහ සාමාන්‍ය Pack අතර වෙනස කුමක්ද?' : 'How is a Multi-Pack different from a Normal Pack?'}
              </h2>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                display: 'inline-flex',
                background: '#f1f5f9',
                borderRadius: 99,
                padding: 3,
              }}
            >
              <button
                type="button"
                onClick={() => setLang('en')}
                style={{
                  border: 0,
                  borderRadius: 99,
                  padding: '5px 11px',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: lang === 'en' ? '#fff' : 'transparent',
                  color: lang === 'en' ? '#0f172a' : '#64748b',
                  boxShadow: lang === 'en' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => setLang('si')}
                style={{
                  border: 0,
                  borderRadius: 99,
                  padding: '5px 11px',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: lang === 'si' ? '#fff' : 'transparent',
                  color: lang === 'si' ? '#0f172a' : '#64748b',
                  boxShadow: lang === 'si' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                සිංහල
              </button>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                border: '1px solid #e2e8f0',
                background: '#fff',
                color: '#64748b',
                display: 'grid',
                placeItems: 'center',
                cursor: 'pointer',
              }}
            >
              <X size={17} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '22px 26px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Side-by-side comparison */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
            <div
              style={{
                padding: 16,
                borderRadius: 16,
                border: '1.5px solid #e2e8f0',
                background: '#f8fafc',
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 800, color: '#64748b', marginBottom: 6 }}>
                {lang === 'si' ? 'සාමාන්‍ය Pack (Normal Pack)' : 'Normal Session Pack'}
              </div>
              <div style={{ fontSize: 15, fontWeight: 750, color: '#0f172a', marginBottom: 6 }}>
                {lang === 'si' ? 'තනි පාඨමාලාවක් / එක් ගෙවීමක්' : 'Single Course · One Payment'}
              </div>
              <p style={{ margin: 0, fontSize: 13, color: '#475569', lineHeight: 1.5 }}>
                {lang === 'si'
                  ? 'එකවර ගෙවීමක් කර සියලුම සැසි (Sessions) වලට සම්බන්ධ වන කෙටි වැඩමුළු හෝ තනි පාඨමාලා සඳහා සුදුසුයි.'
                  : 'Best for standalone workshops or fixed courses where students pay once to unlock all sessions directly.'}
              </p>
            </div>

            <div
              style={{
                padding: 16,
                borderRadius: 16,
                border: '2px solid #2563eb',
                background: 'linear-gradient(145deg, #eff6ff 0%, #eef2ff 100%)',
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 800, color: '#2563eb', marginBottom: 6 }}>
                {lang === 'si' ? 'Multi-Pack (මාසික / කණ්ඩායම් පන්ති)' : 'Multi-Pack · Main Course + Sub-Packs'}
              </div>
              <div style={{ fontSize: 15, fontWeight: 750, color: '#0f172a', marginBottom: 6 }}>
                {lang === 'si' ? 'ප්‍රධාන පාඨමාලාව යටතේ මාසික / Batch අනු-පාඨමාලා' : 'Main Course Hub + Monthly / Batch Sub-Packs'}
              </div>
              <p style={{ margin: 0, fontSize: 13, color: '#1e3a8a', lineHeight: 1.5 }}>
                {lang === 'si'
                  ? 'අගෝස්තු, සැප්තැම්බර් වැනි මාසික පන්ති හෝ 1st Batch, 2nd Batch ලෙස කොටස් වශයෙන් ගෙවීම් කරන දිගුකාලීන පාඨමාලා සඳහාම නිර්මාණය කර ඇත.'
                  : 'Built for monthly tuition classes (August → September → October) or multi-phase courses (1st Batch, 2nd Batch, 3rd Batch).'}
              </p>
            </div>
          </div>

          {/* 3-step visual flow */}
          <div
            style={{
              background: '#fff',
              borderRadius: 16,
              border: '1px solid #e2e8f0',
              padding: '16px 18px',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>
              {lang === 'si' ? 'Multi-Pack ක්‍රියාත්මක වන ආකාරය:' : 'How Multi-Pack works in 3 steps:'}
            </div>

            {[
              {
                num: '1',
                title: lang === 'si' ? 'ප්‍රධාන පාඨමාලාව (Main Course) සකසන්න' : 'Set up the Main Course Showcase (No session dates here)',
                desc: lang === 'si'
                  ? 'පාඨමාලාවේ නම, විස්තරය, Cover Image සහ Intro Video ඇතුළත් කරන්න. Discover පිටුවේ සිසුන්ට පෙනෙන්නේ මෙම ප්‍රධාන පාඨමාලාවයි.'
                  : 'Add the full course title, description, cover image, and intro video. Only this clean Main Course card appears on Discover.',
              },
              {
                num: '2',
                title: lang === 'si' ? 'ඒ යටතේ Sub-Packs (මාස හෝ Batches) සාදන්න' : 'Create Sub-Packs underneath whenever you want',
                desc: lang === 'si'
                  ? 'අගෝස්තු මාසය, සැප්තැම්බර් මාසය හෝ 1st / 2nd Batch ලෙස වෙන වෙනම Sub-Packs සාදා ඒවාට අදාළ ගාස්තුව, Thumbnail සහ Session දින ඇතුළත් කරන්න.'
                  : 'Add Sub-Packs like "August Month", "September Month", or "Batch 01", each with its own thumbnail, price, Zoom schedule, and recordings.',
              },
              {
                num: '3',
                title: lang === 'si' ? 'සිසුන් Sub-Pack එක තෝරා ගෙවීම් කරයි' : 'Learners pick a Sub-Pack & pay normally',
                desc: lang === 'si'
                  ? 'සිසුන් ප්‍රධාන පාඨමාලාවට පිවිස තමන්ට අවශ්‍ය මාසය / Batch එක ක්ලික් කර සාමාන්‍ය පරිදි ගෙවීම් රිසිට්පත (Slip) යොමු කරයි.'
                  : 'Learners open your Main Course, see all monthly/batch Sub-Packs underneath, click the one they need, and complete payment seamlessly.',
              },
            ].map(item => (
              <div key={item.num} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <span
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: '50%',
                    background: '#eff6ff',
                    color: '#2563eb',
                    fontWeight: 800,
                    fontSize: 13,
                    display: 'grid',
                    placeItems: 'center',
                    flexShrink: 0,
                    marginTop: 1,
                  }}
                >
                  {item.num}
                </span>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 750, color: '#0f172a' }}>{item.title}</div>
                  <div style={{ fontSize: 12.5, color: '#64748b', lineHeight: 1.45, marginTop: 2 }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 26px 22px',
            borderTop: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <Link
            to="/creator/packs/new"
            style={{ fontSize: 13, fontWeight: 600, color: '#64748b', textDecoration: 'none' }}
          >
            {lang === 'si' ? '← සාමාන්‍ය Pack එකක් සෑදීමට යන්න' : '← Switch to Normal Pack instead'}
          </Link>
          <button
            type="button"
            onClick={onClose}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: '#2563eb',
              color: '#fff',
              border: 0,
              borderRadius: 12,
              padding: '11px 22px',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)',
            }}
          >
            <span>{lang === 'si' ? 'Multi-Pack සෑදීම අරඹන්න' : 'Continue creating Multi-Pack'}</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CreateMultiPack() {
  useSubscriptionGuard();
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [guideOpen, setGuideOpen] = useState(true);
  const [toastMsg, setToastMsg] = useState('');
  const toastTimeoutRef = useRef(null);

  const showToast = (msg) => {
    setToastMsg(msg);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToastMsg(''), 2800);
  };

  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '',
    currency: 'LKR',
    visibility: 'public',
    invite_token: generateInviteToken(),
    sequential_unlock: false,
    thumbnail: null,
    thumbnailPreview: null,
    intro_video_url: '',
    whatsapp_number: profile?.contact_number || '',
    whatsapp_link: '',
    telegram_link: '',
  });

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleThumbnail = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    update('thumbnail', file);
    update('thumbnailPreview', URL.createObjectURL(file));
  };

  const canNext = () => {
    if (step === 0) {
      return Boolean(form.title.trim() && form.description.trim() && form.category);
    }
    return true;
  };

  const handleNext = () => {
    if (!canNext()) return;
    setStep(s => s + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    if (step === 0) return;
    setStep(s => s - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSave = async (publish) => {
    setSaving(true);
    try {
      let thumbnailUrl = null;
      if (form.thumbnail) {
        const ext = form.thumbnail.name.split('.').pop();
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('thumbnails').upload(path, form.thumbnail);
        if (!upErr) {
          const { data: urlData } = supabase.storage.from('thumbnails').getPublicUrl(path);
          thumbnailUrl = urlData.publicUrl;
        }
      }

      const slug = await generateUniquePackSlug(form.title);

      const packPayload = {
        creator_id: user.id,
        title: form.title.trim(),
        slug,
        description: form.description.trim(),
        category: form.category,
        price: 0,
        currency: form.currency,
        visibility: form.visibility || 'public',
        invite_token: form.invite_token || generateInviteToken(),
        thumbnail_url: thumbnailUrl,
        intro_video_url: form.intro_video_url || null,
        whatsapp_number: form.whatsapp_number || null,
        whatsapp_link: form.whatsapp_link || null,
        telegram_link: form.telegram_link || null,
        has_free_session: false,
        is_published: publish,
        is_multi_pack: true,
        sequential_unlock: Boolean(form.sequential_unlock),
      };

      const { data: pack, error: packErr } = await supabase
        .from('session_packs')
        .insert(packPayload)
        .select()
        .single();

      if (packErr) {
        if (packErr.message?.includes('is_multi_pack')) {
          throw new Error(
            'Database migration needed: Please run supabase_migration_multi_packs.sql in your Supabase SQL Editor first.'
          );
        }
        throw packErr;
      }

      showToast(publish ? 'Main Multi-Pack published! Now add your first Sub-Pack.' : 'Saved as draft!');
      setTimeout(() => {
        navigate(`/creator/multi-packs/${pack.id}`);
      }, 650);
    } catch (err) {
      console.error('Multi-pack save error:', err);
      showToast('Error: ' + err.message);
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const currentMeta = STEP_META[step];

  return (
    <PageTransition>
      <div className="lora-wizard">
        <div className="page">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 8 }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 800, color: '#2563eb', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '3px 10px', borderRadius: 99, marginBottom: 6 }}>
                <Layers size={13} /> MULTI-COURSE PACK
              </div>
              <h1 style={{ margin: 0 }}>Create Multi-Pack</h1>
              <p style={{ margin: '4px 0 0', color: 'var(--muted)' }}>
                Create a main course showcase and organize monthly classes or sequential batches underneath it.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setGuideOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                background: '#eff6ff',
                color: '#2563eb',
                border: '1px solid #bfdbfe',
                borderRadius: 12,
                padding: '8px 15px',
                fontSize: 13,
                fontWeight: 750,
                cursor: 'pointer',
              }}
            >
              <HelpCircle size={15} />
              <span>Why Multi-Pack? (මගපෙන්වීම)</span>
            </button>
          </div>

          {/* Stepper Card */}
          <section className="card stp">
            <div className="steps">
              <div className="track">
                <i style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }}></i>
              </div>
              {STEPS.map((name, i) => {
                const isDone = i < step;
                const isCurrent = i === step;
                const cls = isDone ? 'done' : isCurrent ? 'cur' : '';
                return (
                  <div
                    key={name}
                    className={`st ${cls}`}
                    onClick={() => {
                      if (i < step) setStep(i);
                    }}
                    style={{ cursor: i < step ? 'pointer' : 'default' }}
                  >
                    <div className="dot">
                      {isDone ? (
                        <svg className="ic" viewBox="0 0 24 24"><path d="m5 12 5 5 9-10" /></svg>
                      ) : (
                        i + 1
                      )}
                    </div>
                    <span>{name}</span>
                  </div>
                );
              })}
            </div>
            <p className="mob">
              Step {step + 1} of {STEPS.length}: {STEPS[step]}
            </p>
          </section>

          {/* Step Form Card */}
          <section className="card" id="card">
            <div className={`body ${currentMeta.sClass}`}>
              <div className="sh">
                <span className="ib">
                  <svg className="ic" viewBox="0 0 24 24" style={{ width: 22, height: 22 }}>
                    {currentMeta.icon}
                  </svg>
                </span>
                <div>
                  <h2>{currentMeta.title}</h2>
                  <p>{currentMeta.desc}</p>
                </div>
              </div>

              {/* STEP 0: Main Course Info */}
              {step === 0 && (() => {
                const vis = form.visibility || 'public';
                return (
                  <div className="g">
                    {/* Info Callout */}
                    <div
                      style={{
                        padding: '12px 16px',
                        borderRadius: 14,
                        background: 'linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%)',
                        border: '1.5px solid #bfdbfe',
                        fontSize: 13,
                        color: '#1e3a8a',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 10,
                        lineHeight: 1.5,
                      }}
                    >
                      <Calendar size={18} style={{ flexShrink: 0, marginTop: 2, color: '#2563eb' }} />
                      <div>
                        <b>No session dates or price needed here:</b> This Main Course acts as your public showcase on Discover. Once saved, you will create <b>Sub-Packs</b> underneath it (e.g. <i>August Month</i>, <i>September Month</i>, or <i>1st Batch</i>, <i>2nd Batch</i>) with their own session dates and prices.
                      </div>
                    </div>

                    {/* Course Visibility */}
                    <div className="f">
                      <label>Main course visibility</label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10 }}>
                        {[
                          {
                            id: 'public',
                            icon: <Globe2 size={16} />,
                            title: 'Public',
                            desc: 'Shown on Discover & your profile',
                            accent: '#2563eb',
                            bg: '#eff6ff',
                          },
                          {
                            id: 'private',
                            icon: <Lock size={16} />,
                            title: 'Private Showcase',
                            desc: 'Shows as Private · Invite only',
                            accent: '#d97706',
                            bg: '#fffbeb',
                          },
                          {
                            id: 'unlisted',
                            icon: <EyeOff size={16} />,
                            title: 'Unlisted (Hidden)',
                            desc: 'Hidden from Discover · Link only',
                            accent: '#7c3aed',
                            bg: '#f5f3ff',
                          },
                        ].map(opt => {
                          const active = vis === opt.id;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => update('visibility', opt.id)}
                              style={{
                                textAlign: 'left',
                                padding: '12px 14px',
                                borderRadius: 14,
                                border: active ? `2px solid ${opt.accent}` : '1.5px solid var(--line)',
                                background: active ? opt.bg : '#fff',
                                cursor: 'pointer',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 4,
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontWeight: 750, fontSize: 14, color: active ? opt.accent : '#0f172a' }}>
                                {opt.icon}
                                <span>{opt.title}</span>
                              </div>
                              <span style={{ fontSize: 12, color: '#64748b', lineHeight: 1.35 }}>
                                {opt.desc}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="f">
                      <label htmlFor="mp-title">Main course title <em>*</em></label>
                      <input
                        id="mp-title"
                        placeholder="e.g. 2026 A/L Physics Full Theory or Full-Stack Web Engineering"
                        value={form.title}
                        onChange={e => update('title', e.target.value)}
                        required
                      />
                    </div>

                    <div className="f">
                      <label htmlFor="mp-desc">Full course description <em>*</em></label>
                      <textarea
                        id="mp-desc"
                        rows={4}
                        placeholder="Explain the complete curriculum, how monthly batches or phases work, and what learners will achieve..."
                        value={form.description}
                        onChange={e => update('description', e.target.value)}
                        required
                      />
                    </div>

                    <div className="g g2">
                      <div className="f">
                        <label htmlFor="mp-cat">Category <em>*</em></label>
                        <select
                          id="mp-cat"
                          value={form.category}
                          onChange={e => update('category', e.target.value)}
                        >
                          <option value="">Select category</option>
                          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div className="f">
                        <label htmlFor="mp-cur">Default currency for Sub-Packs</label>
                        <select
                          id="mp-cur"
                          value={form.currency}
                          onChange={e => update('currency', e.target.value)}
                        >
                          {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* Recommendation #2: Batch Progression / Unlock Rule */}
                    <div className="f">
                      <label>How should learners enroll in your Sub-Packs?</label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 10 }}>
                        <button
                          type="button"
                          onClick={() => update('sequential_unlock', false)}
                          style={{
                            textAlign: 'left',
                            padding: '14px 16px',
                            borderRadius: 14,
                            border: !form.sequential_unlock ? '2px solid #2563eb' : '1.5px solid var(--line)',
                            background: !form.sequential_unlock ? '#eff6ff' : '#fff',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 5,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontWeight: 750, fontSize: 14, color: !form.sequential_unlock ? '#2563eb' : '#0f172a' }}>
                            <Unlock size={16} />
                            <span>Open Batch Selection (Default)</span>
                          </div>
                          <span style={{ fontSize: 12.5, color: '#475569', lineHeight: 1.4 }}>
                            Learners can click &amp; pay for <b>any</b> Sub-Pack directly (ideal when new students join mid-year in September/October).
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => update('sequential_unlock', true)}
                          style={{
                            textAlign: 'left',
                            padding: '14px 16px',
                            borderRadius: 14,
                            border: form.sequential_unlock ? '2px solid #7c3aed' : '1.5px solid var(--line)',
                            background: form.sequential_unlock ? '#f5f3ff' : '#fff',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 5,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontWeight: 750, fontSize: 14, color: form.sequential_unlock ? '#7c3aed' : '#0f172a' }}>
                            <GitBranch size={16} />
                            <span>Step-by-Step Order (1st → 2nd → 3rd)</span>
                          </div>
                          <span style={{ fontSize: 12.5, color: '#475569', lineHeight: 1.4 }}>
                            Learners must be approved in Batch 1 before unlocking Batch 2, and Batch 2 before Batch 3.
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* STEP 1: Media */}
              {step === 1 && (
                <div className="g">
                  <div className="f">
                    <label>Main course cover image</label>
                    {form.thumbnailPreview ? (
                      <div className="thumb" style={{ backgroundImage: `url(${form.thumbnailPreview})` }}>
                        <button
                          type="button"
                          onClick={() => {
                            update('thumbnail', null);
                            update('thumbnailPreview', null);
                          }}
                          aria-label="Remove thumbnail"
                        >
                          <svg className="ic" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18" /></svg>
                        </button>
                      </div>
                    ) : (
                      <label className="drop">
                        <svg className="ic" viewBox="0 0 24 24">
                          <path d="M12 16V4M7 9l5-5 5 5M4 20h16" />
                        </svg>
                        <b>Upload main course thumbnail</b>
                        <small>PNG or JPG, 16:9 looks best · Displayed on Discover &amp; shared as default cover for Sub-Packs</small>
                        <input type="file" accept="image/*" onChange={handleThumbnail} />
                      </label>
                    )}
                  </div>
                  <div className="f">
                    <label htmlFor="mp-intro">Main course intro video URL <span>(YouTube/Vimeo)</span></label>
                    <input
                      id="mp-intro"
                      type="url"
                      placeholder="https://youtube.com/watch?v=..."
                      value={form.intro_video_url}
                      onChange={e => update('intro_video_url', e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* STEP 2: Contact & Community */}
              {step === 2 && (
                <div className="g">
                  <div className="sub">Shared inquiry &amp; community details</div>
                  <p className="note">
                    Displayed on your Main Course page — and automatically pre-filled whenever you create a new Sub-Pack!
                  </p>

                  <div className="f">
                    <label>WhatsApp &amp; contact number</label>
                    <PhoneInput
                      international
                      defaultCountry="LK"
                      value={form.whatsapp_number}
                      onChange={v => update('whatsapp_number', v || '')}
                    />
                    {profile?.contact_number && form.whatsapp_number !== profile.contact_number && (
                      <button
                        type="button"
                        onClick={() => update('whatsapp_number', profile.contact_number)}
                        className="use-profile-num"
                      >
                        Use my profile number ({profile.contact_number})
                      </button>
                    )}
                  </div>

                  <div className="f">
                    <label htmlFor="mp-wag">Default WhatsApp group link <span>(optional)</span></label>
                    <input
                      id="mp-wag"
                      type="url"
                      placeholder="https://chat.whatsapp.com/..."
                      value={form.whatsapp_link}
                      onChange={e => update('whatsapp_link', e.target.value)}
                    />
                  </div>

                  <div className="f">
                    <label htmlFor="mp-tg">Default Telegram channel link <span>(optional)</span></label>
                    <input
                      id="mp-tg"
                      type="url"
                      placeholder="https://t.me/..."
                      value={form.telegram_link}
                      onChange={e => update('telegram_link', e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* STEP 3: Review */}
              {step === 3 && (
                <div>
                  <div className="rv">
                    <div
                      className="rimg"
                      style={
                        form.thumbnailPreview
                          ? { backgroundImage: `url(${form.thumbnailPreview})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                          : {}
                      }
                    >
                      {!form.thumbnailPreview && (
                        <Layers size={28} />
                      )}
                    </div>
                    <div>
                      <span className="pill">{form.category || 'Uncategorized'} · Multi-Pack</span>
                      <h3>{form.title || 'Untitled Main Course'}</h3>
                      <p style={{ marginTop: 6, fontSize: 13.5, color: '#475569' }}>
                        Default Currency: <b>{form.currency}</b> ·{' '}
                        {form.sequential_unlock ? 'Step-by-Step Progression (1st → 2nd)' : 'Open Batch Selection'}
                      </p>
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: 18,
                      padding: '16px 18px',
                      borderRadius: 16,
                      background: 'linear-gradient(135deg, #eff6ff 0%, #f5f3ff 100%)',
                      border: '1.5px solid #c7d2fe',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 12,
                    }}
                  >
                    <Sparkles size={20} style={{ color: '#4f46e5', flexShrink: 0, marginTop: 2 }} />
                    <div style={{ fontSize: 13.5, color: '#1e1b4b', lineHeight: 1.55 }}>
                      <b>What happens next?</b> Right after you click Publish (or Save as Draft), you will open your <b>Multi-Pack Hub</b> where you can click <b>&ldquo;+ Create Sub-Pack&rdquo;</b> to add your first monthly pack or batch (with scheduled session dates, recordings, and price).
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className={`foot ${step === STEPS.length - 1 ? 'last' : ''}`}>
              {step === STEPS.length - 1 ? (
                <>
                  <button
                    className="btn out"
                    type="button"
                    onClick={() => handleSave(false)}
                    disabled={saving}
                  >
                    Save as draft
                  </button>
                  <button
                    className="btn pri"
                    type="button"
                    onClick={() => handleSave(true)}
                    disabled={saving}
                  >
                    {saving ? (
                      <Loader2 className="ic animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 size={17} />
                        Publish &amp; Add Sub-Packs
                      </>
                    )}
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="btn back"
                    type="button"
                    onClick={handleBack}
                    style={{ visibility: step === 0 ? 'hidden' : 'visible' }}
                  >
                    <svg className="ic" viewBox="0 0 24 24"><path d="M19 12H5M11 6l-6 6 6 6" /></svg>
                    Back
                  </button>
                  <button
                    className="btn pri"
                    type="button"
                    onClick={handleNext}
                    disabled={!canNext()}
                  >
                    Next <svg className="ic" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                  </button>
                </>
              )}
            </div>
          </section>
        </div>

        <div className={`toast ${toastMsg ? 'show' : ''}`} role="status">
          {toastMsg}
        </div>

        <MultiPackGuideModal isOpen={guideOpen} onClose={() => setGuideOpen(false)} />
      </div>
    </PageTransition>
  );
}
