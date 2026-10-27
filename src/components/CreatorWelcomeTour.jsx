import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles, Building2, Video, Ticket, Share2,
  CheckCircle2, ArrowRight, ArrowLeft, X, BookOpen
} from 'lucide-react';

const TOUR_SLIDES = {
  si: [
    {
      badge: 'LoraSpace වෙත සාදරයෙන් පිළිගනිමු',
      title: 'ඔයාගේම Online පන්ති සහ Courses එකම තැනකින්! 🚀',
      subtitle: 'Live පන්ති සහ Recordings පිළිවෙළකට පවත්වාගෙන යන්නත්, සිසුන්ගෙන් 100% ක්ම කෙලින්ම ඔයාගේ අතටම ගෙවීම් ලබාගන්නත් LoraSpace හරහා පුළුවන්.',
      icon: Sparkles,
      accent: '#2563eb',
      accentSoft: '#eff6ff',
      highlights: [
        {
          title: 'Session Packs (පාඨමාලා ගොනු)',
          desc: 'Live පන්ති කිහිපයක් හෝ Recorded පාඩම් කිහිපයක් එකතු කරලා පිළිවෙළකට එක Course Pack එකක් විදිහට හදන්න පුළුවන්.',
        },
        {
          title: 'සිසුන්ගේ පූර්ණ පාලනය ඔයා අතේ',
          desc: 'පන්තියට සම්බන්ධ වෙන හැම ළමයෙක්වම බලාගන්න, Payment Slips පරීක්ෂා කරන්න සහ එක Click එකකින් Approve කරන්න පුළුවන්.',
        },
        {
          title: 'අතරමැදි ගාස්තු හෝ ප්‍රමාදයන් නැහැ',
          desc: 'ළමයි ගෙවන මුදල් කෙලින්ම ඔයාගේ Bank Account එකට හෝ Payment Link එකටමයි ලැබෙන්නේ.',
        },
      ],
      previewType: 'overview',
    },
    {
      badge: 'පියවර 1 · මුදල් ලබාගැනීම',
      title: '100% ක්ම මුදල් කෙලින්ම ඔයාගේ Bank Account එකට 🏦',
      subtitle: 'ලංකාවේ ඕනෑම බැංකුවකින් සිසුන්ට පහසුවෙන්ම ඔයාට මුදල් ගෙවන්න පහසුකම් හදලා තියෙනවා.',
      icon: Building2,
      accent: '#059669',
      accentSoft: '#ecfdf5',
      highlights: [
        {
          title: 'Bank Accounts 4ක් දක්වා ඇතුළත් කරන්න',
          desc: 'BOC, Sampath, Commercial, HNB වගේ ඔයාගේ බැංකු ගිණුම් 4ක් දක්වා Settings වලට දාන්න පුළුවන්. ළමයින්ට තමන් කැමති බැංකුව තෝරලා මුදල් දාන්න පුළුවන්.',
        },
        {
          title: 'විශේෂ Reference Code ක්‍රමය',
          desc: 'හැම සිසුවෙකුටම මුදල් ගෙවද්දී Bank Slip එකේ සඳහන් කරන්න වෙනම Reference Code එකක් (උදා: LORA-8492) ස්වයංක්‍රීයව ලැබෙනවා.',
        },
        {
          title: 'එක Click එකකින් Slip Approval',
          desc: 'ළමයි Payment Slip එක Upload කළාම, ඔයාගේ Enrollments පිටුවෙන් ඒක බලලා එක Click එකකින් Course Access ලබාදෙන්න පුළුවන්.',
        },
      ],
      previewType: 'bank',
    },
    {
      badge: 'පියවර 2 · පන්ති පැවැත්වීම',
      title: 'Zoom / YouTube Live සහ පසුගිය Recordings 🎥',
      subtitle: 'Live පන්ති වගේම Recorded පාඩම් දෙකම එකම Session Pack එකකට එකතු කරන්න පුළුවන්.',
      icon: Video,
      accent: '#7c3aed',
      accentSoft: '#f5f3ff',
      highlights: [
        {
          title: 'Live Scheduled Classes (Zoom / YouTube Live)',
          desc: 'ඉදිරියට පැවැත්වෙන පන්ති සඳහා Zoom Link එකක් හෝ YouTube Live (Unlisted) ලින්ක් එකක් දිනය සහ වේලාව සමඟ ඇතුළත් කරන්න.',
        },
        {
          title: 'Past Catch-Up Recordings (පසුගිය පාඩම්)',
          desc: 'පන්තිය පටන් ගත්තට පස්සේ අලුතින් එකතු වෙන ළමයින්ට, කලින් දවස්වල Recordings එවෙලේම බලන්න "Past Recording" ඔප්ෂන් එක පාවිච්චි කරන්න.',
        },
        {
          title: 'සිසුන්ට Auto-Notification යැවීම',
          desc: 'Live පන්තියක් ඉවර වුණාම Dashboard එකෙන්ම Recording Link එක දාපු ගමන් පන්තියේ හැම ළමයෙකුටම Notification එකක් යනවා.',
        },
      ],
      previewType: 'sessions',
    },
    {
      badge: 'පියවර 3 · සුවිශේෂී පහසුකමක්',
      title: 'නොමිලේ පන්ති ලබාදීමට Promo Codes (LORA-FREE-7X9) 🎟️',
      subtitle: 'ළමයින්ගේ Email එකින් එක ඉල්ලන්නේ නැතුව, ඔයාට කැමති සිසුන් ගණනකට විතරක් 100% නොමිලේ Access ලබාදෙන්න.',
      icon: Ticket,
      accent: '#d97706',
      accentSoft: '#fffbeb',
      highlights: [
        {
          title: 'Auto-Generated Promo Codes',
          desc: 'ඔයාගේ Session Pack එක Edit කරන තැනින් එක Click එකකින් LORA-FREE-7X9 වගේ Promo Code එකක් හදාගන්න පුළුවන්.',
        },
        {
          title: 'සිසුන් ගණන (Attempts) සීමා කිරීම',
          desc: '1 ළමයෙකුට විතරක්ද, නැත්නම් ළමයි 15 දෙනෙකුටද කියලා ඔයාට තීරණය කරන්න පුළුවන්. 15 දෙනාම Join වුණාට පස්සේ 16 වෙනියාට ඒ Code එක ඉබේම Expire වෙනවා!',
        },
        {
          title: 'Payment Slip නැතුව කෙලින්ම Free Join වීම',
          desc: 'Code එක හෝ Direct Promo Link එක යැව්වම, සිසුන්ට මුදල් ගෙවීමකින් තොරව එක Click එකකින් පන්තියට නොමිලේ සම්බන්ධ වෙන්න පුළුවන්.',
        },
      ],
      previewType: 'promo',
    },
    {
      badge: 'පියවර 4 · ප්‍රචාරණය සහ සහාය',
      title: 'WhatsApp බටන්, Custom Links සහ Creator Guide 💬',
      subtitle: 'ඔයාගේ පාඨමාලාව ගැන විස්තර අහන්න සහ පහසුවෙන් Share කරන්න අවශ්‍ය සියලුම පහසුකම්.',
      icon: Share2,
      accent: '#db2777',
      accentSoft: '#fdf2f8',
      highlights: [
        {
          title: 'WhatsApp සහ Direct Call බටන්',
          desc: 'පන්තියට බැඳෙන්න කලින් ළමයින්ට ඔයාගෙන් විස්තර අහගන්න WhatsApp සහ Phone Call බටන් ඔයාගේ Course පිටුවටම එකතු කරන්න පුළුවන්.',
        },
        {
          title: 'ලස්සන Custom Course Links',
          desc: 'Facebook, TikTok, Instagram හෝ WhatsApp Status වල Share කරන්න ලේසි වෙන්න ඔයාගේ Course Link එක කැමති විදිහට හදාගන්න.',
        },
        {
          title: 'ඕනෑම වෙලාවක "Creator Guide" බලන්න',
          desc: 'මොනවා හරි අමතක වුණොත් වම් පැත්තේ තියෙන "Creator Guide" එකෙන් සිංහලෙන්ම හැම විස්තරයක්ම බලාගන්න පුළුවන්!',
        },
      ],
      previewType: 'share',
    },
  ],
  en: [
    {
      badge: 'Welcome to LoraSpace',
      title: 'Your All-in-One Creator Teaching Hub 🚀',
      subtitle: 'Teach live or recorded sessions, manage enrollments, and get paid 100% directly by your students.',
      icon: Sparkles,
      accent: '#2563eb',
      accentSoft: '#eff6ff',
      highlights: [
        {
          title: 'Session Packs',
          desc: 'Bundle multiple live classes or recorded lessons into a single structured course pack.',
        },
        {
          title: 'Full Student Ownership',
          desc: 'Track every student, verify payments in one click, and automatically notify learners.',
        },
        {
          title: 'Zero Middleman Delays',
          desc: 'Learners pay directly to your bank account or payment link — you keep 100% control.',
        },
      ],
      previewType: 'overview',
    },
    {
      badge: 'Step 1 · Getting Paid',
      title: 'Multi-Bank Accounts & Direct Payment Links 🏦',
      subtitle: 'Make it effortless for Sri Lankan & international students to pay you.',
      icon: Building2,
      accent: '#059669',
      accentSoft: '#ecfdf5',
      highlights: [
        {
          title: 'Add up to 4 Bank Accounts',
          desc: 'Add BOC, Sampath, Commercial, HNB, etc. Students see interactive bank pills at checkout.',
        },
        {
          title: 'Smart Reference Codes',
          desc: 'Every learner gets a unique reference code (e.g. LORA-8492) to paste in their bank transfer remarks.',
        },
        {
          title: '1-Click Slip Approval',
          desc: 'Students upload their transfer receipt. You review & confirm it from your Enrollments tab.',
        },
      ],
      previewType: 'bank',
    },
    {
      badge: 'Step 2 · Hybrid Teaching',
      title: 'Live Zoom, YouTube Live & Catch-Up Recordings 🎥',
      subtitle: 'Run live interactive cohorts or sell self-paced recorded packs — or combine both!',
      icon: Video,
      accent: '#7c3aed',
      accentSoft: '#f5f3ff',
      highlights: [
        {
          title: 'Live Scheduled Classes',
          desc: 'Add Zoom links or unlisted YouTube Live streams with automatic countdown timers for students.',
        },
        {
          title: 'Past Catch-Up Recordings',
          desc: 'Toggle any session to "Past Recording" so late-joining students can immediately watch previous classes.',
        },
        {
          title: 'Auto-Notify Enrolled Students',
          desc: 'When a live class ends, paste the recording link right from your dashboard to alert all students.',
        },
      ],
      previewType: 'sessions',
    },
    {
      badge: 'Step 3 · Power Feature',
      title: 'Usage-Limited Free Promo Codes 🎟️',
      subtitle: 'Give scholarships or free batch access without collecting emails one by one.',
      icon: Ticket,
      accent: '#d97706',
      accentSoft: '#fffbeb',
      highlights: [
        {
          title: 'Auto-Generated Codes (LORA-FREE-7X9)',
          desc: 'Generate clean promo codes inside your Pack Editor with a single click.',
        },
        {
          title: 'Exact Attempt / Student Limits',
          desc: 'Set a code for 1 student or 15 students. Once 15 learners claim it, the 16th is automatically blocked.',
        },
        {
          title: '1-Click Free Enrollment Link',
          desc: 'Copy the direct promo link (?promo=LORA-FREE-7X9) so students enroll for free without uploading a payment slip.',
        },
      ],
      previewType: 'promo',
    },
    {
      badge: 'Step 4 · Grow & Convert',
      title: 'WhatsApp Inquiry, Custom URLs & Public Profile 💬',
      subtitle: 'Turn visitors into enrolled learners with built-in conversion tools.',
      icon: Share2,
      accent: '#db2777',
      accentSoft: '#fdf2f8',
      highlights: [
        {
          title: 'WhatsApp & Direct Call Buttons',
          desc: 'Add your WhatsApp & phone number to any pack so hesitant students can ask questions before buying.',
        },
        {
          title: 'Custom Course Slug Links',
          desc: 'Create memorable links like lora.lk/p/master-ui-design to share on Instagram, TikTok, or WhatsApp.',
        },
        {
          title: 'Creator Guide Always Available',
          desc: 'Need a refresher later? Open the "Creator Guide" from your sidebar anytime!',
        },
      ],
      previewType: 'share',
    },
  ],
};

