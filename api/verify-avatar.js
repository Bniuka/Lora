// Vercel Serverless Function: Automated AI Verification for Instructor Profile Photos
// Verifies that the uploaded photo is an authentic human instructor and NOT a cartoon, anime, AI art, object, or scenery.

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const { imageBase64, mimeType = 'image/jpeg' } = req.body || {};

    if (!imageBase64) {
      return res.status(400).json({
        success: false,
        verified: false,
        reason: 'No image data provided for verification.'
      });
    }

    // Strip base64 prefix if passed (e.g. data:image/jpeg;base64,...)
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

    if (!apiKey) {
      // Graceful fallback for local development without API key
      console.warn('[verify-avatar] GEMINI_API_KEY not configured. Bypassing AI verification in dev mode.');
      return res.status(200).json({
        success: true,
        verified: true,
        confidence: 1.0,
        reason: 'Image accepted (Local development bypass - GEMINI_API_KEY not configured).',
        devBypass: true
      });
    }

    // Call Google Gemini 2.5 Flash for multimodal vision verification
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const promptText = `
You are an expert trust & safety verification auditor for an educational platform where instructors teach courses.
Learners require authentic human instructors to verify credibility and trust.

Analyze this uploaded profile picture strictly against these criteria:
1. Is it a real photograph of an actual living human person (NOT a cartoon, anime drawing, sketch, 3D CGI render, digital painting, video game character, or meme)?
2. Is at least one real human face clearly visible and recognizable as an instructor headshot/portrait?
3. Is it NOT an inanimate object, animal, scenery/landscape, car, abstract graphic, or company logo?
4. Is it NOT clearly synthetic/AI-generated fantasy art (e.g. Midjourney stylized fantasy art or deepfake avatar)?

Return ONLY valid JSON matching this schema:
{
  "valid": true or false,
  "is_real_human": true or false,
  "has_visible_face": true or false,
  "is_cartoon_or_illustration": true or false,
  "is_ai_art_or_synthetic": true or false,
  "is_object_or_animal": true or false,
  "confidence": number between 0.0 and 1.0,
  "reason": "Clear 1-sentence explanation of why it was approved or why it was rejected"
}
`;

    const requestBody = {
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: mimeType,
                data: cleanBase64
              }
            },
            {
              text: promptText
            }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1
      }
    };

    const apiResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!apiResponse.ok) {
      const errText = await apiResponse.text();
      console.error('[verify-avatar] Gemini API error:', apiResponse.status, errText);
      return res.status(502).json({
        success: false,
        verified: false,
        reason: 'AI verification service temporarily unavailable. Please try again shortly.'
      });
    }

    const data = await apiResponse.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!candidateText) {
      return res.status(500).json({
        success: false,
        verified: false,
        reason: 'Unable to analyze image content.'
      });
    }

    let parsed;
    try {
      parsed = JSON.parse(candidateText);
    } catch {
      // If response had markdown fences
      const clean = candidateText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
      parsed = JSON.parse(clean);
    }

    const isApproved = Boolean(
      parsed.valid === true ||
      (parsed.is_real_human === true && parsed.has_visible_face === true && !parsed.is_cartoon_or_illustration && !parsed.is_object_or_animal)
    );

    return res.status(200).json({
      success: true,
      verified: isApproved,
      details: parsed,
      reason: isApproved
        ? 'Verified authentic human instructor photo.'
        : (parsed.reason || 'Image does not appear to be an authentic real human photograph.')
    });

  } catch (error) {
    console.error('[verify-avatar] Handler error:', error);
    return res.status(500).json({
      success: false,
      verified: false,
      reason: error.message || 'Internal server error while verifying photo.'
    });
  }
}
