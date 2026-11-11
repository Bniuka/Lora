// ============================================================================
// LORASPACE — SINHALA & ENGLISH AI VOICE GUIDE ENGINE
// Pre-bundled Neural Audio (/audio/voice-guide/*.mp3) + Web Speech API Fallback
// ============================================================================
import { useSyncExternalStore } from 'react';

export const TOUR_VOICE_CLIPS = {
  si: [
    {
      clipId: 'tour_si_0',
      text: 'ආයුබෝවන්! ලෝරා ස්පේස් වෙත ඔයාව සාදරයෙන් පිළිගන්නවා. මේ වෙබ් අඩවියෙන් ඔයාගේම ඔන්ලයින් පන්ති, සූම් ලයිව් පන්ති සහ රෙකෝඩින් පාඩම් පිළිවෙළකට එකම තැනකින් පවත්වාගෙන යන්න පුළුවන්. වැදගත්ම දේ තමයි, ළමයි ගෙවන පන්ති ගාස්තු සියයට සියයක්ම කිසිම අතරමැදි ගාස්තුවක් නැතුව කෙලින්ම ඔයාගේ බැංකු ගිණුමටම ලැබෙනවා.',
    },
    {
      clipId: 'tour_si_1',
      text: 'පළවෙනි පියවර තමයි මුදල් ලබාගන්න ඔයාගේ බැංකු ගිණුම ඇතුළත් කරන එක. සෙටින්ග්ස් පිටුවට ගිහින් ලංකාවේ ඕනෑම බැංකුවක ගිණුම් හතරක් දක්වා ඇතුළත් කරන්න පුළුවන්. ළමයෙක් පන්තියට බැඳෙද්දී එයාට විශේෂ රෙෆරන්ස් අංකයක් ලැබෙනවා. ළමයා බෑන්ක් ස්ලිප් එක අප්ලෝඩ් කළාම, ඔයාට එක ක්ලික් එකකින් ඒක අනුමත කරලා පන්තියට ඇතුළත් කරගන්න පුළුවන්.',
    },
    {
      clipId: 'tour_si_2',
      text: 'දෙවෙනි පියවර තමයි ඔයාගේ පන්ති සහ පාඩම් ඇතුළත් කරන එක. ක්‍රියේට් පැක් බටන් එක ඔබලා, ඉදිරියට පැවැත්වෙන සූම් හෝ යූටියුබ් ලයිව් පන්ති වගේම පසුගිය පාඩම්වල රෙකෝඩින් ලින්ක් එකම පාඨමාලාවකට එකතු කරන්න පුළුවන්. ලයිව් පන්තියක් ඉවර වුණාම රෙකෝඩින් ලින්ක් එක දාපු ගමන් පන්තියේ හැම ළමයෙකුටම ඔටෝ නොටිෆිකේෂන් එකක් යනවා.',
    },
    {
      clipId: 'tour_si_3',
      text: 'තුන්වෙනි පියවර තමයි නොමිලේ පන්ති ලබාදෙන ප්‍රොමෝ කෝඩ් පහසුකම. ඔයාට කැමති ළමයි ගණනකට විතරක් සියයට සියයක් නොමිලේ පන්තියට එන්න ප්‍රොමෝ කෝඩ් එකක් එක ක්ලික් එකකින් හදාගන්න පුළුවන්. උදාහරණයක් විදිහට ළමයි පහළොස් දෙනෙකුට සීමා කළොත්, පහළොස් දෙනාම ආවට පස්සේ දහසය වෙනියාට ඒ කෝඩ් එක ඉබේම අවලංගු වෙනවා.',
    },
    {
      clipId: 'tour_si_4',
      text: 'හතරවෙනි පියවර තමයි පාඨමාලාව ළමයි අතරට ගෙනියන එක. ඔයාගේ පාඨමාලා පිටුවට වට්ස්ඇප් සහ ෆෝන් කෝල් බටන් එකතු කරන්න පුළුවන් නිසා, ළමයින්ට පන්තියට බැඳෙන්න කලින් ඔයාගෙන් විස්තර අහගන්න පුළුවන්. ඒ වගේම ඔයාගේ පාඨමාලා ලින්ක් එක කොපි කරලා වට්ස්ඇප්, ෆේස්බුක් හෝ ටික්ටොක් වල පහසුවෙන් ශෙයා කරන්න පුළුවන්.',
    },
    {
      clipId: 'tour_si_5',
      text: 'පස්වෙනි පියවර තමයි ඔයාගේ වීඩියෝ පාඩම්වල ආරක්ෂාව. ලෝරා ස්පේස් හි කොපිරයිට් සෙන්ටිනල් ආරක්ෂාව නිසා, වීඩියෝ බලන ළමයාගේ විස්තර තිරය මත රහසිගතව සටහන් වෙනවා. කවුරුහරි ඔයාගේ පාඩම් අනවසරයෙන් පිටතට දුන්නොත්, එක ක්ලික් එකකින් ඒ ළමයාව පන්තියෙන් ඉවත් කරන්න ඔයාට පුළුවන්.',
    },
  ],
  en: [
    {
      clipId: 'tour_en_0',
      text: 'Welcome to LoraSpace! Here is a quick voice guide on how everything works. You can host your live Zoom or YouTube classes and recorded lessons together inside structured Session Packs. Best of all, you keep 100% of your student payments directly in your own bank account with zero platform commission.',
    },
    {
      clipId: 'tour_en_1',
      text: 'Step one is setting up how you get paid. Go to Settings and add up to four Sri Lankan bank accounts or a direct payment link. Each student receives a unique Lora reference code when uploading their bank slip, and you can approve their access in one click.',
    },
    {
      clipId: 'tour_en_2',
      text: 'Step two is creating your classes and session packs. Click Create Pack to combine upcoming live Zoom or YouTube sessions with past catch-up recordings. Whenever you paste a recording link after a live class, all enrolled students are notified automatically.',
    },
    {
      clipId: 'tour_en_3',
      text: 'Step three is generating free access promo codes. You can create a promo code limited to a specific number of students, such as 15 seats. Students redeem the code to join instantly without uploading a bank slip, and the code expires automatically once the limit is reached.',
    },
    {
      clipId: 'tour_en_4',
      text: 'Step four is sharing your course and supporting learners. Add your WhatsApp and direct call buttons so prospective students can message you before enrolling. Then copy your custom course link and share it on WhatsApp, Facebook, Instagram, or TikTok.',
    },
    {
      clipId: 'tour_en_5',
      text: 'Step five is protecting your content with Copyright Sentinel. Every video playback displays dynamic student watermarks and blocks unauthorized downloading. If any student leaks your class link, you can revoke their access in a single click.',
    },
  ],
};

