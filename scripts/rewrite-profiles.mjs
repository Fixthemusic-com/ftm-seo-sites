#!/usr/bin/env node
/**
 * Rewrite band profiles per site using DeepSeek for unique SEO content.
 * 
 * Usage:
 *   SITE_ID=weddingbandsitaly OPENROUTER_API_KEY=sk-... node scripts/rewrite-profiles.mjs
 * 
 * Reads from FTM V2 API, rewrites via DeepSeek, caches to src/data/profiles-{siteId}.json.
 * Only rewrites bands not already in cache (incremental).
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// Config
const SITE_ID = process.env.SITE_ID || 'weddingbandsitaly';
const API_BASE = process.env.FTM_API_BASE || 'https://staging.fixthemusic.com';
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = 'deepseek/deepseek-v4-flash:nitro';
const REGION_ID = 2221; // Italy
const CONCURRENCY = 15;
const CACHE_FILE = join(ROOT, 'src', 'data', `profiles-${SITE_ID}.json`);

const SITE_TONES = {
  weddingbandsitaly: {
    name: 'Wedding Bands Italy',
    tone: `Premium and luxurious. Use elegant, sophisticated language. Words like "exquisite", "bespoke", "curated", "refined", "impeccable". Frame everything as a luxury experience. Emphasize exclusivity and quality.`,
  },
  weddingmusicbanditaly: {
    name: 'Wedding Music Band Italy',
    tone: `Warm, inclusive, and enthusiastic. Use inviting, accessible language. Words like "amazing", "unforgettable", "perfect", "incredible", "vibrant". Frame everything as a joyful celebration. Emphasize variety and fun.`,
  },
};

const siteConfig = SITE_TONES[SITE_ID];
if (!siteConfig) {
  console.error(`Unknown SITE_ID: ${SITE_ID}`);
  process.exit(1);
}

if (!OPENROUTER_KEY) {
  console.error('OPENROUTER_API_KEY required');
  process.exit(1);
}

// Load existing cache
let cache = {};
if (existsSync(CACHE_FILE)) {
  try {
    cache = JSON.parse(readFileSync(CACHE_FILE, 'utf-8'));
    console.log(`Loaded cache: ${Object.keys(cache).length} entries`);
  } catch {
    cache = {};
  }
}

function saveCache() {
  writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}

// API helpers
async function apiFetch(path) {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  return res.json();
}

async function getAllBandSlugs() {
  const slugs = [];
  let page = 1;
  let hasMore = true;
  while (hasMore) {
    const res = await apiFetch(`/api-v2/bands?home_region=${REGION_ID}&page=${page}&page_size=100`);
    slugs.push(...res.items.map(b => b.slug));
    hasMore = slugs.length < res.count;
    page++;
  }
  return slugs;
}

async function getBandProfile(slug) {
  try {
    return await apiFetch(`/api-v2/bands/${slug}/profile`);
  } catch {
    return null;
  }
}

async function rewriteWithLLM(slug, profile) {
  const original = [
    profile.intro_rendered || '',
    profile.description_rendered || '',
  ].filter(Boolean).join('\n\n');

  if (!original.trim()) return null;

  const prompt = `You are rewriting a wedding band profile for the website "${siteConfig.name}".

TONE: ${siteConfig.tone}

RULES:
- Rewrite the text in your own words with the specified tone
- Keep ALL factual details: band name, location, instruments, song names, experience, pricing
- Change the framing, adjectives, sentence structure, and flow
- Output valid HTML (use <p>, <strong>, <ul>/<li> tags as appropriate)
- Do NOT add information that wasn't in the original
- Do NOT include any preamble or explanation, just output the rewritten HTML
- Keep roughly the same length as the original
- If the original has distinct sections (intro paragraph + longer description), maintain that split using a blank line between them
- REMOVE all hyperlinks (<a> tags). Keep the visible link text but strip the <a> wrapper entirely
- REMOVE entire sections about "Similar Bands", "Also appreciated", or cross-promotion of other bands
- REMOVE any mentions of FixTheMusic, fixthemusic.com, or being "listed on" / "featured on" FixTheMusic
- REMOVE "Contact [Band Name]" call-to-action lines and "Follow us on Facebook" lines
- REMOVE "Browse our full collection/portfolio" lines
- REMOVE references to "Best Wedding Bands" lists (e.g. "20 Best Jazz Bands in Italy")

ORIGINAL TEXT:
${original}`;

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2000,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`LLM ${res.status}: ${err}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) return null;

  // Post-processing: strip any remaining links and FTM references the LLM missed
  function cleanHtml(html) {
    // Strip <a> tags, keep inner text
    html = html.replace(/<a\s[^>]*>(.*?)<\/a>/gi, '$1');
    // Remove entire "Similar Bands" / cross-promo sections (heading + list + trailing line)
    html = html.replace(/<(h[2-4]|p|strong)[^>]*>[^<]*(similar\s+bands|also\s+appreciated|also\s+enjoyed|you\s+may\s+also\s+like)[^<]*<\/\1>\s*(<ul>[\s\S]*?<\/ul>)?\s*(<p>[^<]*(browse|collection|portfolio)[^<]*<\/p>)?/gi, '');
    // Remove standalone "Browse our collection/portfolio" lines
    html = html.replace(/<p>[^<]*(browse\s+(our|the)\s+(full\s+)?(collection|portfolio))[^<]*<\/p>/gi, '');
    // Remove "Best Wedding Bands" list references
    html = html.replace(/<p>[^<]*\d+\s+best\s+(wedding\s+)?bands[^<]*<\/p>/gi, '');
    // Remove lines mentioning fixthemusic (case insensitive, also catches partial matches)
    html = html.replace(/<p>[^<]*fix\s*the\s*music[^<]*<\/p>/gi, '');
    html = html.replace(/<li>[^<]*fix\s*the\s*music[^<]*<\/li>/gi, '');
    // Remove leftover URLs pointing to fixthemusic
    html = html.replace(/https?:\/\/[^\s<"']*fixthemusic[^\s<"']*/gi, '');
    // Remove "Contact [Name]" CTA lines
    html = html.replace(/<p>[^<]*contact\s+(us|them|the\s+band)[^<]*<\/p>/gi, '');
    // Remove "Follow us on Facebook" / social media lines
    html = html.replace(/<p>[^<]*follow\s+(us\s+)?on\s+facebook[^<]*<\/p>/gi, '');
    html = html.replace(/<p>[^<]*(found\s+on|follow\s+on|check\s+(us\s+)?(out\s+)?on)\s+(facebook|instagram|twitter|youtube)[^<]*<\/p>/gi, '');
    // Remove empty list items, then empty lists
    html = html.replace(/<li>\s*<\/li>/g, '');
    html = html.replace(/<ul>\s*<\/ul>/g, '');
    // Remove empty paragraphs
    html = html.replace(/<p>\s*<\/p>/g, '');
    // Collapse multiple newlines
    html = html.replace(/\n{3,}/g, '\n\n');
    return html.trim();
  }

  // Split into intro + description at the first blank line or after first </p>
  const parts = text.split(/\n\n+/);
  let introHtml, descHtml;
  if (parts.length >= 2) {
    introHtml = parts[0];
    descHtml = parts.slice(1).join('\n\n');
  } else {
    introHtml = text;
    descHtml = '';
  }

  return { introHtml: cleanHtml(introHtml), descHtml: cleanHtml(descHtml) };
}

