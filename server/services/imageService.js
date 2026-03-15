/**
 * Image Service — two-phase poster generation:
 * 1. Hugging Face SDXL generates the background artwork
 * 2. Sharp composites crisp event text (title, hook, venue, time) on top
 */

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const sharp = require('sharp');

const PLACEHOLDER_URL = 'https://placehold.co/768x1024/1a1a2e/ffffff?text=Event+Poster';
const HF_MODEL_URL = 'https://router.huggingface.co/hf-inference/models/stabilityai/stable-diffusion-xl-base-1.0';
const TIMEOUT_MS = 90000;

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'genloop');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const W = 768;
const H = 1024;

// ── Style modifiers ───────────────────────────────────────────────────────────
const STYLE_MODIFIERS = {
  Vibrant:     'vibrant saturated colors, bold dynamic composition, colorful gradient background, high contrast, energetic',
  Minimalist:  'clean white background, minimal elegant design, generous whitespace, simple geometric accent shapes',
  Retro:       'retro 80s synthwave aesthetic, vintage poster style, warm sunset tones, halftone dot texture, nostalgic grain',
  Futuristic:  'futuristic sci-fi aesthetic, electric neon glows, deep dark background, holographic light streaks, cyberpunk grid',
  Illustrated: 'hand-drawn illustration style, watercolor wash textures, editorial illustration, painterly artistic',
  Dark:        'dark moody cinematic background, dramatic rim lighting, deep navy and charcoal tones, sophisticated premium',
  Neon:        'neon sign glow effects, electric pink and cyan lights, dark night background, rave festival energy, glowing outlines',
};

const CATEGORY_ELEMENTS = {
  Hackathon:    'glowing laptop screens, floating code snippets, circuit board patterns, developer workspace',
  Workshop:     'hands working on project, collaborative table, tools and materials, learning environment',
  Seminar:      'elegant lecture hall, spotlight on stage, academic atmosphere',
  Competition:  'golden trophy, winners podium, achievement medals, dramatic spotlight',
  Networking:   'silhouettes connecting, professional crowd, city skyline',
  Cultural:     'vibrant cultural patterns, diverse celebration, festive colors',
  Sports:       'dynamic athletic motion blur, sports equipment, stadium energy',
  'Tech Talk':  'microphone on stage, tech conference, engaged audience',
  'Career Fair':'professional skyline, career ladder, opportunity doors',
  Other:        'university campus architecture, students in motion, academic symbols',
};

const QUALITY_BOOSTERS = 'professional graphic design, award-winning composition, 8k ultra high resolution, dramatic depth of field, studio quality lighting, print-ready quality, rule of thirds';

const NEGATIVE_PROMPT = [
  'text, letters, words, typography, writing, labels, captions, watermark, signature',
  'blurry, low quality, pixelated, jpeg artifacts',
  'ugly, deformed, distorted, bad anatomy, extra limbs',
  'duplicate elements, cluttered layout',
  'washed out colors, overexposed, underexposed',
  'nsfw, inappropriate content',
].join(', ');

function buildImagePrompt(metadata) {
  const { title, topic, category, tone, imageStyle } = metadata;
  const styleModifier = STYLE_MODIFIERS[imageStyle] || STYLE_MODIFIERS.Vibrant;
  const categoryElements = CATEGORY_ELEMENTS[category] || CATEGORY_ELEMENTS.Other;
  const toneMap = {
    Professional: 'polished corporate design, clean professional aesthetic',
    Hype:         'explosive energy, bold statement design, maximum visual impact',
    Academic:     'scholarly intellectual design, university branding, academic prestige',
  };
  const toneModifier = toneMap[tone] || toneMap.Professional;

  // Ask SD for a BACKGROUND — no text, just art
  return [
    `Event poster background artwork for "${title}"`,
    `Theme: ${topic}`,
    `Visual focus: ${categoryElements}`,
    styleModifier,
    toneModifier,
    'young university students, campus energy',
    QUALITY_BOOSTERS,
    'portrait orientation, vertical format',
    'NO text, NO words, NO letters — pure visual background only',
    'leave dark semi-transparent space at top and bottom for text overlay',
  ].join(', ');
}