export const PAGE_VOICE_GUIDES = {
  dashboard: {
    si: {
      clipId: 'page_si_dashboard',
      title: 'ප්‍රධාන ඩෑෂ්බෝඩ් එක (Creator Dashboard)',
      text: 'මේ තියෙන්නේ ඔයාගේ ප්‍රධාන ඩෑෂ්බෝඩ් එක. මෙතනින් ඔයාගේ මුළු ආදායම, සිසුන් ගණන, අනුමත කරන්න තියෙන බෑන්ක් ස්ලිප් සහ අලුත් පාඨමාලා හදන බටන් ඔක්කොම එක තැනකින් බලාගන්න පුළුවන්.',
    },
    en: {
      clipId: 'page_en_dashboard',
      title: 'Creator Dashboard Overview',
      text: 'This is your Creator Dashboard. From here you can track total revenue, active students, pending bank slips, and launch new Session Packs or Multi-Packs.',
    },
  },
  packs: {
    si: {
      clipId: 'page_si_packs',
      title: 'පාඨමාලා සහ පන්ති සැකසීම (Session Packs)',
      text: 'මේ පිටුවෙන් ඔයාගේ පාඨමාලා හෙවත් සෙෂන් පැක්ස් හදන්න සහ වෙනස් කරන්න පුළුවන්. පන්තියේ නම, මිල, සූම් ලින්ක් සහ නොමිලේ දෙන ප්‍රොමෝ කෝඩ් මෙතනින් පහසුවෙන්ම සකසන්න පුළුවන්.',
    },
    en: {
      clipId: 'page_en_packs',
      title: 'Session Packs & Courses',
      text: 'On this page you can create and manage your Session Packs and Multi-Packs. Add your course title, pricing, Zoom or YouTube links, and generate free student promo codes.',
    },
  },
  enrollments: {
    si: {
      clipId: 'page_si_enrollments',
      title: 'සිසුන් සහ බෑන්ක් ස්ලිප් අනුමත කිරීම (Enrollments)',
      text: 'මේ තියෙන්නේ එන්රෝල්මන්ට්ස් පිටුව. ළමයි එවපු බෑන්ක් ස්ලිප් පරීක්ෂා කරලා එක ක්ලික් එකකින් අනුමත කරන්නේ මෙතනින්. ඕඩිට් රිපෝට්ස් බටන් එක ඔබලා බැංකු ප්‍රකාශනයත් එක්ක ස්ලිප් ස්වයංක්‍රීයව සසඳා බලන්නත් පුළුවන්.',
    },
    en: {
      clipId: 'page_en_enrollments',
      title: 'Student Enrollments & Slip Approval',
      text: 'This is the Enrollments page where you review student bank slips and approve access with one click. You can also open Audit Reports from here to automatically reconcile slips against your bank statement.',
    },
  },
  reports: {
    si: {
      clipId: 'page_si_reports',
      title: 'බැංකු ප්‍රකාශන සහ ඕඩිට් පරීක්ෂාව (Audit Reports)',
      text: 'මේ තියෙන්නේ ඕඩිට් රිපෝට්ස් සහ බෑන්ක් ස්ලිප් රිකන්සිලියේෂන් පිටුව. ඔයාගේ බැංකු ප්‍රකාශනය හෝ ස්ලිප් රූපයක් මෙතනට අප්ලෝඩ් කළාම, හැම ගෙවීමක්ම ඇත්තටම බැංකුවට ලැබිලද කියලා ස්වයංක්‍රීයව පරීක්ෂා කරගන්න පුළුවන්.',
    },
    en: {
      clipId: 'page_en_reports',
      title: 'Audit Reports & Bank Reconciliation',
      text: 'This is the Creator Intelligence and Bank Slip Reconciliation page. Upload your bank statement CSV, PDF, or slip image here to automatically match reference codes and amounts against student enrollments.',
    },
  },
  settings: {
    si: {
      clipId: 'page_si_settings',
      title: 'ගිණුම් සහ බැංකු විස්තර (Settings)',
      text: 'මේ තියෙන්නේ සෙටින්ග්ස් පිටුව. මෙතනින් ඔයාගේ නම, විස්තරය, වට්ස්ඇප් අංකය සහ මුදල් ලබාගන්න බැංකු ගිණුම් හතරක් දක්වා ඇතුළත් කරලා සේව් කරන්න පුළුවන්.',
    },
    en: {
      clipId: 'page_en_settings',
      title: 'Creator Profile & Bank Settings',
      text: 'This is your Settings page. Add your profile bio, WhatsApp number, and up to four bank accounts so students can pay you directly.',
    },
  },
};

