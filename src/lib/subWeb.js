import { supabase } from './supabase';

const LOCAL_REGISTRY_KEY = 'lora_sub_web_registry_v1';

const RESERVED_SUBDOMAINS = new Set([
  'www',
  'app',
  'api',
  'admin',
  'founder',
  'mail',
  'smtp',
  'ftp',
  'staging',
  'dev',
  'test',
  'cdn',
  'assets',
  'loraspace',
  'lora',
]);

export const SUB_WEB_THEMES = [
  {
    id: 'royal_blue',
    name: 'Royal Academy Blue',
    primary: '#2563eb',
    primaryDark: '#1d4ed8',
    secondary: '#4f46e5',
    accent: '#38bdf8',
    softBg: '#eff6ff',
    border: '#bfdbfe',
    heroGradient: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 52%, #2563eb 100%)',
    buttonGradient: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)',
    badgeBg: 'rgba(59, 130, 246, 0.18)',
    badgeText: '#93c5fd',
  },
  {
    id: 'emerald',
    name: 'Emerald Excellence',
    primary: '#059669',
    primaryDark: '#047857',
    secondary: '#0d9488',
    accent: '#34d399',
    softBg: '#ecfdf5',
    border: '#a7f3d0',
    heroGradient: 'linear-gradient(135deg, #062e22 0%, #065f46 52%, #059669 100%)',
    buttonGradient: 'linear-gradient(135deg, #059669 0%, #0d9488 100%)',
    badgeBg: 'rgba(16, 185, 129, 0.2)',
    badgeText: '#6ee7b7',
  },
  {
    id: 'violet',
    name: 'Electric Violet',
    primary: '#7c3aed',
    primaryDark: '#6d28d9',
    secondary: '#6366f1',
    accent: '#c084fc',
    softBg: '#f5f3ff',
    border: '#ddd6fe',
    heroGradient: 'linear-gradient(135deg, #130b2e 0%, #4c1d95 52%, #7c3aed 100%)',
    buttonGradient: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)',
    badgeBg: 'rgba(167, 139, 250, 0.2)',
    badgeText: '#d8b4fe',
  },
  {
    id: 'amber_gold',
    name: 'Imperial Gold',
    primary: '#d97706',
    primaryDark: '#b45309',
    secondary: '#ea580c',
    accent: '#fbbf24',
    softBg: '#fffbeb',
    border: '#fde68a',
    heroGradient: 'linear-gradient(135deg, #1c1206 0%, #78350f 52%, #d97706 100%)',
    buttonGradient: 'linear-gradient(135deg, #d97706 0%, #ea580c 100%)',
    badgeBg: 'rgba(245, 158, 11, 0.2)',
    badgeText: '#fde68a',
  },
  {
    id: 'crimson',
    name: 'Crimson Masterclass',
    primary: '#e11d48',
    primaryDark: '#be123c',
    secondary: '#db2777',
    accent: '#fb7185',
    softBg: '#fff1f2',
    border: '#fecdd3',
    heroGradient: 'linear-gradient(135deg, #240711 0%, #881337 52%, #e11d48 100%)',
    buttonGradient: 'linear-gradient(135deg, #e11d48 0%, #db2777 100%)',
    badgeBg: 'rgba(244, 63, 94, 0.2)',
    badgeText: '#fda4af',
  },
  {
    id: 'midnight_dark',
    name: 'Midnight Cyber Pro',
    primary: '#3b82f6',
    primaryDark: '#1d4ed8',
    secondary: '#8b5cf6',
    accent: '#38bdf8',
    softBg: '#f1f5f9',
    border: '#cbd5e1',
    heroGradient: 'linear-gradient(135deg, #030712 0%, #111827 55%, #1e293b 100%)',
    buttonGradient: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
    badgeBg: 'rgba(56, 189, 248, 0.16)',
    badgeText: '#7dd3fc',
  },
];

export function getThemeById(themeId) {
  return SUB_WEB_THEMES.find((t) => t.id === themeId) || SUB_WEB_THEMES[0];
}

export function sanitizeSubdomainSlug(input = '') {
  return String(input || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 42);
}

export function sanitizeCustomDomain(input = '') {
  return String(input || '')
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/:\d+$/, '')
    .trim();
}

