// Vercel Serverless Function to dynamically serve Open Graph meta tags for WhatsApp, Telegram, Twitter, etc.

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://gpxnalcfagzmewulvjcf.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdweG5hbGNmYWd6bWV3dWx2amNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5MDEzMzgsImV4cCI6MjA5NjQ3NzMzOH0.otCNYffDppFkt6Q7xOGLhnbePuotvwGvabixTj8-Lq4';
const SITE_DOMAIN = 'https://www.loraspace.com';
const DEFAULT_IMAGE = `${SITE_DOMAIN}/favicon-512x512.png`;

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function cleanDescription(text, maxLen = 180) {
  if (!text) return 'Explore this session pack on Loraspace.';
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= maxLen) return clean;
  return clean.slice(0, maxLen - 1) + '…';
}

function ensureAbsoluteUrl(url) {
  if (!url) return DEFAULT_IMAGE;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${SITE_DOMAIN}${url.startsWith('/') ? '' : '/'}${url}`;
}

export default async function handler(req, res) {
  const { id, type = 'pack' } = req.query;

  // Basic validation
  if (!id) {
    return res.redirect(302, '/');
  }

  const userAgent = req.headers['user-agent'] || '';
  const isBot = /bot|whatsapp|telegram|facebook|twitter|slack|discord|linkedin|skype|meta-external|applebot|curl|wget|preview|pinterest/i.test(userAgent);

  const targetPath = type === 'creator' ? `/creator/${id}` : `/learner/pack/${id}`;

  // If a human visitor reaches here directly via browser, redirect them immediately to the SPA
  if (!isBot && req.query.force_preview !== 'true') {
    return res.redirect(302, targetPath);
  }

  let title = 'Loraspace — Premium Course Platform';
  let description = 'Build, sell, and manage your sessions with manual payment verification on Loraspace.';
  let imageUrl = DEFAULT_IMAGE;

  try {
    if (type === 'creator') {
      const resp = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${id}&select=id,first_name,last_name,bio,avatar_url`, {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`
        }
      });
      const data = await resp.json();
      if (Array.isArray(data) && data.length > 0) {
        const creator = data[0];
        const fullName = [creator.first_name, creator.last_name].filter(Boolean).join(' ') || 'Creator';
        title = `${fullName} on Loraspace`;
        description = cleanDescription(creator.bio, 180);
        imageUrl = ensureAbsoluteUrl(creator.avatar_url);
      }
    } else {
      // Session pack lookup
      const resp = await fetch(`${SUPABASE_URL}/rest/v1/session_packs?id=eq.${id}&select=id,title,description,thumbnail_url,price`, {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`
        }
      });
      const data = await resp.json();
      if (Array.isArray(data) && data.length > 0) {
        const pack = data[0];
        if (pack.title) {
          title = `${pack.title} — Loraspace`;
        }
        description = cleanDescription(pack.description, 180);
        imageUrl = ensureAbsoluteUrl(pack.thumbnail_url);
      }
    }
  } catch (err) {
    console.error('Error fetching preview data from Supabase:', err);
  }

  const canonicalUrl = `${SITE_DOMAIN}${targetPath}`;
  const safeTitle = escapeHtml(title);
  const safeDesc = escapeHtml(description);
  const safeImage = escapeHtml(imageUrl);

  // Set caching so social platforms and Vercel CDN cache the response
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle}</title>
  <meta name="description" content="${safeDesc}">

  <!-- Open Graph / WhatsApp / Telegram / Facebook -->
  <meta property="og:site_name" content="Loraspace">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:title" content="${safeTitle}">
  <meta property="og:description" content="${safeDesc}">
  <meta property="og:image" content="${safeImage}">
  <meta property="og:image:secure_url" content="${safeImage}">

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:url" content="${canonicalUrl}">
  <meta name="twitter:title" content="${safeTitle}">
  <meta name="twitter:description" content="${safeDesc}">
  <meta name="twitter:image" content="${safeImage}">

  <link rel="image_src" href="${safeImage}">
  <link rel="canonical" href="${canonicalUrl}">

  <!-- Automatic client-side redirect if opened in browser -->
  <meta http-equiv="refresh" content="0;url=${targetPath}">
  <script>
    window.location.replace("${targetPath}");
  </script>
</head>
<body>
  <p>Loading <a href="${targetPath}">${safeTitle}</a>...</p>
</body>
</html>`;

  return res.status(200).send(html);
}