export function getPageVoiceGuide(pathname = '', lang = 'si') {
  const l = lang === 'en' ? 'en' : 'si';
  if (pathname.includes('/enrollments')) return PAGE_VOICE_GUIDES.enrollments[l];
  if (pathname.includes('/reports')) return PAGE_VOICE_GUIDES.reports[l];
  if (pathname.includes('/settings')) return PAGE_VOICE_GUIDES.settings[l];
  if (pathname.includes('/packs') || pathname.includes('/multi-packs')) return PAGE_VOICE_GUIDES.packs[l];
  return PAGE_VOICE_GUIDES.dashboard[l];
}

/**
 * Builds a prioritized, context-aware list of missing setup items & operational actions
 * with natural Sinhala & English voice narration clips.
 */
export function buildCreatorDiagnosis(state = {}, lang = 'si') {
  const isSi = lang !== 'en';
  const {
    hasProfile = false,
    hasBank = false,
    packsCount = 0,
    hasSessions = true,
    hasPublishedPack = false,
    pendingSlipsCount = 0,
    missingRecordingsCount = 0,
    latestPackId = null,
  } = state;

  const welcomeIntro = isSi
    ? {
        clipId: 'diag_si_welcome_smart',
        text: 'ආයුබෝවන්! මම ඔයාගේ ලෝරා ස්පේස් හඬ සහායකයා. මේ වෙබ් අඩවියේ වැඩ පටන් ගන්න හරිම ලේසියි. මුලින්ම බැංකු ගිණුම දාන්න, ඊළඟට පන්තිය හදන්න, ඊට පස්සේ ළමයින්ට ලින්ක් එක යවන්න. දැන් මම ඔයාගේ ගිණුමේ තවම සම්පූර්ණ කරලා නැති අඩුපාඩු එකින් එක කියන්නම්.',
      }
    : {
        clipId: 'diag_en_welcome_smart',
        text: 'Hello! I am your LoraSpace voice guide. Getting started is simple: first add your bank account, second create a session pack, and third share your link with students. Let me check your account right now and tell you what is missing.',
      };

  const items = [
    {
      id: 'bank',
      done: Boolean(hasBank),
      priority: 1,
      severity: 'critical',
      clipId: isSi ? 'diag_si_missing_bank' : 'diag_en_missing_bank',
      stepBadge: isSi ? 'පියවර 1 · මුදල් ලබාගැනීම' : 'Step 1 · Payouts',
      title: isSi ? 'බැංකු ගිණුම ඇතුළත් කරන්න (Bank Account)' : 'Add Bank Account or Payment Link',
      shortDesc: isSi
        ? 'ළමයින්ට පන්ති ගාස්තු ගෙවලා බෑන්ක් ස්ලිප් එවන්න ඔයාගේ බැංකු ගිණුම අත්‍යවශ්‍යයි.'
        : 'Required so students can deposit class fees and upload bank slips.',
      voiceText: isSi
        ? 'වැදගත්ම අඩුපාඩුවක් තියෙනවා: ඔයා තවම බැංකු ගිණුම් විස්තර හෝ පේමන්ට් ලින්ක් එකක් ඇතුළත් කරලා නැහැ. බැංකු ගිණුමක් නැතුව ළමයින්ට මුදල් ගෙවලා බෑන්ක් ස්ලිප් එක එවන්න බැහැ. ඒ නිසා දැන්ම සෙටින්ග්ස් වලට ගිහින් ඔයාගේ බැංකු ගිණුම ඇතුළත් කරන්න.'
        : 'Important missing step: you have not added a bank account or payment link yet. Without bank details, students cannot pay you or upload bank slips. Open Settings now to add your bank account.',
      ctaLabel: isSi ? 'බැංකු විස්තර දාන්න' : 'Add Bank Account',
      doneLabel: isSi ? 'බැංකු ගිණුම සකසා ඇත ✓' : 'Bank Account Ready ✓',
      to: '/creator/settings',
    },
    {
      id: 'profile',
      done: Boolean(hasProfile),
      priority: 2,
      severity: 'warning',
      clipId: isSi ? 'diag_si_missing_profile' : 'diag_en_missing_profile',
      stepBadge: isSi ? 'පියවර 2 · ඔයාගේ විස්තර' : 'Step 2 · Creator Bio',
      title: isSi ? 'ඔයාගේ විස්තර සහ WhatsApp අංකය' : 'Complete Profile & WhatsApp Number',
      shortDesc: isSi
        ? 'පන්තියට බැඳෙන්න කලින් ළමයින්ට ඔයාගෙන් විස්තර අහගන්න WhatsApp අංකය සහ Bio එක දාන්න.'
        : 'Add your bio and WhatsApp number so students trust your profile and can message you.',
      voiceText: isSi
        ? 'ඔයාගේ ගිණුමේ පළවෙනි අඩුපාඩුව: ඔයාගේ විස්තර සහ වට්ස්ඇප් දුරකථන අංකය තවම සම්පූර්ණ කරලා නැහැ. සෙටින්ග්ස් පිටුවට ගිහින් ඔයා ගැන කෙටි විස්තරයක් සහ වට්ස්ඇප් අංකය ඇතුළත් කරන්න. එතකොට ළමයින්ට ඔයා ගැන විශ්වාසයක් ඇතිවෙලා කෙලින්ම කතා කරන්න පුළුවන්.'
        : 'Missing item: your creator bio and WhatsApp contact number are not completed yet. Go to Settings and add your bio and phone number so students know who you are and can contact you easily.',
      ctaLabel: isSi ? 'විස්තර සම්පූර්ණ කරන්න' : 'Complete Profile',
      doneLabel: isSi ? 'විස්තර සම්පූර්ණයි ✓' : 'Profile Completed ✓',
      to: '/creator/settings',
    },
    {
      id: 'pack',
      done: packsCount > 0,
      priority: 3,
      severity: 'critical',
      clipId: isSi ? 'diag_si_missing_pack' : 'diag_en_missing_pack',
      stepBadge: isSi ? 'පියවර 3 · පළවෙනි පන්තිය' : 'Step 3 · First Course',
      title: isSi ? 'පළවෙනි පාඨමාලාව හදන්න (Create Session Pack)' : 'Create Your First Session Pack',
      shortDesc: isSi
        ? 'Zoom / YouTube Live පන්ති හෝ Recorded පාඩම් එකතු කරලා ඔයාගේ පළවෙනි Course Pack එක හදන්න.'
        : 'Create a Session Pack with your course price, Zoom links, or recorded lessons.',
      voiceText: isSi
        ? 'ඊළඟට කරන්න තියෙන්නේ ඔයාගේ පළවෙනි පාඨමාලාව හෙවත් සෙෂන් පැක් එක හදන එක. තවම ඔයා එක පන්තියක්වත් හදලා නැහැ. ක්‍රියේට් පැක් බටන් එක ඔබලා පන්තියේ නම, ගාස්තුව සහ පාඩම් විස්තර දාලා පළවෙනි පැක් එක හදමු.'
        : 'Next step: you have not created your first Session Pack yet. Click Create Pack to set your course title, price, and add live Zoom classes or recorded lessons.',
      ctaLabel: isSi ? 'පළවෙනි Pack එක හදන්න' : 'Create First Pack',
      doneLabel: isSi ? 'පාඨමාලා සකසා ඇත ✓' : 'Pack Created ✓',
      to: '/creator/packs/new',
    },
    {
      id: 'publish',
      done: packsCount > 0 && Boolean(hasPublishedPack),
      priority: 4,
      severity: 'info',
      clipId: isSi ? 'diag_si_missing_publish' : 'diag_en_missing_publish',
      stepBadge: isSi ? 'පියවර 4 · ප්‍රචාරණය සහ Promo Codes' : 'Step 4 · Publish & Share',
      title: isSi ? 'පන්තිය Publish කර ලින්ක් එක ළමයින්ට යවන්න' : 'Publish Course & Share Link / Promo Code',
      shortDesc: isSi
        ? 'ඔයාගේ Course Link එක WhatsApp වල Share කරන්න හෝ LORA-FREE Promo Code එකක් හදන්න.'
        : 'Publish your course to get a shareable link or generate a free student promo code.',
      voiceText: isSi
        ? 'ඔයාගේ පාඨමාලාව තවම පබ්ලිෂ් කරලා ළමයි අතරේ ශෙයා කරලා නැහැ. පැක් එක පබ්ලිෂ් කරලා, ඒකේ ලින්ක් එක වට්ස්ඇප් හෝ ෆේස්බුක් වල දාන්න. අවශ්‍ය නම් නොමිලේ පන්ති දෙන්න ප්‍රොමෝ කෝඩ් එකකුත් හදාගන්න පුළුවන්.'
        : 'Your course is not published yet. Publish your pack so students can enroll, and generate a free promo code if you want to invite students for free.',
      ctaLabel: isSi ? 'Publish / Promo Codes' : 'Publish & Promo Codes',
      doneLabel: isSi ? 'පන්තිය Publish කර ඇත ✓' : 'Published & Live ✓',
      to: latestPackId ? `/creator/packs/${latestPackId}/edit` : '/creator/packs',
    },
  ];

  // Dynamic operational alerts when applicable
  if (packsCount > 0 && !hasSessions) {
    items.splice(3, 0, {
      id: 'sessions',
      done: false,
      priority: 3.5,
      severity: 'warning',
      clipId: isSi ? 'diag_si_missing_sessions' : 'diag_en_missing_sessions',
      stepBadge: isSi ? 'අඩුපාඩුවක් · පාඩම් ලින්ක්' : 'Missing · Class Sessions',
      title: isSi ? 'පාඨමාලාවට Zoom හෝ Recording පාඩම් එකතු කරන්න' : 'Add Live or Recorded Sessions to Your Pack',
      shortDesc: isSi
        ? 'ඔයා හදපු Pack එක ඇතුළේ තවම පන්ති හෝ වීඩියෝ ලින්ක් එකතු කරලා නැහැ.'
        : 'Your pack currently has 0 sessions inside. Add Zoom or video links for students.',
      voiceText: isSi
        ? 'ඔයා පාඨමාලා ගොනුවක් හදලා තිබුණත්, ඒක ඇතුළට තවම සූම් ලයිව් පන්ති හෝ රෙකෝඩින් පාඩම් එකතු කරලා නැහැ. ඔයාගේ පැක් එක එඩිට් කරලා පන්ති පැවැත්වෙන දිනයන් සහ ලින්ක් එකතු කරන්න.'
        : 'You created a pack, but it does not have any live or recorded sessions inside yet. Open your pack and add at least one scheduled class or past recording link.',
      ctaLabel: isSi ? 'පාඩම් එකතු කරන්න' : 'Add Sessions',
      doneLabel: isSi ? 'පාඩම් ඇතුළත් කර ඇත ✓' : 'Sessions Added ✓',
      to: latestPackId ? `/creator/packs/${latestPackId}/edit` : '/creator/packs',
    });
  }

  if (pendingSlipsCount > 0) {
    items.unshift({
      id: 'pending_slips',
      done: false,
      priority: 0.5,
      severity: 'critical',
      clipId: isSi ? 'diag_si_pending_slips' : 'diag_en_pending_slips',
      stepBadge: isSi ? `හදිසි · බෑන්ක් ස්ලිප් ${pendingSlipsCount}ක්` : `Action Needed · ${pendingSlipsCount} Pending Slip${pendingSlipsCount > 1 ? 's' : ''}`,
      title: isSi
        ? `අනුමත කිරීමට බෑන්ක් ස්ලිප් ${pendingSlipsCount}ක් බලා සිටී`
        : `${pendingSlipsCount} Student Bank Slip${pendingSlipsCount > 1 ? 's' : ''} Waiting for Approval`,
      shortDesc: isSi
        ? 'සිසුන් මුදල් ගෙවා එවූ බෑන්ක් ස්ලිප් පරීක්ෂා කර Approve කරන්න.'
        : 'Students uploaded payment receipts. Verify and approve them in Enrollments.',
      voiceText: isSi
        ? 'විශේෂ දැනුම්දීමක්: පන්තියට බැඳෙන්න මුදල් ගෙවපු ළමයින්ගේ බෑන්ක් ස්ලිප් කිහිපයක් අනුමත කරන්න ඇවිත් තියෙනවා. එන්රෝල්මන්ට්ස් පිටුවට ගිහින් ඒ ස්ලිප් පරීක්ෂා කරලා ඇපෲව් කරන්න. එතකොට ඒ ළමයින්ට පන්තියට ඇතුළු වෙන්න පුළුවන්.'
        : 'Attention needed: you have pending student bank slips waiting for approval. Go to the Enrollments page to verify the receipts and grant course access in one click.',
      ctaLabel: isSi ? 'Slips පරීක්ෂා කරන්න' : 'Review Bank Slips',
      doneLabel: isSi ? 'අනුමත කර ඇත ✓' : 'Slips Approved ✓',
      to: '/creator/enrollments',
    });
  }

  if (missingRecordingsCount > 0) {
    items.push({
      id: 'missing_rec',
      done: false,
      priority: 5,
      severity: 'warning',
      clipId: isSi ? 'diag_si_missing_rec' : 'diag_en_missing_rec',
      stepBadge: isSi ? `මතක් කිරීමක් · Recording ${missingRecordingsCount}ක්` : `Reminder · ${missingRecordingsCount} Missing Recording${missingRecordingsCount > 1 ? 's' : ''}`,
      title: isSi
        ? `පසුගිය පන්තියේ Recording ලින්ක් එක ඇතුළත් කරන්න`
        : `Add Recording Link for ${missingRecordingsCount} Past Session${missingRecordingsCount > 1 ? 's' : ''}`,
      shortDesc: isSi
        ? 'පසුගිය Live පන්තිය අවසන් වී ඇත. සිසුන්ට නැරඹීමට Recording ලින්ක් එක දාන්න.'
        : 'A past live session has ended without a replay link. Paste the recording URL so students get notified.',
      voiceText: isSi
        ? 'පසුගිය ලයිව් පන්තියක රෙකෝඩින් ලින්ක් එක තවම ඇතුළත් කරලා නැහැ. ඩෑෂ්බෝඩ් එකේ තියෙන කහ පාට පැනලයෙන් රෙකෝඩින් ලින්ක් එක දාන්න. එතකොට පන්තිය මගහැරුණු ළමයින්ටත් ඒ පාඩම බලන්න පුළුවන්.'
        : 'You have a past live session that is still missing its recording link. Paste the recording link in the yellow banner on your dashboard so students are notified immediately.',
      ctaLabel: isSi ? 'Recording ලින්ක් දාන්න' : 'Add Recording Link',
      doneLabel: isSi ? 'Recording ඇතුළත් කර ඇත ✓' : 'Recording Added ✓',
      to: '/creator/dashboard',
    });
  }

  const missingItems = items.filter(item => !item.done);
  const completedItems = items.filter(item => item.done);

  const allDoneClip = isSi
    ? {
        clipId: 'diag_si_all_done',
        text: 'සුබ පැතුම්! ඔයාගේ ගිණුමේ මූලික සැකසුම් හතරම සියයට සියයක් සම්පූර්ණයි. දැන් ඔයාගේ පාඨමාලා ලින්ක් එක ළමයින්ට යවන්න. මාසය අවසානයේ බැංකු ප්‍රකාශනය පරීක්ෂා කරන්න ඕඩිට් රිපෝට්ස් පිටුව පාවිච්චි කරන්න.',
      }
    : {
        clipId: 'diag_en_all_done',
        text: 'Congratulations! All four core setup steps on your account are complete. Keep sharing your course link with students, and use Audit Reports anytime to reconcile your bank statements.',
      };

  const playlist =
    missingItems.length > 0
      ? [
          { id: 'welcome', clipId: welcomeIntro.clipId, text: welcomeIntro.text },
          ...missingItems.map(m => ({ id: m.id, clipId: m.clipId, text: m.voiceText })),
        ]
      : [{ id: 'all_done', clipId: allDoneClip.clipId, text: allDoneClip.text }];

  return {
    items,
    missingItems,
    completedItems,
    playlist,
    allDoneClip,
    welcomeIntro,
  };
}

