import { useState } from 'react';
import {
  Sparkles,
  Video,
  Radio,
  FileVideo,
  Gift,
  Lock,
  Eye,
  Calendar,
  Layers,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  HelpCircle,
  X,
  Zap,
  Globe2
} from 'lucide-react';
import './pack-setup-modal.css';

/**
 * PackSetupModal
 * Guided, one-question-at-a-time interactive wizard that collects the creator's
 * intent (cohort vs recording vs single masterclass, pricing & free preview strategy,
 * and delivery links) and automatically pre-configures the CreatePack form.
 */
export default function PackSetupModal({ isOpen, onClose, onApplySetup }) {
  const [lang, setLang] = useState('si'); // 'si' (Sinhala) | 'en' (English)
  const [currentQuestion, setCurrentQuestion] = useState(0);

  // Creator's selected preferences
  const [answers, setAnswers] = useState({
    format: 'cohort',       // 'cohort' (Upcoming Live series) | 'recordings' (Recorded Course) | 'webinar' (1-Day Masterclass)
    pricing: 'preview_paid', // 'preview_paid' (Paid + Free Preview) | 'direct_paid' (Direct Paid) | 'free_all' (100% Free)
    materials: 'live_zoom',  // 'live_zoom' (Live Zoom/YT stream) | 'ready_videos' (Drive/YT videos ready) | 'hybrid' (Both)
  });

  if (!isOpen) return null;

  const totalQuestions = 3;

  const selectAnswer = (key, value) => {
    setAnswers(prev => ({ ...prev, [key]: value }));
  };

  const handleNext = () => {
    if (currentQuestion < totalQuestions - 1) {
      setCurrentQuestion(q => q + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(q => q - 1);
    }
  };

  const handleComplete = () => {
    onApplySetup(answers);
    onClose();
  };

  // Content for each question in both Sinhala + English
  const questionsData = [
    // QUESTION 1: Format & Delivery Mode
    {
      stepLabel: lang === 'si' ? 'ප්‍රශ්නය 01 / 03 · පාඨමාලාවේ ස්වභාවය' : 'Question 01 of 03 · Pack Format',
      title: lang === 'si' 
        ? 'ඔයා මේ Session Pack එක පවත්වන්න බලාපොරොත්තු වෙන්නේ කොහොමද?' 
        : 'What format do you want to use for this Session Pack?',
      subtitle: lang === 'si'
        ? 'ඔයා තෝරන විකල්පය අනුව අපි Sessions පිටුව ඔයාට ගැළපෙන විදිහටම සකස් කරලා දෙනවා.'
        : 'We will automatically pre-configure your sessions and form inputs based on your choice.',
      field: 'format',
      options: [
        {
          id: 'cohort',
          icon: Radio,
          badge: lang === 'si' ? 'වඩාත් ජනප්‍රියයි (Live)' : 'Most Popular · Live',
          accent: '#2563eb',
          title: lang === 'si' ? 'ඉදිරි Live පන්ති මාලාවක් (Upcoming Live Cohort)' : 'Upcoming Live Cohort / Series',
          sinhalaDesc: 'දින වකවානු නියම කරලා, සතියකට දින 1ක් හෝ කිහිපයක් Zoom / YouTube Live හරහා සජීවීව පවත්වන පන්ති සඳහා.',
          englishDesc: 'For scheduled live workshops or multiple-day bootcamps hosted via Zoom or YouTube Live in the coming days.',
          bullets: [
            lang === 'si' ? 'දිනය, වේලාව සහ Zoom link ඇතුළත් කිරීමට සැකසේ' : 'Configures live scheduled dates and Zoom/YouTube stream links',
            lang === 'si' ? 'පන්තිය අවසන් වූ පසු Catch-up recording එක ලබාදිය හැක' : 'Allows adding catch-up recordings after each live session'
          ]
        },
        {
          id: 'recordings',
          icon: FileVideo,
          badge: lang === 'si' ? 'Recordings සූදානම්' : 'Self-Paced · On-Demand',
          accent: '#7c3aed',
          title: lang === 'si' ? 'පසුගිය හෝ පටිගත කළ පාඩම් මාලාවක් (Recorded Masterclass)' : 'Recorded Masterclass / Catch-up Course',
          sinhalaDesc: 'කලින් පවත්වපු පන්තිවල Recordings (YouTube Unlisted / Google Drive links) පමණක් සිසුන්ට අධ්‍යයනය සඳහා ලබාදීමට.',
          englishDesc: 'You already have pre-recorded lessons or previous class recordings ready to watch on-demand.',
          bullets: [
            lang === 'si' ? 'Zoom links හෝ ඉදිරි දින වෙනුවට Recording Link ක්ෂේත්‍ර පමණක් පෙන්වයි' : 'Skips Zoom/calendar requirements; only asks for your video links',
            lang === 'si' ? 'ගෙවීම් තහවුරු වූ වහාම සිසුන්ට නැරඹීමේ හැකියාව ලැබේ' : 'Learners get instant 24/7 video streaming right after enrollment'
          ]
        },
        {
          id: 'webinar',
          icon: Zap,
          badge: lang === 'si' ? 'දින 1 ක වැඩමුළු' : 'Single Session · 1-Day',
          accent: '#059669',
          title: lang === 'si' ? 'එක් දින විශේෂ Masterclass / Webinar එකක්' : 'Single 1-Day Masterclass or Webinar',
          sinhalaDesc: 'එකම දිනක පවත්වන විශේෂ වැඩමුළුවක් හෝ Intensive Training එකක් සඳහා.',
          englishDesc: 'A focused, single high-impact live session or webinar (no extra sessions clutter).',
          bullets: [
            lang === 'si' ? 'අමතර Sessions නැතිව තනි Session එකකට පිරිසිදුව සැකසේ' : 'Pre-sets exactly 1 streamlined session with full student control',
            lang === 'si' ? 'ඉක්මනින් සිසුන් ලියාපදිංචි කරවා ගැනීමට කදිමයි' : 'Best for quick registrations, crash courses, or guest talks'
          ]
        }
      ]
    },

    // QUESTION 2: Pricing Strategy & Free Preview
    {
      stepLabel: lang === 'si' ? 'ප්‍රශ්නය 02 / 03 · ගාස්තු සහ Free Preview' : 'Question 02 of 03 · Pricing & Preview Strategy',
      title: lang === 'si' 
        ? 'සිසුන් මේ පාඨමාලාවට සම්බන්ධ කරගන්නේ කොහොමද?' 
        : 'How would you like learners to enroll and pay?',
      subtitle: lang === 'si'
        ? 'නොමිලේ සාම්පලයක් (Free Preview) ලබාදීමෙන් සිසුන්ගේ විශ්වාසය දිනාගෙන Paid enrollments 3X ගුණයකින් වැඩි කරගත හැක.'
        : 'Offering a free taster increases student trust and can boost paid conversions by up to 300%.',
      field: 'pricing',
      options: [
        {
          id: 'preview_paid',
          icon: Eye,
          badge: lang === 'si' ? 'නිර්දේශිත ක්‍රමය ⭐' : 'Highly Recommended ⭐',
          accent: '#059669',
          title: lang === 'si' ? 'ගෙවන පාඨමාලාවක් + පළමු Session එක FREE (Free Preview + Paid)' : 'Paid Course with 1 Free Taster Session',
          sinhalaDesc: 'පළමු Session එකට (හෝ හැඳින්වීමේ පාඩමට) ඕනෑම අයෙකුට නොමිලේ සම්බන්ධ වෙන්න දීලා, ඉතිරි Sessions වලට මුදල් අය කිරීම.',
          englishDesc: 'Session 1 is 100% Free for anyone to try out without paying. Remaining sessions require payment.',
          bullets: [
            lang === 'si' ? 'Free Preview switch එක ස්වයංක්‍රීයවම ක්‍රියාත්මක වේ' : 'Auto-enables the Free Preview banner and 1st session setup',
            lang === 'si' ? 'සිසුන්ට පන්තියේ ගුණාත්මක බව දැකලා කැමැත්තෙන්ම ගෙවීමට අවස්ථාව ලැබේ' : 'Builds trust fast before asking for bank slip/payment'
          ]
        },
        {
          id: 'direct_paid',
          icon: Lock,
          badge: lang === 'si' ? 'සම්පූර්ණ ගෙවීම්' : 'Paid Only',
          accent: '#2563eb',
          title: lang === 'si' ? 'මුල සිටම ගෙවිය යුතු පාඨමාලාවක් (Direct Paid Only)' : 'Paid Only (No Free Previews)',
          sinhalaDesc: 'සියලුම Sessions සඳහා සිසුන් කලින්ම සම්පූර්ණ මුදල ගෙවා Bank Slip එකක් හෝ Card Payment එකක් කළ යුතුය.',
          englishDesc: 'All sessions are locked. Learners must pay the creator before accessing any session links or videos.',
          bullets: [
            lang === 'si' ? 'Free preview අංග ඉවත් කර පිරිසිදු Paid Form එකක් පෙන්වයි' : 'Cleans up the form by hiding free preview inputs completely',
            lang === 'si' ? 'ඔබට පසුව අවශ්‍ය නම් Discount Promo Code ලබාදිය හැක' : 'You can still create percentage or early-bird promo codes later'
          ]
        },
        {
          id: 'free_all',
          icon: Gift,
          badge: lang === 'si' ? '100% නොමිලේ' : '100% Free · Community',
          accent: '#d97706',
          title: lang === 'si' ? '100% ක්ම නොමිලේ ලබාදෙන වැඩමුළුවක් (100% Free Access)' : '100% Free Workshop or Community Pack',
          sinhalaDesc: 'කිසිදු මුදලක් අය නොකර සිසුන්ට 1-Click එකකින් නොමිලේ සම්බන්ධ වීමට ලබාදීමට (Audience Building / Leads).',
          englishDesc: 'Totally free for all students. Learners enroll instantly in 1-click without any payment screens.',
          bullets: [
            lang === 'si' ? 'මිල 0 (FREE) ලෙස ස්වයංක්‍රීයව සැකසේ' : 'Sets pack price to FREE automatically',
            lang === 'si' ? 'වැඩමුළුව අවසානයේ ඔබගේ මීළඟ Paid Course එක Upsell කළ හැක' : 'Great for giving value, then recommending your paid courses'
          ]
        }
      ]
    },

    // QUESTION 3: Materials & Video Readiness
    {
      stepLabel: lang === 'si' ? 'ප්‍රශ්නය 03 / 03 · Links සහ වීඩියෝ සූදානම' : 'Question 03 of 03 · Links & Video Readiness',
      title: lang === 'si' 
        ? 'ඔබ සතුව මේ වන විට ඇති Links මොනවාද?' 
        : 'What links and session details do you currently have?',
      subtitle: lang === 'si'
        ? 'ඔබට දැනට සියල්ල සූදානම් නැතත් ප්‍රශ්නයක් නැත, පසුව වුවද Edit කළ හැක.'
        : 'Do not worry if you do not have everything ready now; you can update them anytime before launch.',
      field: 'materials',
      options: [
        {
          id: 'live_zoom',
          icon: Calendar,
          badge: lang === 'si' ? 'සජීවී පන්ති' : 'Live Streams',
          accent: '#2563eb',
          title: lang === 'si' ? 'Zoom හෝ YouTube Live Links පමණක් දමන්නෙමි' : 'I will provide Zoom or YouTube Live links',
          sinhalaDesc: 'ඉදිරි දිනවල පවත්වන පන්ති වල Zoom Meetings links හෝ YouTube Live unlisted streams දමන්න.',
          englishDesc: 'Each session will have a scheduled date & time and an online meeting link for students to join live.',
          bullets: [
            lang === 'si' ? 'සෑම Session එකකම දිනය සහ වේලාව පෙන්වයි' : 'Emphasizes Scheduled Time, Duration, and Meeting URL',
            lang === 'si' ? 'සිසුන්ට පන්තියට නියමිත වේලාවට Notification සහ Links ලැබේ' : 'Learners see countdowns and Join Session buttons'
          ]
        },
        {
          id: 'ready_videos',
          icon: Video,
          badge: lang === 'si' ? 'වීඩියෝ සූදානම්' : 'Videos Ready',
          accent: '#7c3aed',
          title: lang === 'si' ? 'වීඩියෝ Recordings Links මා සතුව දැනටමත් ඇත' : 'I already have video recording links (YouTube / Drive)',
          sinhalaDesc: 'කලින් කරපු වීඩියෝ හෝ Unlisted YouTube / Vimeo / Google Drive links කෙලින්ම Sessions වලට ඇතුළත් කිරීමට.',
          englishDesc: 'Direct video playback links. Students unlock and stream these videos immediately after enrollment.',
          bullets: [
            lang === 'si' ? 'සියලුම Sessions ස්වයංක්‍රීයව "Past Recording / On-demand" බවට පත් වේ' : 'Sets sessions to "Past Recording" so no future live date is required',
            lang === 'si' ? 'සිසුන්ට ලියාපදිංචි වූ සැනින් නැරඹිය හැක' : 'Instant catch-up access for enrolled students'
          ]
        },
        {
          id: 'hybrid',
          icon: Layers,
          badge: lang === 'si' ? 'දෙකම එකතු කර' : 'Hybrid Model',
          accent: '#059669',
          title: lang === 'si' ? 'Live පන්ති සහ පසුගිය Recordings දෙකෙහිම එකතුවක් (Hybrid)' : 'Hybrid: Some past recordings + upcoming live sessions',
          sinhalaDesc: 'කලින් කරපු හැඳින්වීමේ පාඩම් වල recordings බලන්න දීලා, ඉදිරි සංකීර්ණ පාඩම් Live පවත්වන්න.',
          englishDesc: 'Combine introductory recorded lessons with upcoming interactive live masterclasses.',
          bullets: [
            lang === 'si' ? 'සෑම Session එකකටම Live හෝ Recording වෙන වෙනම තෝරාගැනීමේ හැකියාව' : 'Enables individual Live/Past toggles on each session',
            lang === 'si' ? 'වඩාත්ම විස්තීර්ණ සහ නම්‍යශීලී ක්‍රමයයි' : 'Maximum flexibility for your curriculum'
          ]
        }
      ]
    }
  ];

  const currentQ = questionsData[currentQuestion];
  const selectedValue = answers[currentQ.field];

  return (
    <div className="lora-setup-backdrop" role="dialog" aria-modal="true" aria-labelledby="setup-wizard-title">
      <div className="lora-setup-modal">
        {/* Top Header Bar */}
        <div className="setup-top-bar">
          <div className="setup-top-left">
            <span className="setup-pill-badge">
              <Sparkles size={13} className="text-amber-500 animate-pulse" />
              <span>Smart Setup Assistant</span>
            </span>
            <span className="setup-step-count">
              {currentQ.stepLabel}
            </span>
          </div>

          <div className="setup-top-right">
            {/* Language Switcher */}
            <div className="setup-lang-toggle" role="group" aria-label="Language selection">
              <button
                type="button"
                className={`setup-lang-btn ${lang === 'si' ? 'active' : ''}`}
                onClick={() => setLang('si')}
                title="සිංහල භාෂාවෙන් විස්තර බලන්න"
              >
                සිංහල
              </button>
              <button
                type="button"
                className={`setup-lang-btn ${lang === 'en' ? 'active' : ''}`}
                onClick={() => setLang('en')}
                title="View in English"
              >
                English
              </button>
            </div>

            {/* Close / Skip button */}
            <button
              type="button"
              className="setup-close-btn"
              onClick={onClose}
              title={lang === 'si' ? 'Setup එක මඟහැර කෙලින්ම Form එකට යන්න' : 'Skip setup & use blank form'}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="setup-progress-track">
          <div
            className="setup-progress-fill"
            style={{ width: `${((currentQuestion + 1) / totalQuestions) * 100}%` }}
          />
        </div>

        {/* Question Header */}
        <div className="setup-question-header">
          <h2 id="setup-wizard-title" className="setup-q-title">
            {currentQ.title}
          </h2>
          <p className="setup-q-sub">
            {currentQ.subtitle}
          </p>
        </div>

        {/* Options Grid (Vertical Cards with generous space & detail) */}
        <div className="setup-options-container">
          {currentQ.options.map((opt) => {
            const isSelected = selectedValue === opt.id;
            const IconComponent = opt.icon;

            return (
              <div
                key={opt.id}
                className={`setup-card ${isSelected ? 'selected' : ''}`}
                onClick={() => selectAnswer(currentQ.field, opt.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    selectAnswer(currentQ.field, opt.id);
                  }
                }}
              >
                {/* Radio selection indicator */}
                <div className="setup-card-radio">
                  <div className={`setup-radio-dot ${isSelected ? 'checked' : ''}`}>
                    {isSelected && <div className="setup-radio-inner" />}
                  </div>
                </div>

                {/* Card Icon */}
                <div
                  className="setup-card-icon-box"
                  style={{
                    backgroundColor: isSelected ? opt.accent : '#f1f5f9',
                    color: isSelected ? '#ffffff' : opt.accent,
                  }}
                >
                  <IconComponent size={22} />
                </div>

                {/* Main Card Content */}
                <div className="setup-card-body">
                  <div className="setup-card-head">
                    <h3 className="setup-card-title">{opt.title}</h3>
                    {opt.badge && (
                      <span
                        className="setup-card-badge"
                        style={{
                          backgroundColor: isSelected ? '#eff6ff' : '#f8fafc',
                          color: isSelected ? opt.accent : '#475569',
                          borderColor: isSelected ? '#bfdbfe' : '#e2e8f0',
                        }}
                      >
                        {opt.badge}
                      </span>
                    )}
                  </div>

                  {/* Primary Language Description */}
                  <p className="setup-card-desc-si">
                    {lang === 'si' ? opt.sinhalaDesc : opt.englishDesc}
                  </p>

                  {/* Secondary Language Translation (Subtle helper) */}
                  <p className="setup-card-desc-secondary">
                    {lang === 'si' ? opt.englishDesc : opt.sinhalaDesc}
                  </p>

                  {/* Key Benefits / Form adjustments */}
                  <div className="setup-card-bullets">
                    {opt.bullets.map((b, idx) => (
                      <div key={idx} className="setup-bullet-item">
                        <CheckCircle2 size={13} style={{ color: opt.accent, flexShrink: 0, marginTop: 2 }} />
                        <span>{b}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="setup-footer">
          <div className="setup-footer-left">
            {currentQuestion > 0 ? (
              <button
                type="button"
                className="setup-btn-back"
                onClick={handleBack}
              >
                <ArrowLeft size={16} />
                <span>{lang === 'si' ? 'කලින් ප්‍රශ්නය' : 'Back'}</span>
              </button>
            ) : (
              <button
                type="button"
                className="setup-btn-skip"
                onClick={onClose}
              >
                <span>{lang === 'si' ? 'සාමාන්‍ය විදිහට සාදන්න (Skip setup)' : 'Skip & Start with Blank Form'}</span>
              </button>
            )}
          </div>

          <div className="setup-footer-right">
            <button
              type="button"
              className="setup-btn-next"
              onClick={handleNext}
            >
              <span>
                {currentQuestion === totalQuestions - 1
                  ? (lang === 'si' ? 'පාඨමාලාව සැකසීම ආරම්භ කරන්න 🚀' : 'Apply & Start Building 🚀')
                  : (lang === 'si' ? 'ඊළඟ පියවරට' : 'Continue')}
              </span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
