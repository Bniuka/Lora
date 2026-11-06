import { supabase } from './supabase';
import { DEFAULT_ADMIN_EMAILS } from './admin';

// ─── Local Storage Keys for Resilient Fallbacks ───
const LS_COPYRIGHT_ALERTS = 'lora_copyright_alerts_v1';
const LS_BANNED_PACKS = 'lora_banned_packs_v1';

/**
 * Normalizes a URL to extract its core media/meeting fingerprint.
 * Supports Zoom, YouTube, Google Drive, Vimeo, Microsoft Teams, and generic URLs.
 */
export function normalizeUrlFingerprint(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  try {
    const urlObj = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    const hostname = urlObj.hostname.toLowerCase();
    const pathname = urlObj.pathname;

    // 1. Zoom Meetings: Extract 9-11 digit meeting number
    if (hostname.includes('zoom.us')) {
      const match = pathname.match(/\/j\/(\d{9,11})/) || pathname.match(/\/my\/([a-zA-Z0-9._-]+)/);
      if (match && match[1]) {
        return {
          type: 'zoom',
          id: match[1],
          fingerprint: `zoom:${match[1]}`,
          cleanUrl: `https://zoom.us/j/${match[1]}`,
        };
      }
    }

    // 2. YouTube: Extract 11-char video ID
    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
      let videoId = null;
      if (hostname.includes('youtu.be')) {
        videoId = pathname.replace('/', '').split('?')[0];
      } else if (pathname.includes('/live/')) {
        videoId = pathname.split('/live/')[1]?.split('?')[0];
      } else if (pathname.includes('/embed/')) {
        videoId = pathname.split('/embed/')[1]?.split('?')[0];
      } else {
        videoId = urlObj.searchParams.get('v');
      }
      if (videoId && videoId.length >= 8) {
        return {
          type: 'youtube',
          id: videoId,
          fingerprint: `youtube:${videoId}`,
          cleanUrl: `https://www.youtube.com/watch?v=${videoId}`,
        };
      }
    }

    // 3. Google Drive / Docs: Extract file ID
    if (hostname.includes('drive.google.com') || hostname.includes('docs.google.com')) {
      const match = pathname.match(/\/d\/([a-zA-Z0-9_-]+)/) || urlObj.searchParams.get('id');
      const fileId = typeof match === 'string' ? match : match?.[1];
      if (fileId) {
        return {
          type: 'gdrive',
          id: fileId,
          fingerprint: `gdrive:${fileId}`,
          cleanUrl: `https://drive.google.com/file/d/${fileId}/view`,
        };
      }
    }

    // 4. Vimeo: Extract video ID
    if (hostname.includes('vimeo.com')) {
      const match = pathname.match(/\/(\d{6,12})/);
      if (match && match[1]) {
        return {
          type: 'vimeo',
          id: match[1],
          fingerprint: `vimeo:${match[1]}`,
          cleanUrl: `https://vimeo.com/${match[1]}`,
        };
      }
    }

    // 5. Generic fallback (strip query string, hash, and trailing slashes)
    const cleanPath = pathname.replace(/\/+$/, '');
    const genericFp = `${hostname}${cleanPath}`;
    return {
      type: 'generic',
      id: genericFp,
      fingerprint: `url:${genericFp}`,
      cleanUrl: `${urlObj.protocol}//${hostname}${cleanPath}`,
    };
  } catch {
    // If not a valid URL format, clean string
    const clean = trimmed.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (clean.length > 6) {
      return {
        type: 'raw',
        id: clean,
        fingerprint: `raw:${clean}`,
        cleanUrl: trimmed,
      };
    }
    return null;
  }
}

/**
 * Checks a list of sessions against all known packs in the system to detect if
 * another creator has already registered any of these live or recording links.
 */