// ============================================================================
// SINGLETON REACTIVE VOICE PLAYER
// ============================================================================
class SinhalaVoiceController {
  constructor() {
    this.audio = null;
    this.listeners = new Set();
    this.playlistQueue = [];
    this.playlistIndex = -1;
    this.playlistCallbacks = null;
    this.gapTimer = null;

    this.state = {
      isPlaying: false,
      isPaused: false,
      activeClipId: null,
      activeItemId: null,
      currentText: '',
      rate: 1.0,
      progress: 0,
      playlistIndex: -1,
      playlistTotal: 0,
    };
  }

  getState() {
    return this.state;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  _emit(patch) {
    this.state = { ...this.state, ...patch };
    for (const listener of this.listeners) {
      try {
        listener(this.state);
      } catch {
        // Ignore listener errors
      }
    }
  }

  _clearTimers() {
    if (this.gapTimer) {
      clearTimeout(this.gapTimer);
      this.gapTimer = null;
    }
  }

  stop() {
    this._clearTimers();
    this.playlistQueue = [];
    this.playlistIndex = -1;
    this.playlistCallbacks = null;

    if (this.audio) {
      try {
        this.audio.pause();
        this.audio.removeAttribute('src');
        this.audio.load();
      } catch {
        // Ignore cleanup errors
      }
      this.audio = null;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore speechSynthesis errors
      }
    }

    this._emit({
      isPlaying: false,
      isPaused: false,
      activeClipId: null,
      activeItemId: null,
      currentText: '',
      progress: 0,
      playlistIndex: -1,
      playlistTotal: 0,
    });
  }