/**
 * Inspects the current browser hostname to determine if the visitor is on:
 * 1) A creator subdomain (e.g., apex-physics.loraspace.com or apex-physics.localhost)
 * 2) A creator VIP custom domain (e.g., www.apexphysics.lk)
 * 3) The main LoraSpace platform (returns null)
 */
export function detectSubWebHost(rawHostname) {
  if (typeof window === 'undefined' && !rawHostname) return null;
  const host = (rawHostname || window.location.hostname || '').toLowerCase().trim();
  if (!host || host === 'localhost' || host === '127.0.0.1') return null;

  // Ignore default hosting preview domains (e.g., project-name.vercel.app, project.netlify.app)
  if (host.endsWith('.vercel.app') || host.endsWith('.netlify.app') || host.endsWith('.pages.dev')) {
    return null;
  }

  // 1. Localhost subdomain testing: e.g., apex-physics.localhost
  if (host.endsWith('.localhost')) {
    const sub = host.slice(0, -'.localhost'.length);
    if (sub && !RESERVED_SUBDOMAINS.has(sub)) {
      return { mode: 'subdomain', slug: sub, host };
    }
    return null;
  }

  // 2. Official LoraSpace domain & wildcard subdomains (e.g., apex-physics.loraspace.com / .live / .lk)
  const loraMatch = host.match(/^([a-z0-9-]+)\.loraspace\.(com|live|lk|io|org|net)$/);
  if (loraMatch) {
    const sub = loraMatch[1];
    if (!RESERVED_SUBDOMAINS.has(sub)) {
      return { mode: 'subdomain', slug: sub, host };
    }
    return null;
  }

  if (/^loraspace\.(com|live|lk|io|org|net)$/.test(host)) {
    return null;
  }

  // 3. Any other external domain is treated as a VIP Custom Domain (e.g. www.apexphysics.lk)
  return {
    mode: 'custom_domain',
    customDomain: host,
    host,
  };
}

/**
 * Returns the primary base domain (e.g., loraspace.com) for display and link generation.
 */
export function getBasePlatformDomain() {
  if (typeof window === 'undefined') return 'loraspace.com';
  const host = window.location.hostname.toLowerCase();
  const match = host.match(/loraspace\.(com|live|lk|io|org|net)$/);
  if (match) return match[0];
  return 'loraspace.com';
}

/**
 * Generates all 3 access URLs for a creator's Sub-Web:
 * - subdomainUrl: https://<slug>.loraspace.com
 * - pathUrl: https://<origin>/s/<slug>
 * - customDomainUrl: https://<customDomain> (if set)
 */
export function getSubWebUrls(slug, customDomain = '') {
  const cleanSlug = sanitizeSubdomainSlug(slug) || 'my-academy';
  const baseDomain = getBasePlatformDomain();
  const origin = typeof window !== 'undefined' ? window.location.origin : `https://${baseDomain}`;

  const subdomainDisplay = `${cleanSlug}.${baseDomain}`;
  const subdomainUrl = `https://${subdomainDisplay}`;
  const pathUrl = `${origin}/s/${cleanSlug}`;
  const cleanCustom = sanitizeCustomDomain(customDomain);
  const customDomainUrl = cleanCustom ? `https://${cleanCustom}` : null;

  return {
    slug: cleanSlug,
    baseDomain,
    subdomainDisplay,
    subdomainUrl,
    pathUrl,
    customDomain: cleanCustom,
    customDomainUrl,
  };
}

function readLocalRegistry() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_REGISTRY_KEY) || '{}');
  } catch {
    return {};
  }
}

function writeLocalRegistry(creatorId, data) {
  try {
    const current = readLocalRegistry();
    current[creatorId] = {
      ...(current[creatorId] || {}),
      ...data,
      updated_at: new Date().toISOString(),
    };
    localStorage.setItem(LOCAL_REGISTRY_KEY, JSON.stringify(current));
  } catch {
    // ignore storage quota errors
  }
}

/**
 * Builds a complete normalized Sub-Web config object for a creator.
 */
