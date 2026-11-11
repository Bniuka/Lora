import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles, Building2, Video, Ticket, Share2,
  CheckCircle2, ArrowRight, ArrowLeft, X, BookOpen, ShieldCheck,
  Volume2, Pause
} from 'lucide-react';
import { voiceEngine, useVoiceEngine, TOUR_VOICE_CLIPS } from '../lib/sinhalaVoiceEngine';
import { VoiceEqualizer } from './CreatorVoiceAssistant';
import '../pages/creator-guide.css';

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
    {
      badge: 'පියවර 5 · උසස් ආරක්‍ෂාව සහ විගණනය',
      title: 'Copyright Sentinel සහ මූල්‍ය විගණන වාර්තා 🛡️',
      subtitle: 'ඔයාගේ Live Zoom / Recording ලින්ක්ස් පිටපත් කිරීම වැළැක්වීමේ තාක්ෂණය සහ බැංකු Slip විගණනය.',
      icon: ShieldCheck,
      accent: '#dc2626',
      accentSoft: '#fef2f2',
      highlights: [
        {
          title: 'Automated Copyright Sentinel',
          desc: 'වෙනත් කිසිවෙකුට ඔයාගේ Zoom හෝ Recording ලින්ක්ස් තමන්ගේ පන්තිවලට හොරෙන් දැමිය නොහැක. එසේ කළහොත් ලින්ක් එක Ban වී ඔයාට තහවුරු කිරීමේ පණිවිඩයක් ලැබේ.',
        },
        {
          title: '15-Min Classroom SOS & Dispute Desk',
          desc: 'Live පන්තියක ලින්ක් හෝ මුරපද ගැටලුවක් ආවොත් සිසුන්ට ක්ෂණික SOS වාර්තා කළ හැක. සිසුන් 3+ ක් වාර්තා කළ විට Creator ට Urgent Threshold Alert ලැබේ.',
        },
        {
          title: 'Bank Slip Reconciliation & Attendance',
          desc: 'Reports පිටුවෙන් (/creator/reports) BOC, Commercial, Sampath Slips විගණනය කර Print / CSV වාර්තා ලබාගන්න සහ සිසුන්ගේ Attendance පරීක්ෂා කරන්න.',
        },
      ],
      previewType: 'security',
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
    {
      badge: 'Step 5 · Security & Audits',
      title: 'Copyright Sentinel & Financial Audit Desk 🛡️',
      subtitle: 'Automated duplicate stream theft protection, Classroom SOS alerts, and bank slip reconciliation.',
      icon: ShieldCheck,
      accent: '#dc2626',
      accentSoft: '#fef2f2',
      highlights: [
        {
          title: 'Automated Copyright Sentinel',
          desc: 'Prevents other creators from reusing your Zoom or recording links. Automatically bans infringing packs and notifies you with reassurance.',
        },
        {
          title: '15-Min Classroom SOS & Dispute Desk',
          desc: 'Learners can flag broken live links before class. Urgent priority alerts are triggered if 3+ students report the same session.',
        },
        {
          title: 'Bank Slip Reconciliation & Attendance',
          desc: 'Audit BOC, Commercial, Sampath slips separately with printable statements and WhatsApp tuition attendance registers at /creator/reports.',
        },
      ],
      previewType: 'security',
    },
  ],
};

const DARK_ACCENT_TOKENS = {
  '#2563eb': { color: '#60a5fa', soft: 'rgba(59, 130, 246, 0.16)', border: 'rgba(96, 165, 250, 0.34)' },
  '#059669': { color: '#34d399', soft: 'rgba(16, 185, 129, 0.16)', border: 'rgba(52, 211, 153, 0.34)' },
  '#7c3aed': { color: '#a78bfa', soft: 'rgba(124, 58, 237, 0.18)', border: 'rgba(167, 139, 250, 0.36)' },
  '#d97706': { color: '#fbbf24', soft: 'rgba(245, 158, 11, 0.16)', border: 'rgba(251, 191, 36, 0.34)' },
  '#db2777': { color: '#f472b6', soft: 'rgba(236, 72, 153, 0.16)', border: 'rgba(244, 114, 182, 0.34)' },
  '#dc2626': { color: '#f87171', soft: 'rgba(239, 68, 68, 0.16)', border: 'rgba(248, 113, 113, 0.34)' },
};

