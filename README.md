# ftm-seo-sites

Static SEO landing sites for [FixTheMusic](https://www.fixthemusic.com), powered by [Astro](https://astro.build/) and deployed to [Cloudflare Pages](https://pages.cloudflare.com/).

## Sites

| Site | Domain | Positioning |
|------|--------|-------------|
| Wedding Bands Italy | [weddingbandsitaly.co.uk](https://weddingbandsitaly.co.uk) | Premium/luxury wedding bands |
| Wedding Music Band Italy | [weddingmusicbanditaly.co.uk](https://weddingmusicbanditaly.co.uk) | Broader wedding music & entertainment |

Both sites share the same codebase but have different branding, content positioning, and editorial tone. They pull band data from FTM's V2 API at build time (SSG).

## Quick Start

```bash
# Install dependencies
npm install

# Dev server (defaults to weddingbandsitaly)
npm run dev

# Dev server for the other site
SITE_ID=weddingmusicbanditaly npm run dev

# Build
SITE_ID=weddingbandsitaly npm run build

# Preview built site
npm run preview
```

## Environment Variables

Copy `.env.example` to `.env` and fill in:

| Variable | Description |
|----------|-------------|
| `SITE_ID` | Which site to build (`weddingbandsitaly` or `weddingmusicbanditaly`) |
| `FTM_API_BASE` | FTM API URL (staging: `https://staging.fixthemusic.com`, prod: `https://www.fixthemusic.com`) |
| `FTM_SITE_TOKEN` | Bearer token for enquiry submission (from `ExternalSiteToken` in Django) |
| `PUBLIC_FTM_API_BASE` | Same as above but available client-side |
| `PUBLIC_FTM_SITE_TOKEN` | Same as above but available client-side |

## Architecture

```
sites/                          # Per-site configuration
  weddingbandsitaly.config.ts
  weddingmusicbanditaly.config.ts
src/
  components/                   # Shared Astro components
  layouts/                      # Page layouts
  lib/
    api.ts                      # V2 API client (build-time + client-side)
    config.ts                   # Site config loader
    types.ts                    # TypeScript types
  pages/
    index.astro                 # Homepage
    browse.astro                # Browse/search page
    bands/[slug].astro          # Band profile (SSG)
    enquire/index.astro         # Enquiry form
```

## Deployment

Deployed automatically via GitHub Actions on push to `main` (production) or `staging`.

- **Production**: `main` branch -> apex domains
- **Staging**: `staging` branch -> `staging.*` subdomains
- **Nightly rebuild**: 4am UTC cron to pick up new band data

## API Endpoints Used

All V2 async Ninja endpoints -- zero V1 calls:

| Endpoint | Usage |
|----------|-------|
| `GET /api-v2/geography/regions/{slug}` | Region data + categories |
| `GET /api-v2/bands?region=2221` | Band listing with filters |
| `GET /api-v2/bands/{slug}` | Band detail |
| `GET /api-v2/bands/{slug}/photos` | Band photos |
| `GET /api-v2/bands/{slug}/videos` | Band videos |
| `GET /api-v2/bands/{slug}/reviews` | Band reviews |
| `GET /api-v2/bands/{slug}/related_bands` | Related bands |
| `GET /api-v2/bands/recently_booked` | Homepage featured bands |
| `GET /api-v2/band_categories/` | Category list |
| `POST /api-v2/booking/external/enquiries/` | Enquiry submission (client-side) |
