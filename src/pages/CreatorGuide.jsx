import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles, Building2, Video, Ticket, BellRing,
  CheckCircle2, ArrowRight, Play, HelpCircle, ChevronDown,
  MessageCircle, Globe
} from 'lucide-react';
import CreatorWelcomeTour from '../components/CreatorWelcomeTour';
import './creator-guide.css';

const GUIDE_CONTENT = {
  si: {
    heroBadge: 'නිල Creator මාර්ගෝපදේශය සහ විශේෂාංග',
    heroTitle: 'LoraSpace හරහා ඔයාට කළ හැකි සියලුම දේ 🚀',
    heroDesc:
      'ඔයාගේ Creator ගිණුම සකසා ගන්නා ආකාරය, බැංකු ගිණුම් 4ක් දක්වා එක් කර සිසුන්ගෙන් කෙලින්ම මුදල් ලබාගන්නා ආකාරය, Live හෝ Recorded පන්ති පැවැත්වීම සහ Promo Codes (LORA-FREE-7X9) හරහා නොමිලේ පන්ති ලබාදෙන ආකාරය සිංහලෙන්ම මෙතැනින් දැනගන්න.',
    btnTour: 'Slide Tour එක බලන්න',
    btnCreate: 'අලුත් Session Pack එකක් හදන්න',
    roadmapTitle: 'පියවර 4 කින් LoraSpace වැඩ කරන හැටි',
    roadmapSub: 'ඔයා අලුතින්ම සම්බන්ධ වුණු කෙනෙක් නම්, මුල්ම ළමයා පන්තියට බඳවා ගන්නා තෙක් මේ පියවර 4 අනුගමනය කරන්න.',
    featuresTitle: 'Creators ලා වෙනුවෙන්ම නිර්මාණය කළ විශේෂ පහසුකම්',
    featuresSub: 'ඔයාගේ Online පන්ති වඩාත් පහසුවෙන් සහ වෘත්තීය මට්ටමින් කරගෙන යාමට ඇති සියලුම Tools.',
    faqTitle: 'නිතර අසන ප්‍රශ්න (Creator FAQs)',
    faqSub: 'LoraSpace හි පන්ති පවත්වාගෙන යාමේදී මතුවන ප්‍රධාන ගැටලු සහ පිළිතුරු.',
    stepPrefix: 'පියවර',
    workflowSteps: [
      {
        step: '01',
        title: 'Profile එක සහ Bank Accounts සකසන්න',
        desc: 'Settings වෙත ගොස් ඔයාගේ විස්තර, දුරකථන අංකය සහ බැංකු ගිණුම් 4ක් දක්වා (BOC, Sampath, Commercial ආදී) ඇතුළත් කරන්න.',
        ctaText: 'Settings වෙත යන්න',
        ctaLink: '/creator/settings',
        color: '#2563eb',
        bg: '#eff6ff',
      },
      {
        step: '02',
        title: 'Session Pack (පාඨමාලාවක්) හදන්න',
        desc: 'පාඨමාලාවේ නම, Thumbnail පින්තූරය, ගාස්තුව (LKR), WhatsApp අංකය සහ ඔයාගේ Live (Zoom/YouTube) හෝ Recorded පාඩම් ඇතුළත් කරන්න.',
        ctaText: 'Pack එකක් හදන්න',
        ctaLink: '/creator/packs/new',
        color: '#7c3aed',
        bg: '#f5f3ff',
      },
      {
        step: '03',
        title: 'Course Link එක හෝ Promo Code බෙදාගන්න',
        desc: 'ඔයාගේ Course Link එක Social Media වල Share කරන්න. නැත්නම් තෝරාගත් සිසුන් පිරිසකට නොමිලේ Access දීමට Promo Code එකක් (LORA-FREE-7X9) හදන්න.',
        ctaText: 'My Packs බලන්න',
        ctaLink: '/creator/packs',
        color: '#d97706',
        bg: '#fffbeb',
      },
      {
        step: '04',
        title: 'Payment Slips අනුමත කර Recordings දාන්න',
        desc: 'Enrollments පිටුවෙන් ළමයින්ගේ Bank Slips එක Click එකකින් Approve කරන්න. Live පන්තියක් ඉවර වුණාම Dashboard එකෙන්ම Recording Link එක දාන්න.',
        ctaText: 'Enrollments බලන්න',
        ctaLink: '/creator/enrollments',
        color: '#059669',
        bg: '#ecfdf5',
      },
    ],
    featureCards: [
      {
        icon: Ticket,
        badge: 'අලුත්ම පහසුකම · නොමිලේ පන්ති',
        title: 'සීමිත සිසුන් ගණනකට දිය හැකි Promo Codes (LORA-FREE-7X9)',
        color: '#d97706',
        softBg: '#fffbeb',
        description:
          'ළමයින්ගේ Email එකින් එක ඉල්ලන්නේ නැතුව, එක් සිසුවෙකුට හෝ තෝරාගත් සිසුන් කණ්ඩායමකට (උදා: ළමයි 15 දෙනෙකුට) පමණක් 100% නොමිලේ පාඨමාලාවට සම්බන්ධ වීමට අවස්ථාව ලබාදෙන්න.',
        bullets: [
          'ඕනෑම Session Pack එකක් Edit ගොස් "Free Access Promo Codes" කොටසට යන්න.',
          '"+ Generate Code" බටන් එක ඔබන්න — එවිට LORA-FREE-7X9 වැනි Code එකක් සෑදේ.',
          'එම Code එකෙන් සම්බන්ධ විය හැකි සිසුන් ගණන (Attempts) තෝරන්න (උදා: 1 student, 15 students).',
          'සිසුන් 15 දෙනාම එම Code එක පාවිච්චි කළ පසු, 16 වෙනියාට එම Code එක ඉබේම Expire වේ.',
          'Code එක හෝ Direct Link එක (?promo=LORA-FREE-7X9) Copy කර WhatsApp හරහා සිසුන්ට යවන්න.',
        ],
        actionLabel: 'Promo Codes හදන්න (My Packs)',
        actionTo: '/creator/packs',
      },
      {
        icon: Building2,
        badge: 'සෘජු ගෙවීම් · 100% ඔයාගේ අතට',
        title: 'බැංකු ගිණුම් කිහිපයක් (Multi-Bank) සහ Reference Code ක්‍රමය',
        color: '#059669',
        softBg: '#ecfdf5',
        description:
          'සිසුන් ගෙවන පන්ති ගාස්තු කෙලින්ම බැර වන්නේ ඔයාගේම බැංකු ගිණුමට හෝ Payment Link එකටයි.',
        bullets: [
          'Settings තුළින් බැංකු ගිණුම් 4ක් දක්වා (BOC, Sampath, Commercial, HNB ආදී) ඇතුළත් කළ හැක.',
          'ඔයාගේ ප්‍රධාන ගිණුම "Primary" ලෙස ලකුණු කරන්න — සිසුන්ට මුදල් ගෙවීමේදී තමන් කැමති බැංකුව තෝරාගත හැක.',
          'මුදල් ගෙවන සෑම සිසුවෙකුටම Bank Transfer Description එකේ දැමීමට විශේෂ Reference Code එකක් ලැබේ.',
          'සිසුවා Bank Slip එක Upload කළ පසු, Enrollments පිටුවෙන් එය පරීක්ෂා කර එක Click එකකින් Approve කළ හැක.',
        ],
        actionLabel: 'Bank Accounts සකසන්න',
        actionTo: '/creator/settings',
      },
      {
        icon: Video,
        badge: 'LIVE + RECORDED පන්ති',
        title: 'Zoom, YouTube Live සහ Past Catch-Up Recordings',
        color: '#7c3aed',
        softBg: '#f5f3ff',
        description:
          'Live පන්ති පමණක් හෝ Recorded පාඩම් පමණක් නොව, මේ දෙකම එකම Session Pack එකක් තුළ පවත්වාගෙන යා හැක.',
        bullets: [
          'Live Session: ඉදිරියට පැවැත්වෙන පන්ති සඳහා Zoom Link එකක් හෝ YouTube Live (Unlisted) ලින්ක් එකක් දිනය සහ වේලාව සමඟ එක් කරන්න.',
          'Past Recording: පන්තිය ආරම්භ වූ පසු පසුව එකතු වන ළමයින්ට කලින් දවස්වල පාඩම් එවෙලේම නැරඹීමට "📼 Past Recording" ඔප්ෂන් එක තෝරන්න.',
          'ලියාපදිංචි වූ සිසුන්ට "My Sessions" හරහා පිළිවෙළකට සියලුම පාඩම් නැරඹිය හැක.',
        ],
        actionLabel: 'අලුත් Pack එකක් හදන්න',
        actionTo: '/creator/packs/new',
      },
      {
        icon: BellRing,
        badge: 'ස්වයංක්‍රීය මතක් කිරීම්',
        title: 'Missing Recording Alerts සහ සිසුන්ට Auto-Notifications',
        color: '#ea580c',
        softBg: '#fff7ed',
        description:
          'Live පන්තියක් අවසන් වූ පසු එහි Recording එක දැමීමට අමතක වීම ගැන තවදුරටත් වද විය යුතු නැත.',
        bullets: [
          'Scheduled Live පන්තියක් අවසන් වූ වහාම ඔයාගේ Dashboard එකේ "Action Required: Missing Recordings" ලෙස මතක් කිරීමක් පෙන්වයි.',
          'Google Drive, YouTube Unlisted, Vimeo හෝ Zoom Cloud Recording ලින්ක් එක එතැනම Paste කර "Save Recording" ඔබන්න.',
          'එම මොහොතේම පාඨමාලාවේ සිටින සියලුම සිසුන්ට "Recording Available! 🎥" ලෙස Notification එකක් ස්වයංක්‍රීයව යයි.',
        ],
        actionLabel: 'Dashboard වෙත යන්න',
        actionTo: '/creator/dashboard',
      },
      {
        icon: MessageCircle,
        badge: 'වැඩි සිසුන් පිරිසක් බඳවා ගැනීමට',
        title: 'WhatsApp සහ Direct Call විමසීම් බටන්',
        color: '#0284c7',
        softBg: '#f0f9ff',
        description:
          'බොහෝ සිසුන් පාඨමාලාවකට මුදල් ගෙවීමට පෙර ගුරුවරයාගෙන් විස්තරයක් අසා දැනගැනීමට කැමතියි.',
        bullets: [
          'Session Pack එකක් සාදන විට හෝ Edit කරන විට ඔයාගේ WhatsApp අංකය සහ දුරකථන අංකය ඇතුළත් කරන්න.',
          'එවිට ඔයාගේ Course පිටුවේ "Chat on WhatsApp" සහ "Call for Details" බටන් ස්වයංක්‍රීයව දිස්වේ.',
          'Computer වල මෙන්ම Mobile Phone වල පහළින්ම ඇති Purchase Bar එකේද මෙය පැහැදිලිව පෙන්වයි.',
        ],
        actionLabel: 'Packs වලට WhatsApp එක් කරන්න',
        actionTo: '/creator/packs',
      },
      {
        icon: Globe,
        badge: 'ඔයාගේ නම ප්‍රචාරණයට',
        title: 'Custom Course Links සහ Public Creator Profile',
        color: '#db2777',
        softBg: '#fdf2f8',
        description:
          'Facebook, TikTok, YouTube සහ WhatsApp හරහා පහසුවෙන් Share කළ හැකි කෙටි සහ පැහැදිලි Links සාදාගන්න.',
        bullets: [
          'Pack Editor එක තුළින් ඔයාගේ පාඨමාලාවේ Link එක කැමති ලෙස වෙනස් කරගත හැක (උදා: /p/advanced-ict-2026).',
          'ඕනෑම පාඨමාලාවක ඇති ඔයාගේ නම මත Click කළ විට, ඔයාගේ සියලුම පාඨමාලා ඇතුළත් Public Creator Profile එක සිසුන්ට බලාගත හැක.',
          'Share බටන් එක හරහා එක Click එකකින් Social Media වෙත Course Link එක බෙදාහරින්න.',
        ],
        actionLabel: 'Profile එක සකසන්න',
        actionTo: '/creator/settings',
      },
    ],
    faqs: [
      {
        q: 'Payment Slip එකක් Upload කරන්නේ නැතුව, තෝරාගත් ළමයි කිහිප දෙනෙකුට විතරක් නොමිලේ පන්තිය ලබාදෙන්නේ කොහොමද?',
        a: '"My Packs" වෙත ගොස් ඔයාගේ පාඨමාලාවේ "Edit" ඔබන්න. එහි පහළ ඇති "Free Access Promo Codes" කොටසේ "+ Generate Code" ඔබන්න. එතැනින් ඔයාට අවශ්‍ය සිසුන් ගණන (උදා: ළමයි 15) තෝරා Code එක සාදාගන්න. එම LORA-FREE-7X9 වැනි Code එක සිසුන්ට යවන්න. ළමයි 15 දෙනාම Join වූ පසු එම Code එක ඉබේම Expire වේ!',
      },
      {
        q: 'Live පන්ති 2ක් පැවැත්වුවාට පසුව අලුතින් සම්බන්ධ වන ළමයෙකුට පසුගිය පාඩම් බලන්න පුළුවන්ද?',
        a: 'ඔව්! ඔයා අවසන් වූ පන්තිවලට Recording URL එක ඇතුළත් කර ඇත්නම් (හෝ Pack Editor හි "Past Recording" ලෙස දමා ඇත්නම්), අලුතින් සම්බන්ධ වන ඕනෑම සිසුවෙකුට එම පසුගිය පාඩම් එවෙලේම නරඹා ඉදිරි Live පන්තිවලට සම්බන්ධ විය හැක.',
      },
      {
        q: 'සිසුවෙක් බැංකුවට මුදල් ගෙවා එවූ Bank Slip එක පරීක්ෂා කර Approve කරන්නේ කොහොමද?',
        a: 'සිසුවෙක් මුදල් ගෙවා Receipt / Slip එක Upload කළ විට, වම් පස මෙනුවේ ඇති "Enrollments" පිටුවට යන්න. එහි සිසුවාගේ නම, Reference Code එක, මුදල් තැන්පත් කළ බැංකුව සහ Slip එකේ ඡායාරූපය බලාගත හැක. එහි ඇති "Approve" බටන් එක එබූ සැණින් සිසුවාට පාඨමාලාව විවෘත වේ.',
      },
      {
        q: 'සිසුන්ට පහසු වෙන්න මට බැංකු ගිණුම් එකකට වඩා වැඩි ගණනක් දාන්න පුළුවන්ද?',
        a: 'අනිවාර්යයෙන්ම පුළුවන්! "Settings" → "Payout Details" වෙත ගොස් "+ Add Another Bank Account" ඔබන්න. BOC, Sampath, Commercial, HNB වැනි බැංකු ගිණුම් 4ක් දක්වා ඇතුළත් කළ හැක.',
      },
    ],
  },
  en: {
    heroBadge: 'Official Creator Guide & Feature Hub',
    heroTitle: 'Everything You Can Do on LoraSpace 🚀',
    heroDesc:
      'Learn how to set up your creator account, accept direct multi-bank student transfers, host live or recorded sessions, and grant free access using usage-limited promo codes.',
    btnTour: 'Launch Interactive Slide Tour',
    btnCreate: 'Create a Session Pack',
    roadmapTitle: 'How LoraSpace Works in 4 Simple Steps',
    roadmapSub: 'New here? Follow this roadmap from signup to your first enrolled student.',
    featuresTitle: 'Power Features Built for Creators',
    featuresSub: 'Explore every tool available in your account and how to make the most of it.',
    faqTitle: 'Frequently Asked Creator Questions',
    faqSub: 'Quick answers to common questions about running your classes on LoraSpace.',
    stepPrefix: 'STEP',
    workflowSteps: [
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
    ],
    featureCards: [
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
    ],
    faqs: [
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
        a: 'When a student pays via bank transfer or payment link, they receive a unique Reference Code and upload their payment screenshot. Go to the "Enrollments" tab in your sidebar — you will see their pending enrollment, reference code, which bank they transferred to, and their receipt image. Click "Approve" to unlock their access immediately.',
      },
      {
        q: 'Can I add more than one bank account for students to choose from?',
        a: 'Yes! Go to "Settings" → "Payout Details" and click "+ Add Another Bank Account". You can add up to 4 bank accounts (e.g. BOC, Sampath, Commercial Bank) and choose which one is Primary. Learners will see interactive bank pills at checkout so they can do a same-bank transfer.',
      },
    ],
  },
};