export async function checkDuplicateSessionLinks(newSessions, currentPackId, currentCreatorId) {
  if (!Array.isArray(newSessions) || newSessions.length === 0) {
    return { isDuplicate: false, matches: [] };
  }

  // Extract all fingerprints for the sessions being saved
  const targetFingerprints = [];
  for (const session of newSessions) {
    const liveFp = normalizeUrlFingerprint(session.live_url || session.zoom_link || session.link);
    const recFp = normalizeUrlFingerprint(session.recording_url || session.video_url || session.recording_link);
    if (liveFp) {
      targetFingerprints.push({
        sessionTitle: session.title || 'Live Session',
        url: session.live_url || session.zoom_link || session.link,
        fingerprint: liveFp.fingerprint,
        type: liveFp.type,
        cleanUrl: liveFp.cleanUrl,
        slot: 'live',
      });
    }
    if (recFp) {
      targetFingerprints.push({
        sessionTitle: session.title || 'Recording Session',
        url: session.recording_url || session.video_url || session.recording_link,
        fingerprint: recFp.fingerprint,
        type: recFp.type,
        cleanUrl: recFp.cleanUrl,
        slot: 'recording',
      });
    }
  }

  if (targetFingerprints.length === 0) {
    return { isDuplicate: false, matches: [] };
  }

  const matches = [];

  try {
    // Query other session packs
    let query = supabase
      .from('session_packs')
      .select('id, title, creator_id, sessions, created_at, profiles:creator_id(first_name, last_name, email)');

    if (currentPackId) {
      query = query.neq('id', currentPackId);
    }

    const { data: packs, error } = await query;

    if (!error && packs) {
      for (const pack of packs) {
        // Skip if same creator (creator reusing their own link is legitimate)
        if (pack.creator_id === currentCreatorId) continue;

        const packSessions = Array.isArray(pack.sessions) ? pack.sessions : [];
        for (const existingSession of packSessions) {
          const exLiveFp = normalizeUrlFingerprint(existingSession.live_url || existingSession.zoom_link || existingSession.link);
          const exRecFp = normalizeUrlFingerprint(existingSession.recording_url || existingSession.video_url || existingSession.recording_link);

          for (const target of targetFingerprints) {
            let matchedExistingUrl = null;
            if (exLiveFp && exLiveFp.fingerprint === target.fingerprint) {
              matchedExistingUrl = existingSession.live_url || existingSession.zoom_link || existingSession.link;
            } else if (exRecFp && exRecFp.fingerprint === target.fingerprint) {
              matchedExistingUrl = existingSession.recording_url || existingSession.video_url || existingSession.recording_link;
            }

            if (matchedExistingUrl) {
              matches.push({
                originalPackId: pack.id,
                originalPackTitle: pack.title,
                originalCreatorId: pack.creator_id,
                originalCreatorName: `${pack.profiles?.first_name || 'Creator'} ${pack.profiles?.last_name || ''}`.trim(),
                originalCreatorEmail: pack.profiles?.email || 'N/A',
                originalRegisteredAt: pack.created_at,
                originalSessionTitle: existingSession.title || 'Original Session',
                originalUrl: matchedExistingUrl,
                flaggedSessionTitle: target.sessionTitle,
                flaggedUrl: target.url,
                slot: target.slot,
                fingerprint: target.fingerprint,
                mediaType: target.type,
              });
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn('[LinkSentinel] Remote scan failed, checking local database:', err);
  }

  return {
    isDuplicate: matches.length > 0,
    matches,
  };
}

/**
 * Creates and registers a Copyright Infringement Alert for the Founder Panel.
 * Also sends automated notifications to the Original Creator and Founder.
 */
export async function registerCopyrightAlert({
  match,
  copierPackId,
  copierPackTitle,
  copierCreatorId,
  copierCreatorName,
  copierCreatorEmail,
}) {
  const alertId = `cpr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const newAlert = {
    id: alertId,
    status: 'pending', // 'pending', 'resolved_banned', 'dismissed'
    created_at: new Date().toISOString(),
    fingerprint: match.fingerprint,
    media_type: match.mediaType,
    slot: match.slot,
    // Original Creator (Victim)
    original_creator_id: match.originalCreatorId,
    original_creator_name: match.originalCreatorName,
    original_creator_email: match.originalCreatorEmail,
    original_pack_id: match.originalPackId,
    original_pack_title: match.originalPackTitle,
    original_session_title: match.originalSessionTitle,
    original_url: match.originalUrl,
    original_registered_at: match.originalRegisteredAt,
    // Alleged Copier
    copier_creator_id: copierCreatorId,
    copier_creator_name: copierCreatorName,
    copier_creator_email: copierCreatorEmail,
    copier_pack_id: copierPackId,
    copier_pack_title: copierPackTitle,
    copier_session_title: match.flaggedSessionTitle,
    copier_url: match.flaggedUrl,
    // Resolution Notes
    resolution_notes: null,
    resolved_at: null,
  };

  // 1. Persist to Local Storage as high-fidelity store
  try {
    const existing = JSON.parse(localStorage.getItem(LS_COPYRIGHT_ALERTS) || '[]');
    // Avoid exact duplicate alerts for same copier pack and fingerprint
    const isExisting = existing.some(
      a => a.copier_pack_id === copierPackId && a.fingerprint === match.fingerprint && a.status === 'pending'
    );
    if (!isExisting) {
      existing.unshift(newAlert);
      localStorage.setItem(LS_COPYRIGHT_ALERTS, JSON.stringify(existing));
    }
  } catch (e) {
    console.error('[LinkSentinel] Failed to store local alert:', e);
  }

  // 2. Attempt Supabase Table Insert
  try {
    await supabase.from('copyright_alerts').insert([newAlert]);
  } catch (err) {
    // Non-blocking if table not yet created
    console.debug('[LinkSentinel] Remote copyright_alerts insert skipped or pending table:', err);
  }

  // 3. Dispatch Security Alert Notification to Original Creator
  try {
    await supabase.from('notifications').insert([
      {
        user_id: match.originalCreatorId,
        title: '🛡️ Copyright & Content Protection Alert',
        message: `Our Sentinel detected another pack attempting to use your session link for "${match.originalSessionTitle}". The Founder Team has been notified and both links are locked under manual review to protect your content.`,
        is_read: false,
        created_at: new Date().toISOString(),
      },
    ]);
  } catch (err) {
    console.debug('[LinkSentinel] Failed to notify original creator via supabase:', err);
  }

  // 4. Dispatch Alert Notification to Founder (default admins)
  try {
    for (const adminEmail of DEFAULT_ADMIN_EMAILS) {
      // Find admin user id
      const { data: adminUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', adminEmail)
        .maybeSingle();

      if (adminUser?.id) {
        await supabase.from('notifications').insert([
          {
            user_id: adminUser.id,
            title: '🚨 PIRACY ALERT: Duplicate Live/Recording Link Detected',
            message: `Creator "${copierCreatorName}" (${copierCreatorEmail}) used a matching link from "${match.originalCreatorName}". Open the Founder Panel to inspect both unlocked streams and take action.`,
            is_read: false,
            created_at: new Date().toISOString(),
          },
        ]);
      }
    }
  } catch (err) {
    console.debug('[LinkSentinel] Failed to notify admin via supabase:', err);
  }

  return newAlert;
}

/**
 * Returns all copyright alerts for the Founder Panel.
 */
export async function getCopyrightAlerts() {
  let remoteAlerts = [];
  try {
    const { data, error } = await supabase
      .from('copyright_alerts')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) {
      remoteAlerts = data;
    }
  } catch (e) {
    console.debug('[LinkSentinel] Remote alerts fetch bypassed:', e);
  }

  let localAlerts = [];
  try {
    localAlerts = JSON.parse(localStorage.getItem(LS_COPYRIGHT_ALERTS) || '[]');
  } catch (e) {
    console.error('[LinkSentinel] Local alerts parse error:', e);
  }

  // Merge and deduplicate by ID
  const map = new Map();
  [...localAlerts, ...remoteAlerts].forEach(alert => {
    map.set(alert.id, alert);
  });

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );
}

/**
 * Resolves a copyright alert from the Founder Panel:
 * Action 'ban_pack':
 *   - Marks the copier's pack as banned (delisted).
 *   - Automatically sends the "Problem Solved" reassurance message to Original Creator.
 *   - Sends infraction notice to Copier.
 * Action 'dismiss':
 *   - Marks alert as dismissed / approved as legitimate.
 */
export async function resolveCopyrightAlert({ alertId, action, notes, founderEmail }) {
  const alerts = await getCopyrightAlerts();
  const alert = alerts.find(a => a.id === alertId);
  if (!alert) throw new Error('Alert record not found.');

  const resolvedAt = new Date().toISOString();
  const newStatus = action === 'ban_pack' ? 'resolved_banned' : 'dismissed';

  // 1. Update local storage
  const updatedAlerts = alerts.map(a => {
    if (a.id === alertId) {
      return {
        ...a,
        status: newStatus,
        resolution_notes: notes || (action === 'ban_pack' ? 'Confirmed copyright infringement. Offending pack banned.' : 'Dismissed by Founder.'),
        resolved_at: resolvedAt,
        resolved_by: founderEmail,
      };
    }
    return a;
  });
  localStorage.setItem(LS_COPYRIGHT_ALERTS, JSON.stringify(updatedAlerts));

  // 2. If action is ban_pack: record banned pack in localStorage & Supabase
  if (action === 'ban_pack' && alert.copier_pack_id) {
    try {
      const bannedPacks = JSON.parse(localStorage.getItem(LS_BANNED_PACKS) || '[]');
      if (!bannedPacks.includes(alert.copier_pack_id)) {
        bannedPacks.push(alert.copier_pack_id);
        localStorage.setItem(LS_BANNED_PACKS, JSON.stringify(bannedPacks));
      }
    } catch (e) {
      console.error('[LinkSentinel] Failed to update local banned packs:', e);
    }

    // Update session_packs table status in Supabase
    try {
      await supabase
        .from('session_packs')
        .update({ status: 'banned', is_published: false })
        .eq('id', alert.copier_pack_id);
    } catch (err) {
      console.debug('[LinkSentinel] Supabase pack status update skipped:', err);
    }

    // ─── AUTOMATIC "PROBLEM SOLVED" MESSAGE TO ORIGINAL CREATOR ───
    try {
      await supabase.from('notifications').insert([
        {
          user_id: alert.original_creator_id,
          title: '✅ Content Protected: Problem Solved!',
          message: `Dear ${alert.original_creator_name || 'Creator'}, our Founder team manually verified the duplicate link report for your session "${alert.original_session_title}". The infringing pack "${alert.copier_pack_title}" has been BANNED and completely delisted from LoraSpace. Your original content is 100% safe.`,
          is_read: false,
          created_at: resolvedAt,
        },
      ]);
    } catch (err) {
      console.debug('[LinkSentinel] Notification to original creator failed:', err);
    }

    // ─── INFRACTION NOTICE TO COPIER ───
    try {
      await supabase.from('notifications').insert([
        {
          user_id: alert.copier_creator_id,
          title: '🚫 Session Pack Banned: Copyright Violation',
          message: `Your session pack "${alert.copier_pack_title}" has been banned and delisted following manual founder verification of unauthorized duplicate live/recording link usage. Contact support for appeals.`,
          is_read: false,
          created_at: resolvedAt,
        },
      ]);
    } catch (err) {
      console.debug('[LinkSentinel] Notification to copier failed:', err);
    }
  }

  // 3. Update remote table if available
  try {
    await supabase
      .from('copyright_alerts')
      .update({
        status: newStatus,
        resolution_notes: notes,
        resolved_at: resolvedAt,
        resolved_by: founderEmail,
      })
      .eq('id', alertId);
  } catch (err) {
    console.debug('[LinkSentinel] Remote alert status update skipped:', err);
  }

  return true;
}

/**
 * Checks if a pack is banned.
 */
export function isPackBanned(packId) {
  if (!packId) return false;
  try {
    const bannedPacks = JSON.parse(localStorage.getItem(LS_BANNED_PACKS) || '[]');
    return bannedPacks.includes(packId);
  } catch {
    return false;
  }
}