export default function CreatorWelcomeTour({ isOpen, onClose }) {
  const [step, setStep] = useState(0);
  const [lang, setLang] = useState(() => localStorage.getItem('lora_guide_lang') || 'si');
  const [autoNext, setAutoNext] = useState(true);
  const navigate = useNavigate();
  const voice = useVoiceEngine();

  if (!isOpen) return null;

  const slides = TOUR_SLIDES[lang] || TOUR_SLIDES.si;
  const current = slides[step] || slides[0];
  const voiceClips = TOUR_VOICE_CLIPS[lang] || TOUR_VOICE_CLIPS.si;
  const currentVoiceClip = voiceClips[step] || voiceClips[0];
  const darkAccent = DARK_ACCENT_TOKENS[current.accent] || DARK_ACCENT_TOKENS['#2563eb'];
  const Icon = current.icon;
  const isLast = step === slides.length - 1;
  const isCurrentSlideSpeaking = voice.activeClipId === currentVoiceClip.clipId && voice.isPlaying && !voice.isPaused;

  const speakSlide = (slideIndex, targetLang = lang, shouldAutoAdvance = autoNext) => {
    const list = TOUR_VOICE_CLIPS[targetLang] || TOUR_VOICE_CLIPS.si;
    const clip = list[slideIndex];
    if (!clip) return;

    voiceEngine.playClip(clip.clipId, {
      itemId: `tour_${slideIndex}`,
      text: clip.text,
      lang: targetLang,
      onEnd: () => {
        if (shouldAutoAdvance && slideIndex < list.length - 1) {
          const nextIdx = slideIndex + 1;
          setStep(nextIdx);
          speakSlide(nextIdx, targetLang, shouldAutoAdvance);
        } else {
          voiceEngine.stop();
        }
      },
    });
  };

  const handleToggleVoice = () => {
    if (voice.activeClipId === currentVoiceClip.clipId && voice.isPlaying) {
      voiceEngine.togglePause();
      return;
    }
    speakSlide(step, lang, autoNext);
  };

  const handleStepChange = (nextStep) => {
    const wasPlaying = voice.isPlaying;
    setStep(nextStep);
    if (wasPlaying) {
      speakSlide(nextStep, lang, autoNext);
    }
  };

  const handleLangChange = (newLang) => {
    const wasPlaying = voice.isPlaying;
    setLang(newLang);
    localStorage.setItem('lora_guide_lang', newLang);
    if (wasPlaying) {
      speakSlide(step, newLang, autoNext);
    } else {
      voiceEngine.stop();
    }
  };

  const handleCloseModal = () => {
    voiceEngine.stop();
    onClose();
  };

  const handleOpenGuide = () => {
    voiceEngine.stop();
    onClose();
    navigate('/creator/guide');
  };

  return (
    <div
      className="lora-tour-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={current.title}
      onClick={handleCloseModal}
    >
      <div
        className="lt-modal"
        style={{
          '--lt-accent': current.accent,
          '--lt-accent-soft': current.accentSoft,
          '--lt-accent-border': `${current.accent}33`,
          '--lt-accent-dark': darkAccent.color,
          '--lt-accent-dark-soft': darkAccent.soft,
          '--lt-accent-dark-border': darkAccent.border,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top colorful header banner */}
        <div className="lt-header">
          <div className="lt-header-top">
            <span className="lt-badge">
              <Icon size={14} />
              {current.badge}
            </span>

            {/* Language Switcher + Close Button */}
            <div className="lt-header-controls">
              <div className="lg-lang-switch">
                <button
                  type="button"
                  className={`lg-lang-btn ${lang === 'si' ? 'active' : ''}`}
                  onClick={() => handleLangChange('si')}
                >
                  🇱🇰 සිංහල
                </button>
                <button
                  type="button"
                  className={`lg-lang-btn ${lang === 'en' ? 'active' : ''}`}
                  onClick={() => handleLangChange('en')}
                >
                  English
                </button>
              </div>

              <button
                type="button"
                className="lt-close-btn"
                onClick={handleCloseModal}
                aria-label="Close welcome tour"
              >
                <X size={17} />
              </button>
            </div>
          </div>

          <h2 className="lt-title">{current.title}</h2>
          <p className="lt-subtitle">{current.subtitle}</p>

          {/* Voice Guide Narration Bar */}
          <div className="lt-voice-bar">
            <button
              type="button"
              className={`lt-voice-play-btn ${isCurrentSlideSpeaking ? 'playing' : ''}`}
              onClick={handleToggleVoice}
            >
              {isCurrentSlideSpeaking ? <Pause size={15} /> : <Volume2 size={16} />}
              <span>
                {isCurrentSlideSpeaking
                  ? lang === 'si' ? 'හඬ නවත්වන්න (Pause)' : 'Pause Voice'
                  : lang === 'si' ? '🔊 සිංහලෙන් අහන්න (Voice Guide)' : '🔊 Listen to Voice Guide'}
              </span>
              <VoiceEqualizer active={isCurrentSlideSpeaking} />
            </button>

            <label className="lt-voice-autonext">
              <input
                type="checkbox"
                checked={autoNext}
                onChange={(e) => setAutoNext(e.target.checked)}
              />
              <span>{lang === 'si' ? 'ඊළඟ පියවරට ඉබේම යන්න (Auto-Next)' : 'Auto-advance slides'}</span>
            </label>
          </div>
        </div>

        {/* Body Content */}
        <div className="lt-body">
          {/* Visual mini-preview pill bar for Promo slide */}
          {current.previewType === 'promo' && (
            <div className="lt-preview-promo">
              <div className="lt-preview-main">
                <span className="lt-promo-code">LORA-FREE-7X9</span>
                <span className="lt-promo-meta">
                  {lang === 'si' ? '100% නොමිලේ · ළමයි 15 / 15' : '100% Free Access · 15 / 15 attempts'}
                </span>
              </div>
              <span className="lt-promo-expiry">
                {lang === 'si' ? '16 වෙනියාට Auto-Expire වේ' : 'Auto-Expires on 16th'}
              </span>
            </div>
          )}

          {/* Visual mini-preview pill bar for Security slide */}
          {current.previewType === 'security' && (
            <div className="lt-preview-security">
              <div className="lt-preview-main">
                <span className="lt-sec-badge">🔒 Copyright Sentinel Active</span>
                <span className="lt-sec-meta">
                  {lang === 'si' ? 'Zoom & Video Fingerprints සුරක්ෂිතයි' : 'Live Streams & Replays Protected'}
                </span>
              </div>
              <span className="lt-sec-pill">
                {lang === 'si' ? '1-Click Delist / Ban' : 'Instant Anti-Theft Ban'}
              </span>
            </div>
          )}

          {/* Feature Highlights List */}
          <div className="lt-highlights">
            {current.highlights.map((item, idx) => (
              <div key={idx} className="lt-highlight-card">
                <div className="lt-highlight-icon">
                  <CheckCircle2 size={16} />
                </div>
                <div>
                  <div className="lt-highlight-title">{item.title}</div>
                  <div className="lt-highlight-desc">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Controls */}
        <div className="lt-footer">
          {/* Progress Dots */}
          <div className="lt-dots-wrap">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                className={`lt-dot ${i === step ? 'active' : ''}`}
                onClick={() => handleStepChange(i)}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
            <span className="lt-step-count">
              {step + 1} / {slides.length}
            </span>
          </div>

          {/* Navigation Buttons */}
          <div className="lt-actions">
            {step > 0 ? (
              <button
                type="button"
                className="lt-btn-back"
                onClick={() => handleStepChange(step - 1)}
              >
                <ArrowLeft size={15} /> {lang === 'si' ? 'ආපසු' : 'Back'}
              </button>
            ) : (
              <button
                type="button"
                className="lt-btn-back"
                onClick={handleOpenGuide}
              >
                <BookOpen size={14} /> {lang === 'si' ? 'සම්පූර්ණ විස්තරය' : 'Full Guide'}
              </button>
            )}

            {!isLast ? (
              <button
                type="button"
                className="lt-btn-next"
                onClick={() => handleStepChange(step + 1)}
              >
                {lang === 'si' ? 'ඊළඟ' : 'Next'} <ArrowRight size={15} />
              </button>
            ) : (
              <div className="lt-actions-end">
                <button
                  type="button"
                  className="lt-btn-guide"
                  onClick={handleOpenGuide}
                >
                  <BookOpen size={15} /> {lang === 'si' ? 'Creator Guide බලන්න' : 'Open Creator Guide'}
                </button>
                <button
                  type="button"
                  className="lt-btn-done"
                  onClick={handleCloseModal}
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
