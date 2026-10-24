import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles, Building2, Video, Ticket, Share2, BellRing,
  CheckCircle2, ArrowRight, Play, HelpCircle, ChevronDown,
  Layers, ShieldCheck, MessageCircle, Globe
} from 'lucide-react';
import CreatorWelcomeTour from '../components/CreatorWelcomeTour';

const WORKFLOW_STEPS = [
  {
    step: '01',
    title: 'Set Up Profile & Bank Accounts',
    desc: 'Add your creator bio, contact number, and up to 4 bank accounts (or a payment link) in Settings so learners can pay you directly.',
    ctaText: 'Go to Settings',
    ctaLink: '/creator/settings',
    color: '#2563eb',
    bg: '#eff6ff',
  },
  {
    step: '02',
    title: 'Create a Session Pack',
    desc: 'Set your course title, thumbnail, LKR/USD price, WhatsApp inquiry number, and schedule your live Zoom / YouTube Live sessions or Past Recordings.',
    ctaText: 'Create a Pack',
    ctaLink: '/creator/packs/new',
    color: '#7c3aed',
    bg: '#f5f3ff',
  },
  {
    step: '03',
    title: 'Share Link or Promo Codes',
    desc: 'Share your custom pack URL on social media, or generate a usage-limited Promo Code (e.g. LORA-FREE-7X9) inside the Pack Editor to grant free access to a specific number of students.',
    ctaText: 'View My Packs',
    ctaLink: '/creator/packs',
    color: '#d97706',
    bg: '#fffbeb',
  },
  {
    step: '04',
    title: 'Approve Slips & Upload Recordings',
    desc: 'Verify student bank transfer slips in 1 click under Enrollments. After a live session finishes, paste the recording link on your Dashboard to automatically notify all enrolled learners.',
    ctaText: 'Manage Enrollments',
    ctaLink: '/creator/enrollments',
    color: '#059669',
    bg: '#ecfdf5',
  },
];

