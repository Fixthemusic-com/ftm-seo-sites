# WBI Technical SEO & Authority Building Plan

**Date:** 2026-06-10
**Site:** weddingbandsitaly.co.uk (staging: staging.weddingbandsitaly.pages.dev)
**Status:** Production intentionally inert (404 placeholder). All work done on staging.

## Goal
Fix all technical SEO issues, build authority signals, and prepare the site for a successful production launch.

---

## Phase 1: Technical SEO Foundation (P0 — Do Before Launch)

### 1.1 Organization Schema on Homepage
Add `Organization` JSON-LD to `src/pages/index.astro`:
```json
{
  "@type": "Organization",
  "name": "Wedding Bands Italy",
  "url": "https://weddingbandsitaly.co.uk",
  "logo": "/images/logo.png",
  "description": "Curated directory of verified wedding bands performing at Italian wedding venues",
  "foundingDate": "2026",
  "parentOrganization": { "@type": "Organization", "name": "FixTheMusic", "url": "https://www.fixthemusic.com" },
  "sameAs": []
}
```
**File:** `src/pages/index.astro`

### 1.2 Fix Missing Assets
- **OG image**: Create `public/images/og-wbi.jpg` (1200×630px, wedding band branding). Referenced in `BaseLayout.astro:42` but doesn't exist.
- **Favicon**: Create `public/favicon.svg` — referenced in `BaseLayout.astro` but missing.

### 1.3 Fix VenueReviews Standalone AggregateRating
`VenueReviews.astro:42-49` emits `AggregateRating` as a top-level `@type`. Schema.org requires it as a property of `Place` or `MusicGroup`. Remove the standalone block — the parent venue's `Place` schema already has it.
**File:** `src/components/VenueReviews.astro`

### 1.4 Fix Venue Breadcrumb Mismatch
`venues/[slug].astro:175` — JSON-LB breadcrumb says "Locations" but visual breadcrumb says "Venues". Align schema to match visual: `Home > Venues > [Venue Name]`.
**File:** `src/pages/venues/[slug].astro`

### 1.5 Fix robots.txt
Remove the hardcoded second sitemap URL (WMBI is deprecated). Use only the current site's sitemap.
**File:** `public/robots.txt`

### 1.6 Add FAQPage Schema to Location Pages
Location MDX files have FAQ sections (e.g. "## Frequently Asked Questions") but `LocationLayout.astro` doesn't extract FAQPage schema from them. Add the same `faqHtml`→schema parsing used in band blog templates.
**File:** `src/layouts/LocationLayout.astro`

### 1.7 Add JSON-LD to Blog Index and Venues Index
- Blog index (`src/pages/blog/index.astro`): Add `CollectionPage` + `BreadcrumbList`
- Venues index (`src/pages/venues/index.astro`): Add `BreadcrumbList` (currently missing — only has `CollectionPage`)

### 1.8 Set trailingSlash in astro.config.mjs
Add `trailingSlash: 'always'` to match the `build.format: 'directory'` setting and match Cloudflare's default behavior.
**File:** `astro.config.mjs`

### 1.9 Performance Hints
- Add `<link rel="preload">` for Google Fonts CSS
- Add `<link rel="dns-prefetch">` for `image.mux.com`, `stream.mux.com`
- Add `fetchpriority="high"` and `loading="eager"` to band profile hero images (LCP candidates)
- Add `loading="eager"` to venue detail hero photo (first in bento grid)
**File:** `src/layouts/BaseLayout.astro`, `src/pages/bands/[slug].astro`, `src/pages/venues/[slug].astro`

---

## Phase 2: Internal Linking & Cross-Connection (P1)

### 2.1 Band Pages → Region/Venue Links
Band pages currently link to ZERO venues or location pages. Add:
- "Popular venues in [region]" section with links to top 3 venues in the band's home region
- Link to the relevant location page from band hero section
**File:** `src/pages/bands/[slug].astro`

### 2.2 Venue Pages → Location Page Back-links
Venue detail pages link to bands but NOT back to the region's location page. Add:
- "Explore [region] wedding guide" link in the CTA section
- Breadcrumb: "Venues" crumb should link to `/venues/by-region/{slug}/`
**File:** `src/pages/venues/[slug].astro`

### 2.3 Blog Posts → Venue/Band/Location Cross-links
Blog posts are currently siloed. Add contextual links:
- Pricing guide → link to specific venue pages as examples
- Hiring guide → link to relevant band profiles and location pages
- Add "Related Reading" section to BlogPostLayout
**Files:** `src/layouts/BlogPostLayout.astro`, blog MDX files