export function normalizeSubWebConfig(creatorProfile = {}, userProfile = {}) {
  const creatorId = creatorProfile?.id || userProfile?.id || '';
  const localData = creatorId ? readLocalRegistry()[creatorId] || {} : {};

  const fullName = [userProfile?.first_name, userProfile?.last_name].filter(Boolean).join(' ') || 'Creator';
  const defaultSlug = sanitizeSubdomainSlug(
    creatorProfile?.sub_web_slug ||
      localData?.sub_web_slug ||
      `${userProfile?.first_name || 'academy'}-${userProfile?.last_name || 'hub'}`
  );

  const rawCfg = {
    ...(localData?.sub_web_config || {}),
    ...(creatorProfile?.sub_web_config || {}),
  };

  const isLifetimeVip =
    creatorProfile?.subscription_status === 'active' && !creatorProfile?.next_billing_date;

  const hasSubWeb = Boolean(
    creatorProfile?.has_sub_web ||
      localData?.has_sub_web ||
      rawCfg?.has_sub_web ||
      isLifetimeVip
  );

  const slug = sanitizeSubdomainSlug(
    creatorProfile?.sub_web_slug || localData?.sub_web_slug || rawCfg?.sub_web_slug || defaultSlug
  );

  const customDomain = sanitizeCustomDomain(
    creatorProfile?.custom_domain || localData?.custom_domain || rawCfg?.custom_domain || ''
  );

  return {
    has_sub_web: hasSubWeb,
    sub_web_slug: slug,
    custom_domain: customDomain,
    academy_name: rawCfg.academy_name || `${fullName} Academy`,
    tagline: rawCfg.tagline || `Official Online Learning Portal & Live Classes by ${fullName}`,
    hero_badge: rawCfg.hero_badge || 'OFFICIAL ACADEMY PORTAL',
    hero_title: rawCfg.hero_title || `Master Your Skills with ${fullName}`,
    hero_subtitle:
      rawCfg.hero_subtitle ||
      creatorProfile?.about ||
      'Join structured live interactive sessions, access HD catch-up recordings, and learn directly with guided mentorship.',
    logo_url: rawCfg.logo_url || userProfile?.avatar_url || '',
    hero_banner_url: rawCfg.hero_banner_url || '',
    intro_video_url: rawCfg.intro_video_url || '',
    theme_color: rawCfg.theme_color || 'royal_blue',
    about_title: rawCfg.about_title || `About ${fullName}`,
    about_description:
      rawCfg.about_description ||
      creatorProfile?.about ||
      `${fullName} is a dedicated educator and mentor delivering high-impact live classes, structured batches, and comprehensive learning resources.`,
    whatsapp_number: rawCfg.whatsapp_number || userProfile?.contact_number || '',
    whatsapp_group: rawCfg.whatsapp_group || '',
    telegram_link: rawCfg.telegram_link || '',
    youtube_channel: rawCfg.youtube_channel || '',
    facebook_page: rawCfg.facebook_page || '',
    announcement_text: rawCfg.announcement_text || '',
    stats_badge_1: rawCfg.stats_badge_1 || 'Live Interactive Classes',
    stats_badge_2: rawCfg.stats_badge_2 || 'HD Catch-Up Recordings',
    stats_badge_3: rawCfg.stats_badge_3 || 'Direct Mentor Support',
    hide_lora_badge: Boolean(rawCfg.hide_lora_badge),
  };
}

/**
 * Saves a creator's Sub-Web settings to Supabase (with graceful fallback if new columns aren't migrated yet).
 */