const FEATURE_CARDS = [
  {
    icon: Ticket,
    badge: 'NEW · SCHOLARSHIPS & BATCHES',
    title: 'Usage-Limited Free Promo Codes (LORA-FREE-7X9)',
    color: '#d97706',
    softBg: '#fffbeb',
    description:
      'Want to give 100% free access to 1 special student or a private batch of 15 students without collecting their emails one by one or risking someone leaking an open link?',
    bullets: [
      'Open any saved Session Pack in Edit mode and scroll to "Free Access Promo Codes".',
      'Click "+ Generate Code" — it creates a code like LORA-FREE-7X9.',
      'Choose how many students can claim it (e.g. 1 student, 15 students, or any custom limit).',
      'Once all attempts are claimed (e.g. 15/15), the code automatically expires so the 16th person cannot use it.',
      'Copy the code or the direct 1-click claim link (?promo=LORA-FREE-7X9) to send via WhatsApp.',
    ],
    actionLabel: 'Manage Packs & Promo Codes',
    actionTo: '/creator/packs',
  },
  {
    icon: Building2,
    badge: 'DIRECT PAYOUTS',
    title: 'Multi-Bank Accounts & Reference Code Verification',
    color: '#059669',
    softBg: '#ecfdf5',
    description:
      'LoraSpace never holds your course money. Students transfer the fee directly to your bank account or payment link.',
    bullets: [
      'Add up to 4 different bank accounts (BOC, Sampath, Commercial, HNB, etc.) in Settings.',
      'Mark your preferred account as "Primary" — learners can switch between your banks using selector pills at checkout.',
      'Before paying, each learner receives a unique Reference Code to include in their bank transfer description.',
      'Students upload their transfer receipt screenshot, and you approve them in 1 click from the Enrollments page.',
    ],
    actionLabel: 'Configure Bank Accounts',
    actionTo: '/creator/settings',
  },
  {
    icon: Video,
    badge: 'HYBRID TEACHING',
    title: 'Live Zoom, YouTube Live & Catch-Up Recordings',
    color: '#7c3aed',
    softBg: '#f5f3ff',
    description:
      'Teach live classes, upload pre-recorded lessons, or combine both inside the same Session Pack.',
    bullets: [
      'Live Scheduled Session: Add your Zoom meeting link or an unlisted YouTube Live stream link with date & duration.',
      'Past Recording Mode: Toggle any session to "📼 Past Recording" when creating or editing a pack so new students can immediately watch earlier lessons.',
      'Enrolled learners get a dedicated "My Sessions" player to join live classes or watch recordings.',
    ],
    actionLabel: 'Create a Hybrid Pack',
    actionTo: '/creator/packs/new',
  },
  {
    icon: BellRing,
    badge: 'AUTOMATION',
    title: 'Missing Recording Alerts & Instant Student Notifications',
    color: '#ea580c',
    softBg: '#fff7ed',
    description:
      'Never forget to upload a class replay after a live session ends.',
    bullets: [
      'As soon as a scheduled live session finishes without a recording link, an orange "Action Required: Missing Recordings" banner appears right on your Dashboard.',
      'Simply paste the Google Drive, YouTube Unlisted, Vimeo, or Zoom Cloud link into the box and click "Save Recording".',
      'LoraSpace automatically sends an instant notification ("Recording Available! 🎥") to every confirmed student in that pack.',
    ],
    actionLabel: 'Go to Dashboard',
    actionTo: '/creator/dashboard',
  },
  {
    icon: MessageCircle,
    badge: 'HIGHER CONVERSIONS',
    title: 'WhatsApp & Direct Call Inquiry Buttons',
    color: '#0284c7',
    softBg: '#f0f9ff',
    description:
      'Many learners want to ask a quick question about the syllabus or schedule before they enroll.',
    bullets: [
      'When creating or editing a Session Pack, add your WhatsApp number and/or Contact Phone number.',
      'Your course page will automatically display a "Chat on WhatsApp" button (with a pre-filled message containing your pack name) and a "Call for Details" button.',
      'Works seamlessly on both desktop sidebars and the mobile sticky purchase bar.',
    ],
    actionLabel: 'Edit Your Packs',
    actionTo: '/creator/packs',
  },
  {
    icon: Globe,
    badge: 'BRANDING & SHARING',
    title: 'Custom Pack URLs & Public Creator Profile',
    color: '#db2777',
    softBg: '#fdf2f8',
    description:
      'Build your personal teaching brand with clean links that look great on Instagram, TikTok, YouTube, and WhatsApp.',
    bullets: [
      'Customize your course link slug inside the Pack Editor (e.g. /p/advanced-python-bootcamp).',
      'Students can also click your name on any course to view your Public Creator Profile and see all your published packs.',
      'Use the built-in Share menu on any pack to copy links or share directly to social platforms.',
    ],
    actionLabel: 'Customize Profile',
    actionTo: '/creator/settings',
  },
];

const FAQS = [
  {
    q: 'How do I give free access to a group of students without them uploading a payment slip?',
    a: 'Go to "My Packs", click "Edit" on your pack, and scroll to the "Free Access Promo Codes" card. Click "+ Generate Code", set the usage limit (for example, 15 students), and click Create. Send that code (e.g. LORA-FREE-7X9) or the direct promo link to your students. When they apply it, the price becomes FREE and they enroll in 1 click! Once 15 students claim it, the code expires automatically.',
  },
  {
    q: 'What happens if a student joins my course after the first 2 live sessions are already finished?',
    a: 'As long as you have added the recording URLs for those completed sessions (or marked them as "Past Recording" in the Pack Editor), any newly enrolled student can immediately watch those recordings to catch up, and then join your upcoming live sessions!',
  },
  {
    q: 'How do I verify a student’s bank transfer payment?',
    a: 'When a student pays via bank transfer or payment link, they receive a unique Reference Code and upload their payment screenshot. Go to the "Enrollments" tab in your sidebar — you will see their pending enrollment, reference code, Which Bank they transferred to, and their receipt image. Click "Approve" to unlock their access immediately.',
  },
  {
    q: 'Can I add more than one bank account for students to choose from?',
    a: 'Yes! Go to "Settings" → "Payout Details" and click "+ Add Another Bank Account". You can add up to 4 bank accounts (e.g. BOC, Sampath, Commercial Bank) and choose which one is Primary. Learners will see interactive bank pills at checkout so they can do a same-bank transfer.',
  },
];