### 2.4 Footer — Add Missing Locations
Add all 12 location links (currently only 6). Add About, Privacy Policy, and Terms links.
**File:** `src/layouts/BaseLayout.astro`

### 2.5 Article Meta Tags for Blog Posts
Add `article:published_time`, `article:modified_time`, `article:author` meta tags to blog posts.
**File:** `src/layouts/BlogPostLayout.astro`

---

## Phase 3: Content & Authority (P2)

### 3.1 About Page
Create `/about/` with:
- Team editorial voice (who curates this site)
- FixTheMusic relationship (backed by the platform since 2018, 734+ verified acts)
- Verification process (how bands are vetted)
- Named team members with bios and photos
- Physical address, contact email
**New file:** `src/pages/about/index.astro`

### 3.2 FixTheMusic Backlinks (Two-pronged)
**A. Band Profile Badge** — On FTM band profiles that are in WBI, add "🇮🇹 Also featured on Wedding Bands Italy" with contextual link. Scalable across 351+ band profiles.
**B. Editorial Blog Post** — Publish on FTM's blog: "Behind the scenes: curating Tuscany's wedding music" or similar. Authoritative editorial link back to WBI.
**Owner:** FTM platform team

### 3.3 Privacy Policy & Terms of Service
Essential trust signals. Can be simple templates.
**New files:** `src/pages/privacy/index.astro`, `src/pages/terms/index.astro`

### 3.4 Expand Blog (5+ new posts)
Target high-intent keywords:
1. "SIAE Music License Italy — Complete Guide" (regulatory, unique content)
2. "10 Best Wedding Venues in Tuscany with Live Music" (venue + band cross-linking SEO)
3. "Band vs DJ for Italian Weddings" (comparison content)
4. "How to Choose a Wedding Band in [Region]" — 12 regional guides
5. "Italian Wedding Music Traditions" (cultural angle, backlinks from wedding blogs)
6. "Wedding Band Pricing by Region — Tuscany vs Amalfi vs Lake Como"
**Directory:** `src/content/blog/`

### 3.5 Better Author Attribution
Replace generic "Editorial Team" with named personas:
- "The WBI Editorial Team" with a named editor and bio
- Guest contributors (wedding planners, venue managers) for credibility
**File:** Blog MDX frontmatter, `BlogPostLayout.astro`

### 3.6 Hero Images for Social Sharing
Generate branded OG images per band/venue/location page. Even template-based (name + background + branding) beats the default image.
**File:** `src/components/OpenGraphImage.astro` + Cloudflare Image Resizing or build-time generation

---

## Phase 4: Launch Preparation (P0 at Launch Time)

### 4.1 Google Search Console Setup
- Verify ownership of `weddingbandsitaly.co.uk`
- Submit `sitemap-index.xml`
- Submit individual sitemaps
- Monitor crawl errors and indexing status

### 4.2 Google Analytics (Privacy-Friendly)
- Plausible or Umami (self-hosted) — no cookie banners needed
- Track: page views, entry pages, referral sources, search queries

### 4.3 hreflang Tags
Add `<link rel="alternate" hreflang="en-gb" href="...">` to all pages. Target audience is UK couples planning Italian weddings.
**File:** `src/layouts/BaseLayout.astro`

### 4.4 404 Page
Create `src/pages/404.astro` for graceful user experience on broken URLs.

---

## Current State Summary

| Category | Score | Notes |
|----------|-------|-------|
| Structured Data | 7/10 | Good coverage but invalid AggregateRating, missing Organization, breadcrumbs mismatched |
| Meta Tags | 9/10 | Comprehensive OG/Twitter but missing article: meta, no og:image asset |
| Sitemap & robots.txt | 7/10 | Working but hardcoded dual sitemap URLs |
| Internal Linking | 4/10 | Major gaps — band/venue/blog silos |
| Content Depth | 6/10 | 12 location pages + 235 venues + 351 bands but only 3 blog posts |
| Authority / E-E-A-T | 2/10 | No About, generic authors, no FTM backlinks yet |
| Performance | 6/10 | Static SSG (fast) but no preload/prefetch/fetchpriority hints |
| Mobile/UX | 8/10 | Responsive design, good typography |
| **Overall** | **6/10** | **Strong foundation, needs authority + linking work** |

## Priority Order for Implementation

1. Phase 1 items (technical fixes) — 1-2 days
2. Phase 3.1 About page — 0.5 days
3. Phase 3.2 FTM backlinks — 0.5 days (coordination)
4. Phase 2 items (internal linking) — 1 day
5. Phase 3.3-3.6 (content + authority) — 2-3 days
6. Phase 4 (launch prep) — at launch time