export default function CreatorWelcomeTour({ isOpen, onClose }) {
  const [step, setStep] = useState(0);
  const [lang, setLang] = useState(() => localStorage.getItem('lora_guide_lang') || 'si');
  const navigate = useNavigate();

  useEffect(() => {
    const saved = localStorage.getItem('lora_guide_lang');
    if (saved === 'si' || saved === 'en') setLang(saved);
  }, [isOpen]);

  const handleLangChange = (newLang) => {
    setLang(newLang);
    localStorage.setItem('lora_guide_lang', newLang);
  };

  if (!isOpen) return null;

  const slides = TOUR_SLIDES[lang] || TOUR_SLIDES.si;
  const current = slides[step] || slides[0];
  const Icon = current.icon;
  const isLast = step === slides.length - 1;

  const handleOpenGuide = () => {
    onClose();
    navigate('/creator/guide');
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(14, 23, 51, 0.65)',
        backdropFilter: 'blur(6px)',
        display: 'grid',
        placeItems: 'center',
        padding: '16px',
        fontFamily: "'Figtree', system-ui, sans-serif",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 640,
          background: '#ffffff',
          borderRadius: 26,
          boxShadow: '0 28px 70px -15px rgba(14, 23, 51, 0.38)',
          border: '1px solid #e3e7f1',
          overflow: 'hidden',
          animation: 'loraRecToastIn 0.25s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top colorful header banner */}
        <div
          style={{
            background: `linear-gradient(135deg, ${current.accentSoft} 0%, #ffffff 100%)`,
            borderBottom: '1px solid #eef1f8',
            padding: '22px 26px 18px',
            position: 'relative',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: '#ffffff',
                color: current.accent,
                border: `1px solid ${current.accent}33`,
                borderRadius: 99,
                padding: '5px 13px',
                fontSize: 12.5,
                fontWeight: 700,
                letterSpacing: '0.02em',
              }}
            >
              <Icon size={14} />
              {current.badge}
            </span>

            {/* Language Switcher + Close Button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  display: 'inline-flex',
                  background: '#f1f5f9',
                  padding: 3,
                  borderRadius: 99,
                  border: '1px solid #e2e8f0',
                }}
              >
                <button
                  type="button"
                  onClick={() => handleLangChange('si')}
                  style={{
                    border: 0,
                    background: lang === 'si' ? '#2563eb' : 'transparent',
                    color: lang === 'si' ? '#ffffff' : '#475569',
                    padding: '4px 11px',
                    borderRadius: 99,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  🇱🇰 සිංහල
                </button>
                <button
                  type="button"
                  onClick={() => handleLangChange('en')}
                  style={{
                    border: 0,
                    background: lang === 'en' ? '#2563eb' : 'transparent',
                    color: lang === 'en' ? '#ffffff' : '#475569',
                    padding: '4px 11px',
                    borderRadius: 99,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  English
                </button>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close welcome tour"
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  border: '1px solid #e2e8f0',
                  background: '#ffffff',
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

          <h2
            style={{
              fontFamily: "'Bricolage Grotesque', sans-serif",
              fontSize: 'clamp(21px, 3vw, 26px)',
              fontWeight: 800,
              color: '#0e1733',
              margin: '0 0 6px',
              lineHeight: 1.25,
              letterSpacing: '-0.02em',
            }}
          >
            {current.title}
          </h2>
          <p style={{ margin: 0, color: '#5b647d', fontSize: 14.5, lineHeight: 1.55 }}>
            {current.subtitle}
          </p>
        </div>

        {/* Body Content */}
        <div style={{ padding: '20px 26px' }}>
          {/* Visual mini-preview pill bar for Promo slide */}
          {current.previewType === 'promo' && (
            <div
              style={{
                background: '#f8fafc',
                border: '1.5px dashed #cbd5e1',
                borderRadius: 14,
                padding: '12px 16px',
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 10,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontWeight: 800,
                    fontSize: 15,
                    color: '#2563eb',
                    background: '#eff6ff',
                    padding: '4px 10px',
                    borderRadius: 8,
                    border: '1px solid #bfdbfe',
                  }}
                >
                  LORA-FREE-7X9
                </span>
                <span style={{ fontSize: 13, color: '#475569', fontWeight: 600 }}>
                  {lang === 'si' ? '100% නොමිලේ · ළමයි 15 / 15' : '100% Free Access · 15 / 15 attempts'}
                </span>
              </div>
              <span
                style={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  background: '#dcfce7',
                  color: '#15803d',
                  padding: '3px 9px',
                  borderRadius: 99,
                }}
              >
                {lang === 'si' ? '16 වෙනියාට Auto-Expire වේ' : 'Auto-Expires on 16th'}
              </span>
            </div>
          )}

          {/* Feature Highlights List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {current.highlights.map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 13,
                  background: '#f8fafc',
                  border: '1px solid #eef2f6',
                  borderRadius: 16,
                  padding: '13px 16px',
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 9,
                    background: current.accentSoft,
                    color: current.accent,
                    display: 'grid',
                    placeItems: 'center',
                    flexShrink: 0,
                    marginTop: 1,
                  }}
                >
                  <CheckCircle2 size={16} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14.5, color: '#0e1733', marginBottom: 3 }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: 13.5, color: '#475569', lineHeight: 1.5 }}>
                    {item.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Controls */}
        <div
          style={{
            padding: '16px 26px 20px',
            borderTop: '1px solid #eef1f8',
            background: '#fafbfd',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          {/* Progress Dots */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setStep(i)}
                aria-label={`Slide ${i + 1}`}
                style={{
                  width: i === step ? 24 : 8,
                  height: 8,
                  borderRadius: 99,
                  border: 0,
                  background: i === step ? current.accent : '#cbd5e1',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  padding: 0,
                }}
              />
            ))}
            <span style={{ fontSize: 12.5, color: '#64748b', fontWeight: 600, marginLeft: 6 }}>
              {step + 1} / {slides.length}
            </span>
          </div>

          {/* Navigation Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {step > 0 ? (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '9px 15px',
                  borderRadius: 11,
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#334155',
                  fontSize: 13.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <ArrowLeft size={15} /> {lang === 'si' ? 'ආපසු' : 'Back'}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleOpenGuide}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '9px 14px',
                  borderRadius: 11,
                  border: '1px solid #e2e8f0',
                  background: '#ffffff',
                  color: '#475569',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <BookOpen size={14} /> {lang === 'si' ? 'සම්පූර්ණ විස්තරය' : 'Full Guide'}
              </button>
            )}

            {!isLast ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '9px 18px',
                  borderRadius: 11,
                  border: 0,
                  background: current.accent,
                  color: '#ffffff',
                  fontSize: 13.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {lang === 'si' ? 'ඊළඟ' : 'Next'} <ArrowRight size={15} />
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={handleOpenGuide}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '9px 14px',
                    borderRadius: 11,
                    border: '1.5px solid #2563eb',
                    background: '#eff6ff',
                    color: '#2563eb',
                    fontSize: 13.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  <BookOpen size={15} /> {lang === 'si' ? 'Creator Guide බලන්න' : 'Open Creator Guide'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '9px 18px',
                    borderRadius: 11,
                    border: 0,
                    background: '#0e1733',
                    color: '#ffffff',
                    fontSize: 13.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {lang === 'si' ? 'හරි, පටන් ගමු!' : "Got It, Let's Go!"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