  setRate(newRate) {
    const rate = Number(newRate) || 1.0;
    this._emit({ rate });
    if (this.audio) {
      this.audio.playbackRate = rate;
    }
  }

  pause() {
    if (!this.state.isPlaying || this.state.isPaused) return;
    if (this.audio) {
      this.audio.pause();
    } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.pause();
    }
    this._emit({ isPaused: true });
  }

  resume() {
    if (!this.state.isPlaying || !this.state.isPaused) return;
    if (this.audio) {
      this.audio.play().catch(() => {});
    } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.resume();
    }
    this._emit({ isPaused: false });
  }

  togglePause() {
    if (this.state.isPaused) {
      this.resume();
    } else if (this.state.isPlaying) {
      this.pause();
    }
  }

  /**
   * Plays a single pre-bundled voice clip (/audio/voice-guide/<clipId>.mp3)
   * with automatic Web Speech API fallback if needed.
   */
  playClip(clipId, { itemId = null, text = '', lang = 'si', onEnd = null } = {}) {
    this.stop();
    this._playInternal({ clipId, itemId: itemId || clipId, text, lang, onEnd, isPlaylist: false });
  }

  /**
   * Plays an ordered array of { id, clipId, text, lang } items sequentially.
   */
  playPlaylist(items = [], { lang = 'si', onItemStart = null, onComplete = null } = {}) {
    if (!Array.isArray(items) || items.length === 0) return;
    this.stop();
    this.playlistQueue = items;
    this.playlistIndex = 0;
    this.playlistCallbacks = { lang, onItemStart, onComplete };
    this._playNextInPlaylist();
  }

  _playNextInPlaylist() {
    if (this.playlistIndex < 0 || this.playlistIndex >= this.playlistQueue.length) {
      const cb = this.playlistCallbacks?.onComplete;
      this.stop();
      if (cb) cb();
      return;
    }

    const current = this.playlistQueue[this.playlistIndex];
    const lang = current.lang || this.playlistCallbacks?.lang || 'si';
    if (this.playlistCallbacks?.onItemStart) {
      this.playlistCallbacks.onItemStart(current, this.playlistIndex);
    }

    this._playInternal({
      clipId: current.clipId,
      itemId: current.id || current.clipId,
      text: current.text || '',
      lang,
      isPlaylist: true,
      playlistIdx: this.playlistIndex,
      playlistTotal: this.playlistQueue.length,
      onEnd: () => {
        this.gapTimer = setTimeout(() => {
          this.playlistIndex += 1;
          this._playNextInPlaylist();
        }, 360);
      },
    });
  }

  _playInternal({ clipId, itemId, text, lang, onEnd, isPlaylist, playlistIdx = 0, playlistTotal = 1 }) {
    const rate = this.state.rate || 1.0;

    this._emit({
      isPlaying: true,
      isPaused: false,
      activeClipId: clipId,
      activeItemId: itemId,
      currentText: text,
      progress: 0,
      playlistIndex: isPlaylist ? playlistIdx : 0,
      playlistTotal: isPlaylist ? playlistTotal : 1,
    });

    if (typeof window === 'undefined') return;

    const audioUrl = `/audio/voice-guide/${clipId}.mp3`;
    const audio = new Audio(audioUrl);
    audio.playbackRate = rate;
    this.audio = audio;

    audio.ontimeupdate = () => {
      if (audio.duration && Number.isFinite(audio.duration)) {
        this._emit({ progress: Math.min(100, Math.round((audio.currentTime / audio.duration) * 100)) });
      }
    };

    audio.onended = () => {
      this.audio = null;
      if (onEnd) {
        onEnd();
      } else {
        this.stop();
      }
    };

    audio.onerror = () => {
      // Fallback to Web Speech API if static audio file is unavailable
      this.audio = null;
      this._speakWithWebSpeech({ text, lang, rate, onEnd });
    };

    audio.play().catch(() => {
      this.audio = null;
      this._speakWithWebSpeech({ text, lang, rate, onEnd });
    });
  }

  _speakWithWebSpeech({ text, lang, rate, onEnd }) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || !text) {
      if (onEnd) onEnd();
      else this.stop();
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = lang === 'en' ? 'en-US' : 'si-LK';
      utter.rate = rate;

      const voices = window.speechSynthesis.getVoices?.() || [];
      const targetLangPrefix = lang === 'en' ? 'en' : 'si';
      const matchedVoice = voices.find(v => v.lang?.toLowerCase().startsWith(targetLangPrefix));
      if (matchedVoice) {
        utter.voice = matchedVoice;
      }

      utter.onend = () => {
        if (onEnd) onEnd();
        else this.stop();
      };
      utter.onerror = () => {
        if (onEnd) onEnd();
        else this.stop();
      };

      window.speechSynthesis.speak(utter);
    } catch {
      if (onEnd) onEnd();
      else this.stop();
    }
  }
}

export const voiceEngine = new SinhalaVoiceController();

const subscribeVoice = (listener) => voiceEngine.subscribe(listener);
const getVoiceSnapshot = () => voiceEngine.getState();

export function useVoiceEngine() {
  return useSyncExternalStore(subscribeVoice, getVoiceSnapshot, getVoiceSnapshot);
}