// Process bands with concurrency control
async function processBatch(slugs) {
  const results = [];
  for (let i = 0; i < slugs.length; i += CONCURRENCY) {
    const batch = slugs.slice(i, i + CONCURRENCY);
    const promises = batch.map(async (slug) => {
      try {
        const profile = await getBandProfile(slug);
        if (!profile) {
          console.log(`  [${i + batch.indexOf(slug) + 1}/${slugs.length}] ${slug}: no profile, skipping`);
          return;
        }

        const rewritten = await rewriteWithLLM(slug, profile);
        if (!rewritten) {
          console.log(`  [${i + batch.indexOf(slug) + 1}/${slugs.length}] ${slug}: empty content, skipping`);
          return;
        }

        cache[slug] = {
          intro_html: rewritten.introHtml,
          description_html: rewritten.descHtml,
          set_list_html: profile.set_list_rendered || '',
          faq_html: profile.faq_rendered || '',
          rewritten_at: new Date().toISOString(),
        };

        console.log(`  [${i + batch.indexOf(slug) + 1}/${slugs.length}] ${slug}: ✓ rewritten`);
      } catch (err) {
        console.error(`  [${i + batch.indexOf(slug) + 1}/${slugs.length}] ${slug}: ✗ ${err.message}`);
      }
    });
    await Promise.all(promises);

    // Save after each batch
    saveCache();
  }
}

// Main
async function main() {
  console.log(`\nRewriting profiles for: ${siteConfig.name} (${SITE_ID})`);
  console.log(`Model: ${MODEL}`);
  console.log(`API: ${API_BASE}`);
  console.log(`Cache: ${CACHE_FILE}\n`);

  console.log('Fetching band slugs...');
  const allSlugs = await getAllBandSlugs();
  console.log(`Found ${allSlugs.length} bands`);

  // Filter to only uncached
  const uncached = allSlugs.filter(s => !cache[s]);
  console.log(`Need to rewrite: ${uncached.length} (${allSlugs.length - uncached.length} cached)\n`);

  if (uncached.length === 0) {
    console.log('All profiles already cached. Done!');
    return;
  }

  await processBatch(uncached);
  saveCache();

  console.log(`\nDone! Cache has ${Object.keys(cache).length} entries.`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