// ── SVG text overlay builder ──────────────────────────────────────────────────

function escapeXml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Wrap text into lines that fit within maxChars per line.
 */
function wrapText(text, maxChars) {
  const words = String(text || '').split(' ');
  const lines = [];
  let current = '';
  for (const word of words) {
    if ((current + ' ' + word).trim().length <= maxChars) {
      current = (current + ' ' + word).trim();
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/**
 * Build an SVG overlay with event details composited on the image.
 * Layout:
 *   - Top band: dark gradient + event title (large, bold)
 *   - Middle: hook text (medium)
 *   - Bottom band: dark gradient + venue + date/time
 */
function buildTextOverlaySvg(metadata, textCopy) {
  const title = (textCopy?.title || metadata.title || 'Event').toUpperCase();
  const hook = textCopy?.shortHook || '';
  const venue = metadata.venue || '';
  const dateStr = metadata.eventDate
    ? metadata.eventDate + (metadata.eventTime ? ' · ' + metadata.eventTime : '')
    : '';

  // Title: wrap at ~18 chars per line for large font
  const titleLines = wrapText(title, 18);
  const titleFontSize = titleLines.length > 2 ? 52 : 60;
  const titleLineHeight = titleFontSize + 10;
  const titleBlockH = titleLines.length * titleLineHeight + 20;

  // Hook: wrap at ~32 chars
  const hookLines = wrapText(hook, 32);
  const hookFontSize = 26;
  const hookLineHeight = hookFontSize + 8;

  // Top band height
  const topBandH = Math.max(160, titleBlockH + 40);

  // Bottom band
  const bottomBandH = 130;
  const bottomY = H - bottomBandH;

  // Hook position — just below top band
  const hookY = topBandH + 30;

  const titleSvgLines = titleLines.map((line, i) => `
    <text
      x="${W / 2}"
      y="${60 + i * titleLineHeight}"
      font-family="Arial Black, Arial, sans-serif"
      font-size="${titleFontSize}"
      font-weight="900"
      fill="white"
      text-anchor="middle"
      dominant-baseline="hanging"
      filter="url(#textShadow)"
      letter-spacing="2"
    >${escapeXml(line)}</text>`).join('');

  const hookSvgLines = hookLines.map((line, i) => `
    <text
      x="${W / 2}"
      y="${hookY + i * hookLineHeight}"
      font-family="Arial, sans-serif"
      font-size="${hookFontSize}"
      font-weight="700"
      fill="#FFE066"
      text-anchor="middle"
      dominant-baseline="hanging"
      filter="url(#textShadow)"
    >${escapeXml(line)}</text>`).join('');

  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Drop shadow for all text -->
    <filter id="textShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="2" dy="2" stdDeviation="4" flood-color="rgba(0,0,0,0.9)" flood-opacity="1"/>
    </filter>
    <!-- Top gradient band -->
    <linearGradient id="topGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(0,0,0,0.92)"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0)"/>
    </linearGradient>
    <!-- Bottom gradient band -->
    <linearGradient id="bottomGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(0,0,0,0)"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0.95)"/>
    </linearGradient>
  </defs>

  <!-- Top dark band -->
  <rect x="0" y="0" width="${W}" height="${topBandH + 40}" fill="url(#topGrad)"/>

  <!-- Bottom dark band -->
  <rect x="0" y="${bottomY - 40}" width="${W}" height="${bottomBandH + 40}" fill="url(#bottomGrad)"/>

  <!-- Title lines -->
  ${titleSvgLines}

  <!-- Hook lines -->
  ${hookSvgLines}

  <!-- Divider line above bottom info -->
  <line x1="40" y1="${bottomY + 10}" x2="${W - 40}" y2="${bottomY + 10}" stroke="rgba(255,255,255,0.4)" stroke-width="1"/>

  <!-- Venue -->
  ${venue ? `<text
    x="44"
    y="${bottomY + 28}"
    font-family="Arial, sans-serif"
    font-size="22"
    font-weight="700"
    fill="white"
    dominant-baseline="hanging"
    filter="url(#textShadow)"
  >📍 ${escapeXml(venue)}</text>` : ''}

  <!-- Date & Time -->
  ${dateStr ? `<text
    x="44"
    y="${bottomY + 64}"
    font-family="Arial, sans-serif"
    font-size="22"
    font-weight="700"
    fill="#FFE066"
    dominant-baseline="hanging"
    filter="url(#textShadow)"
  >🗓 ${escapeXml(dateStr)}</text>` : ''}
</svg>`;
}

// ── Main export ───────────────────────────────────────────────────────────────

async function generatePoster(imagePromptOrMetadata, textCopy) {
  const token = process.env.HF_API_TOKEN;

  // Resolve metadata
  const metadata = typeof imagePromptOrMetadata === 'string'
    ? { title: '', topic: imagePromptOrMetadata, imageStyle: 'Vibrant', tone: 'Professional' }
    : imagePromptOrMetadata;

  const imagePrompt = typeof imagePromptOrMetadata === 'string'
    ? imagePromptOrMetadata
    : buildImagePrompt(metadata);

  let bgBuffer = null;

  if (token) {
    try {
      console.log('[ImageService] Generating background art:', imagePrompt.slice(0, 100));

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const response = await fetch(HF_MODEL_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: imagePrompt,
          parameters: {
            negative_prompt: NEGATIVE_PROMPT,
            num_inference_steps: 40,
            guidance_scale: 9.0,
            width: W,
            height: H,
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (response.ok) {
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('image')) {
          const arrayBuffer = await response.arrayBuffer();
          bgBuffer = Buffer.from(arrayBuffer);
          console.log('[ImageService] Background art received:', bgBuffer.byteLength, 'bytes');
        } else {
          const txt = await response.text().catch(() => '');
          console.warn('[ImageService] Unexpected content-type:', contentType, txt.slice(0, 200));
        }
      } else {
        const errText = await response.text().catch(() => '');
        console.warn('[ImageService] HF API error:', response.status, errText.slice(0, 300));
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        console.warn('[ImageService] HF API timed out after', TIMEOUT_MS / 1000, 's');
      } else {
        console.warn('[ImageService] generatePoster failed:', err.message);
      }
    }
  } else {
    console.warn('[ImageService] HF_API_TOKEN not set — using gradient background');
  }

  // ── Phase 2: composite text overlay with Sharp ────────────────────────────
  try {
    const svgOverlay = buildTextOverlaySvg(metadata, textCopy);
    const svgBuffer = Buffer.from(svgOverlay);

    let baseImage;
    if (bgBuffer) {
      // Resize SD output to exact dimensions, then composite SVG
      baseImage = sharp(bgBuffer).resize(W, H, { fit: 'cover', position: 'centre' });
    } else {
      // Fallback: generate a styled gradient background using Sharp
      const style = metadata.imageStyle || 'Vibrant';
      const gradients = {
        Vibrant:     { r: 30, g: 10, b: 80 },
        Minimalist:  { r: 245, g: 245, b: 245 },
        Retro:       { r: 60, g: 20, b: 40 },
        Futuristic:  { r: 5, g: 5, b: 30 },
        Illustrated: { r: 240, g: 230, b: 210 },
        Dark:        { r: 10, g: 10, b: 20 },
        Neon:        { r: 5, g: 0, b: 20 },
      };
      const { r, g, b } = gradients[style] || gradients.Vibrant;
      baseImage = sharp({
        create: { width: W, height: H, channels: 3, background: { r, g, b } },
      });
    }

    const finalBuffer = await baseImage
      .composite([{ input: svgBuffer, top: 0, left: 0 }])
      .jpeg({ quality: 92 })
      .toBuffer();

    const filename = `${uuidv4()}.jpg`;
    const filepath = path.join(UPLOAD_DIR, filename);
    fs.writeFileSync(filepath, finalBuffer);
    const fileUrl = `/uploads/genloop/${filename}`;
    console.log('[ImageService] Final poster saved:', fileUrl, `(${finalBuffer.byteLength} bytes)`);
    return { url: fileUrl, fallback: !bgBuffer };

  } catch (sharpErr) {
    console.error('[ImageService] Sharp compositing failed:', sharpErr.message);
    return { url: PLACEHOLDER_URL, fallback: true };
  }
}

module.exports = { generatePoster, buildImagePrompt };
