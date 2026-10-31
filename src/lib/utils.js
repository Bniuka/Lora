import { supabase } from './supabase';

export async function generatePaymentReference(learnerName = '') {
  const sanitizedName = (learnerName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8)) || 'USER';
  let isUnique = false;
  let code = '';

  while (!isUnique) {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    code = `LORA_${sanitizedName}_${randomNum}`;

    // Verify uniqueness in Supabase
    const { data } = await supabase
      .from('enrollments')
      .select('id')
      .eq('payment_reference_code', code)
      .maybeSingle();
      
    if (!data) {
      isUnique = true;
    }
  }
  
  return code;
}

export function hasValidSubscription(creatorProfile) {
  if (!creatorProfile) return false;
  if (creatorProfile.subscription_status === 'active') return true;
  if (creatorProfile.subscription_status === 'trial') {
    return new Date(creatorProfile.trial_ends_at) > new Date();
  }
  return false;
}

export function slugify(text) {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w-]+/g, '')        // Remove all non-word chars except -
    .replace(/--+/g, '-')           // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start of text
    .replace(/-+$/, '');            // Trim - from end of text
}

export async function generateUniquePackSlug(title, currentPackId = null) {
  const base = slugify(title) || 'course';
  let slug = base;
  let counter = 1;
  let isUnique = false;

  while (!isUnique) {
    try {
      let query = supabase.from('session_packs').select('id').eq('slug', slug);
      if (currentPackId) {
        query = query.neq('id', currentPackId);
      }
      const { data, error } = await query.maybeSingle();
      if (error || !data) {
        isUnique = true;
      } else {
        counter++;
        slug = `${base}-${counter}`;
      }
    } catch (_) {
      isUnique = true;
    }
  }
  return slug;
}

/**
 * Generates an unambiguous uppercase alphanumeric token for Private / Unlisted invite links
 * e.g. "INV-8XK9P2"
 */
export function generateInviteToken() {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let suffix = '';
  for (let i = 0; i < 6; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `INV-${suffix}`;
}

/**
 * Builds the shareable URL for a pack.
 * When includeInvite is true and the pack is private/unlisted with an invite_token,
 * appends ?invite=<invite_token> so invited learners unlock full access immediately.
 */
export function getPackShareUrl(pack, { includeInvite = false, origin = typeof window !== 'undefined' ? window.location.origin : '' } = {}) {
  if (!pack) return origin;
  const slugPart = pack.slug || slugify(pack.title) || pack.id;
  const baseUrl = `${origin}/p/${slugPart}`;
  const isRestricted = pack.visibility === 'private' || pack.visibility === 'unlisted';
  if (includeInvite && isRestricted && pack.invite_token) {
    return `${baseUrl}?invite=${encodeURIComponent(pack.invite_token)}`;
  }
  return baseUrl;
}