export default function CreatorGuide() {
  const [tourOpen, setTourOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);
  const [lang, setLang] = useState(() => localStorage.getItem('lora_guide_lang') || 'si');

  useEffect(() => {
    const saved = localStorage.getItem('lora_guide_lang');
    if (saved === 'si' || saved === 'en') setLang(saved);
  }, [tourOpen]);

  const handleLangChange = (newLang) => {
    setLang(newLang);
    localStorage.setItem('lora_guide_lang', newLang);
  };

  const t = GUIDE_CONTENT[lang] || GUIDE_CONTENT.si;

  return (
    <div className="lora-guide">
      <div className="lg-wrap">

        {/* ── Hero Banner (High-Contrast Light Glossy V2) ── */}
        <div className="lg-hero">
          <div className="lg-hero-top">
            <span className="lg-hero-badge">
              <Sparkles size={14} /> {t.heroBadge}
            </span>

            {/* 1-Click Sinhala / English Toggle */}
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
          </div>

          <h1>{t.heroTitle}</h1>
          <p>{t.heroDesc}</p>

          <div className="lg-hero-actions">
            <button
              type="button"
              className="lg-btn-pri"
              onClick={() => setTourOpen(true)}
            >
              <Play size={16} fill="#ffffff" /> {t.btnTour}
            </button>

            <Link to="/creator/packs/new" className="lg-btn-sec">
              {t.btnCreate} <ArrowRight size={16} />
            </Link>
          </div>
        </div>

        {/* ── 4-Step Creator Workflow Roadmap ── */}
        <section>
          <div className="lg-sec-head" style={{ marginBottom: 18 }}>
            <h2>{t.roadmapTitle}</h2>
            <p>{t.roadmapSub}</p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: 18,
            }}
          >
            {t.workflowSteps.map((w) => (
              <div key={w.step} className="lg-card">
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
                      fontSize: 13.5,
                      padding: '5px 12px',
                      borderRadius: 10,
                      marginBottom: 14,
                    }}
                  >
                    {t.stepPrefix} {w.step}
                  </div>
                  <h3 style={{ fontSize: 18, margin: '0 0 8px', lineHeight: 1.3 }}>
                    {w.title}
                  </h3>
                  <p style={{ margin: '0 0 18px', fontSize: 14, color: '#475569', lineHeight: 1.6 }}>
                    {w.desc}
                  </p>
                </div>

                <Link to={w.ctaLink} className="lg-step-link">
                  {w.ctaText} <ArrowRight size={15} />
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* ── All Platform Features Deep Dive ── */}
        <section>
          <div className="lg-sec-head" style={{ marginBottom: 18 }}>
            <h2>{t.featuresTitle}</h2>
            <p>{t.featuresSub}</p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
              gap: 20,
            }}
          >
            {t.featureCards.map((feat, idx) => {
              const Icon = feat.icon;
              return (
                <div key={idx} className="lg-card">
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 14 }}>
                      <div
                        style={{
                          width: 46,
                          height: 46,
                          borderRadius: 14,
                          background: feat.softBg,
                          color: feat.color,
                          display: 'grid',
                          placeItems: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Icon size={22} />
                      </div>
                      <span
                        style={{
                          fontSize: 11.5,
                          fontWeight: 800,
                          letterSpacing: '0.03em',
                          color: feat.color,
                          background: feat.softBg,
                          padding: '4px 11px',
                          borderRadius: 99,
                        }}
                      >
                        {feat.badge}
                      </span>
                    </div>

                    <h3 style={{ fontSize: 19.5, margin: '0 0 8px', lineHeight: 1.3 }}>
                      {feat.title}
                    </h3>

                    <p style={{ margin: '0 0 16px', fontSize: 14, color: '#475569', lineHeight: 1.6 }}>
                      {feat.description}
                    </p>

                    <ul style={{ margin: '0 0 20px', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {feat.bullets.map((b, bIdx) => (
                        <li
                          key={bIdx}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 9,
                            fontSize: 13.5,
                            color: '#334155',
                            lineHeight: 1.5,
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

                  <div style={{ paddingTop: 14, borderTop: '1px solid #e2e8f0' }}>
                    <Link to={feat.actionTo} className="lg-feat-btn">
                      {feat.actionLabel} <ArrowRight size={15} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Frequently Asked Questions ── */}
        <section className="lg-card" style={{ padding: 28 }}>
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
            <div className="lg-sec-head">
              <h2 style={{ fontSize: 21 }}>{t.faqTitle}</h2>
              <p style={{ fontSize: 13.5 }}>{t.faqSub}</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {t.faqs.map((item, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  style={{
                    border: '1.5px solid #e2e8f0',
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
                        lineHeight: 1.65,
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
    </div>
  );
}