export async function saveCreatorSubWebConfig(creatorId, configInput = {}) {
  const cleanSlug = sanitizeSubdomainSlug(configInput.sub_web_slug);
  const cleanDomain = sanitizeCustomDomain(configInput.custom_domain);

  const subWebConfigJson = {
    has_sub_web: Boolean(configInput.has_sub_web),
    sub_web_slug: cleanSlug,
    custom_domain: cleanDomain,
    academy_name: configInput.academy_name || '',
    tagline: configInput.tagline || '',
    hero_badge: configInput.hero_badge || '',
    hero_title: configInput.hero_title || '',
    hero_subtitle: configInput.hero_subtitle || '',
    logo_url: configInput.logo_url || '',
    hero_banner_url: configInput.hero_banner_url || '',
    intro_video_url: configInput.intro_video_url || '',
    theme_color: configInput.theme_color || 'royal_blue',
    about_title: configInput.about_title || '',
    about_description: configInput.about_description || '',
    whatsapp_number: configInput.whatsapp_number || '',
    whatsapp_group: configInput.whatsapp_group || '',
    telegram_link: configInput.telegram_link || '',
    youtube_channel: configInput.youtube_channel || '',
    facebook_page: configInput.facebook_page || '',
    announcement_text: configInput.announcement_text || '',
    stats_badge_1: configInput.stats_badge_1 || '',
    stats_badge_2: configInput.stats_badge_2 || '',
    stats_badge_3: configInput.stats_badge_3 || '',
    hide_lora_badge: Boolean(configInput.hide_lora_badge),
  };

  // Always persist to local registry for immediate resilience
  writeLocalRegistry(creatorId, {
    has_sub_web: Boolean(configInput.has_sub_web),
    sub_web_slug: cleanSlug,
    custom_domain: cleanDomain,
    sub_web_config: subWebConfigJson,
  });

  const dbPayload = {
    has_sub_web: Boolean(configInput.has_sub_web),
    sub_web_slug: cleanSlug || null,
    custom_domain: cleanDomain || null,
    sub_web_config: subWebConfigJson,
  };

  const { error } = await supabase
    .from('creator_profiles')
    .update(dbPayload)
    .eq('id', creatorId);

  if (error) {
    // Graceful fallback if migration columns haven't been run in Supabase yet
    if (
      error.message?.includes('sub_web') ||
      error.message?.includes('custom_domain') ||
      error.message?.includes('column')
    ) {
      if (configInput.about_description) {
        await supabase
          .from('creator_profiles')
          .update({ about: configInput.about_description })
          .eq('id', creatorId);
      }
      return { savedLocally: true };
    }
    throw error;
  }

  return { savedToDb: true };
}

/**
 * Resolves a creator profile + user profile + normalized Sub-Web config by slug, custom domain, or creator ID.
 */
export async function resolveCreatorBySubWeb({ slug, customDomain }) {
  const targetSlug = sanitizeSubdomainSlug(slug);
  const targetDomain = sanitizeCustomDomain(customDomain);

  // Fetch all creator profiles with their user profile info
  const { data: creators, error } = await supabase
    .from('creator_profiles')
    .select('*, profiles(id, first_name, last_name, avatar_url, email, contact_number)');

  if (error || !creators) {
    return null;
  }

  const localReg = readLocalRegistry();

  // 1. Exact match by custom_domain (if looking up by custom domain)
  if (targetDomain) {
    const stripWww = (d) => d.replace(/^www\./, '');
    const domainMatch = creators.find((cp) => {
      const cfg = normalizeSubWebConfig(cp, cp.profiles);
      if (!cfg.custom_domain) return false;
      return stripWww(cfg.custom_domain) === stripWww(targetDomain);
    });
    if (domainMatch) {
      return {
        creator: domainMatch,
        profile: domainMatch.profiles,
        config: normalizeSubWebConfig(domainMatch, domainMatch.profiles),
      };
    }
  }

  // 2. Match by sub_web_slug, local registry slug, creator ID, or generated name slug
  if (targetSlug) {
    const slugMatch = creators.find((cp) => {
      if (cp.id === slug) return true;
      const cfg = normalizeSubWebConfig(cp, cp.profiles);
      if (cfg.sub_web_slug === targetSlug) return true;
      const localEntry = localReg[cp.id];
      if (localEntry?.sub_web_slug === targetSlug) return true;
      const nameSlug = sanitizeSubdomainSlug(
        `${cp.profiles?.first_name || ''}-${cp.profiles?.last_name || ''}`
      );
      const firstOnlySlug = sanitizeSubdomainSlug(cp.profiles?.first_name || '');
      return nameSlug === targetSlug || (firstOnlySlug && `${firstOnlySlug}-academy` === targetSlug);
    });

    if (slugMatch) {
      return {
        creator: slugMatch,
        profile: slugMatch.profiles,
        config: normalizeSubWebConfig(slugMatch, slugMatch.profiles),
      };
    }
  }

  return null;
}
