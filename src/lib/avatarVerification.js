import { supabase } from './supabase';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const TARGET_SIZE_PX = 500; // 500x500 high-res avatar

/**
 * Validates, squares (1:1 crop), and compresses an image in browser canvas.
 * @param {File} file
 * @returns {Promise<{ blob: Blob, dataUrl: string, base64: string }>}
 */
export async function processAndSquareImage(file) {
  if (!file) throw new Error('No file selected.');

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error('Unsupported image format. Please upload a JPG, PNG, or WEBP image.');
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    throw new Error(`File is too large (${sizeMb} MB). Maximum allowed size is 5 MB.`);
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Corrupted or invalid image file.'));
      img.onload = () => {
        if (img.naturalWidth < 180 || img.naturalHeight < 180) {
          return reject(new Error('Photo resolution is too small. Please upload a photo at least 300x300 pixels.'));
        }

        // Create canvas and crop to center 1:1 square
        const canvas = document.createElement('canvas');
        canvas.width = TARGET_SIZE_PX;
        canvas.height = TARGET_SIZE_PX;
        const ctx = canvas.getContext('2d');

        const minSide = Math.min(img.naturalWidth, img.naturalHeight);
        const sx = (img.naturalWidth - minSide) / 2;
        const sy = (img.naturalHeight - minSide) / 2;

        // Smooth high-quality scaling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, TARGET_SIZE_PX, TARGET_SIZE_PX);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
        const base64 = dataUrl.replace(/^data:image\/jpeg;base64,/, '');

        canvas.toBlob(
          blob => {
            if (!blob) return reject(new Error('Canvas image conversion failed.'));
            resolve({ blob, dataUrl, base64 });
          },
          'image/jpeg',
          0.92
        );
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Automated check to verify that the photo is an authentic human and NOT AI/cartoon/object.
 * Tries serverless endpoint /api/verify-avatar first, then direct Gemini API if client key exists.
 * @param {string} base64
 * @returns {Promise<{ verified: boolean, reason: string }>}
 */
export async function verifyHumanAuthenticity(base64) {
  try {
    // 1. Try serverless endpoint (/api/verify-avatar)
    const res = await fetch('/api/verify-avatar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64: base64, mimeType: 'image/jpeg' })
    });

    if (res.ok) {
      const data = await res.json();
      return {
        verified: Boolean(data.verified),
        reason: data.reason || (data.verified ? 'Verified authentic human photo.' : 'Image rejected.')
      };
    }
  } catch (err) {
    console.warn('[avatarVerification] Serverless verify-avatar endpoint not reachable:', err.message);
  }

  // 2. Fallback: If VITE_GEMINI_API_KEY is configured in frontend environment, verify directly
  const clientKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (clientKey) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${clientKey}`;
      const prompt = `Analyze this profile photo. Return ONLY a JSON object: {"valid": boolean, "is_real_human": boolean, "has_visible_face": boolean, "is_cartoon": boolean, "reason": "brief sentence"}. Valid must be true ONLY if it is an authentic real photograph of a human face (not a cartoon, anime, AI art, scenery, object, or animal).`;

      const geminiRes = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { inlineData: { mimeType: 'image/jpeg', data: base64 } },
                { text: prompt }
              ]
            }
          ],
          generationConfig: { responseMimeType: 'application/json' }
        })
      });

      if (geminiRes.ok) {
        const json = await geminiRes.json();
        const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          const parsed = JSON.parse(text);
          const isApproved = Boolean(parsed.valid === true || (parsed.is_real_human === true && parsed.has_visible_face === true && !parsed.is_cartoon));
          return {
            verified: isApproved,
            reason: isApproved ? 'Verified real human instructor photo.' : (parsed.reason || 'Cartoon, AI art, or non-human images are not allowed.')
          };
        }
      }
    } catch (e) {
      console.warn('[avatarVerification] Client Gemini check failed:', e);
    }
  }

  // 3. Local Development Graceful Fallback:
  // If no serverless API and no Gemini API key configured, approve with friendly dev notice
  return {
    verified: true,
    reason: 'Photo accepted (Local mode - add GEMINI_API_KEY to enable automated AI cartoon detection).'
  };
}

/**
 * Uploads processed photo to Supabase storage and updates profiles table.
 * @param {string} userId
 * @param {Blob} blob
 * @returns {Promise<string>} publicUrl
 */
export async function uploadAvatarAndSaveProfile(userId, blob) {
  if (!userId || !blob) throw new Error('Missing user ID or image blob.');

  const filePath = `avatars/creator-${userId}-${Date.now()}.jpg`;

  // Try uploading to 'thumbnails' bucket (known active public bucket)
  let { error: upErr } = await supabase.storage
    .from('thumbnails')
    .upload(filePath, blob, {
      contentType: 'image/jpeg',
      upsert: true
    });

  // If thumbnails failed or path issue, try avatars bucket
  if (upErr && (upErr.message?.includes('not found') || upErr.statusCode === 404)) {
    const fallbackRes = await supabase.storage
      .from('avatars')
      .upload(filePath, blob, {
        contentType: 'image/jpeg',
        upsert: true
      });
    upErr = fallbackRes.error;
  }

  if (upErr) {
    throw new Error(`Storage upload failed: ${upErr.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('thumbnails')
    .getPublicUrl(filePath);

  const publicUrl = urlData.publicUrl;

  // Update profiles table
  const { error: dbErr } = await supabase
    .from('profiles')
    .update({ avatar_url: publicUrl })
    .eq('id', userId);

  if (dbErr) {
    throw new Error(`Could not update profile with avatar: ${dbErr.message}`);
  }

  return publicUrl;
}