export default function CreatorGuide() {
  const [tourOpen, setTourOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);

  return (
    <div
      style={{
        fontFamily: "'Figtree', system-ui, sans-serif",
        color: '#0e1733',
        maxWidth: 1180,
        padding: '28px 0 64px',
        display: 'flex',
        flexDirection: 'column',
        gap: 32,
      }}
    >
      {/* ── Hero Banner ── */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0e1733 0%, #1e3a8a 60%, #2563eb 100%)',
          borderRadius: 26,
          padding: 'clamp(28px, 4vw, 42px)',
          color: '#ffffff',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 20px 50px -20px rgba(14, 23, 51, 0.35)',
        }}
      >
        <div style={{ maxWidth: 680, position: 'relative', zIndex: 1 }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              background: 'rgba(255, 255, 255, 0.14)',
              border: '1px solid rgba(255, 255, 255, 0.22)',
              padding: '6px 14px',
              borderRadius: 99,
              fontSize: 12.5,
              fontWeight: 700,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              marginBottom: 16,
            }}
          >
            <Sparkles size={14} /> Official Creator Guide & Feature Hub
          </span>

          <h1
            style={{
              fontFamily: "'Bricolage Grotesque', sans-serif",
              fontSize: 'clamp(28px, 4vw, 40px)',
              fontWeight: 800,
              margin: '0 0 12px',
              lineHeight: 1.15,
              letterSpacing: '-0.02em',
            }}
          >
            Everything You Can Do on LoraSpace
          </h1>

          <p
            style={{
              margin: '0 0 24px',
              fontSize: 16,
              color: 'rgba(255, 255, 255, 0.85)',
              lineHeight: 1.6,
            }}
          >
            Learn how to set up your creator account, accept direct multi-bank student transfers, host live or recorded sessions, and grant free access using usage-limited promo codes.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <button
              type="button"
              onClick={() => setTourOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: '#ffffff',
                color: '#0e1733',
                border: 0,
                borderRadius: 13,
                padding: '12px 22px',
                fontWeight: 700,
                fontSize: 14.5,
                cursor: 'pointer',
                boxShadow: '0 8px 20px rgba(0,0,0,0.18)',
              }}
            >
              <Play size={16} fill="#0e1733" /> Launch Interactive Slide Tour
            </button>

            <Link
              to="/creator/packs/new"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: 'rgba(255, 255, 255, 0.14)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.28)',
                borderRadius: 13,
                padding: '12px 22px',
                fontWeight: 700,
                fontSize: 14.5,
                textDecoration: 'none',
              }}
            >
              Create a Session Pack <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>

      {/* ── 4-Step Creator Workflow Roadmap ── */}
      <section>
        <div style={{ marginBottom: 18 }}>
          <h2
            style={{
              fontFamily: "'Bricolage Grotesque', sans-serif",
              fontSize: 24,
              fontWeight: 800,
              margin: '0 0 4px',
            }}
          >
            How LoraSpace Works in 4 Simple Steps
          </h2>
          <p style={{ margin: 0, color: '#68728d', fontSize: 14.5 }}>
            New here? Follow this roadmap from signup to your first enrolled student.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: 18,
          }}
        >
          {WORKFLOW_STEPS.map((w) => (
            <div
              key={w.step}
              style={{
                background: '#ffffff',
                border: '1px solid #e3e7f1',
                borderRadius: 22,
                padding: '22px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 1px 2px rgba(14,23,51,.04), 0 10px 28px -16px rgba(14,23,51,.12)',
              }}
            >
              <div>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: w.bg,
                    color: w.color,
                    fontFamily: "'Bricolage Grotesque', sans-serif",
                    fontWeight: 800,
                    fontSize: 14,
                    padding: '5px 12px',
                    borderRadius: 10,
                    marginBottom: 14,
                  }}
                >
                  STEP {w.step}
                </div>
                <h3
                  style={{
                    fontFamily: "'Bricolage Grotesque', sans-serif",
                    fontSize: 18.5,
                    fontWeight: 700,
                    margin: '0 0 8px',
                    color: '#0e1733',
                  }}
                >
                  {w.title}
                </h3>
                <p style={{ margin: '0 0 18px', fontSize: 14, color: '#68728d', lineHeight: 1.55 }}>
                  {w.desc}
                </p>
              </div>

              <Link
                to={w.ctaLink}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  color: w.color,
                  fontWeight: 700,
                  fontSize: 14,
                  textDecoration: 'none',
                }}
              >
                {w.ctaText} <ArrowRight size={15} />
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ── All Platform Features Deep Dive ── */}
      <section>
        <div style={{ marginBottom: 18 }}>
          <h2
            style={{
              fontFamily: "'Bricolage Grotesque', sans-serif",
              fontSize: 24,
              fontWeight: 800,
              margin: '0 0 4px',
            }}
          >
            Power Features Built for Creators
          </h2>
          <p style={{ margin: 0, color: '#68728d', fontSize: 14.5 }}>
            Explore every tool available in your account and how to make the most of it.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: 20,
          }}
        >
          {FEATURE_CARDS.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div
                key={idx}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e3e7f1',
                  borderRadius: 22,
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 1px 2px rgba(14,23,51,.04), 0 10px 28px -16px rgba(14,23,51,.12)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <div
                      style={{
                        width: 46,
                        height: 46,
                        borderRadius: 14,
                        background: feat.softBg,
                        color: feat.color,
                        display: 'grid',
                        placeItems: 'center',
                      }}
                    >
                      <Icon size={22} />
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        letterSpacing: '0.05em',
                        color: feat.color,
                        background: feat.softBg,
                        padding: '4px 10px',
                        borderRadius: 99,
                      }}
                    >
                      {feat.badge}
                    </span>
                  </div>

                  <h3
                    style={{
                      fontFamily: "'Bricolage Grotesque', sans-serif",
                      fontSize: 20,
                      fontWeight: 800,
                      margin: '0 0 8px',
                      color: '#0e1733',
                    }}
                  >
                    {feat.title}
                  </h3>

                  <p style={{ margin: '0 0 16px', fontSize: 14, color: '#5b647d', lineHeight: 1.55 }}>
                    {feat.description}
                  </p>

                  <ul style={{ margin: '0 0 20px', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 9 }}>
                    {feat.bullets.map((b, bIdx) => (
                      <li
                        key={bIdx}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 9,
                          fontSize: 13.5,
                          color: '#334155',
                          lineHeight: 1.45,
                        }}
                      >
                        <CheckCircle2
                          size={16}
                          style={{ color: feat.color, flexShrink: 0, marginTop: 2 }}
                        />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div style={{ paddingTop: 14, borderTop: '1px solid #f1f5f9' }}>
                  <Link
                    to={feat.actionTo}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 7,
                      background: feat.softBg,
                      color: feat.color,
                      padding: '9px 16px',
                      borderRadius: 11,
                      fontWeight: 700,
                      fontSize: 13.5,
                      textDecoration: 'none',
                    }}
                  >
                    {feat.actionLabel} <ArrowRight size={15} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Frequently Asked Questions ── */}
      <section
        style={{
          background: '#ffffff',
          border: '1px solid #e3e7f1',
          borderRadius: 24,
          padding: '28px',
          boxShadow: '0 1px 2px rgba(14,23,51,.04), 0 10px 28px -16px rgba(14,23,51,.12)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: '#eff6ff',
              color: '#2563eb',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <HelpCircle size={22} />
          </div>
          <div>
            <h2
              style={{
                fontFamily: "'Bricolage Grotesque', sans-serif",
                fontSize: 21,
                fontWeight: 800,
                margin: 0,
              }}
            >
              Frequently Asked Creator Questions
            </h2>
            <p style={{ margin: 0, fontSize: 13.5, color: '#68728d' }}>
              Quick answers to common questions about running your classes on LoraSpace.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {FAQS.map((item, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: 16,
                  overflow: 'hidden',
                  background: isOpen ? '#f8fafc' : '#ffffff',
                }}
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? -1 : idx)}
                  style={{
                    width: '100%',
                    padding: '16px 20px',
                    background: 'transparent',
                    border: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    textAlign: 'left',
                    fontWeight: 700,
                    fontSize: 15,
                    color: '#0e1733',
                    cursor: 'pointer',
                  }}
                >
                  <span>{item.q}</span>
                  <ChevronDown
                    size={18}
                    style={{
                      color: '#64748b',
                      flexShrink: 0,
                      transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease',
                    }}
                  />
                </button>
                {isOpen && (
                  <div
                    style={{
                      padding: '0 20px 18px',
                      fontSize: 14,
                      color: '#475569',
                      lineHeight: 1.6,
                    }}
                  >
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <CreatorWelcomeTour isOpen={tourOpen} onClose={() => setTourOpen(false)} />
    </div>
  );
}
