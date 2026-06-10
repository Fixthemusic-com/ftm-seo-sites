# Hero Venue Search — UX Review & Plan
Date: 2026-06-10

## Trello Epic
https://trello.com/c/CcnHd7G7

## UX Philosophy
We have venue intelligence that **nobody else on the internet has** — real booking stats, musician reviews, music budgets, curfews, and music preferences from thousands of actual weddings. The hero search should feel like peeking behind the curtain, not browsing a directory.

## Three States

### 1. Pre-Search (Empty Hero)
- **"Where will your wedding be?"** — big heading
- Subtitle: "Real data from thousands of Italian weddings"
- Prominent search with Google Places Autocomplete (no type restriction — venue names AND cities)
- 3-4 popular venue pills with teaser stats: "Castello di Vincigliata — 12 bands · €2.5k–€4k"
- Ambient trust: "Data from 3,000+ real weddings across Italy"

### 2. EXACT MATCH — Venue Intelligence Reveal
When the user picks a venue from autocomplete and the API returns 200:

**Immersive backdrop**: First Google Places photo fades in behind the hero

**Stats cluster** (the exclusive data):
- 🎵 "{unique_band_count} bands have performed here"
- 💰 "Typical music budget: €{price_range_low} – €{price_range_high}"
- 🕐 "Curfew: {curfew_time}"
- 👥 "Usually {guest_count_median} guests"
- 📅 "Peak: {peak_months}"

**Musician's voice**: Best review quote or `notable_quotes[0]`:
> "The courtyard acoustics are incredible and the sunset is unforgettable"
> — from [Band Name], Sep 2024

**Music categories**: Pills from `top_categories` — Jazz 45%, Pop/Rock 30%, Classical 15%

**Band showcase**: 2-3 band cards with PHOTOS from `top_bands` (faces sell)

**Proof**: "Based on {booking_count} real weddings at this venue"

**CTAs**: "See all bands matched to this venue" → /venues/{slug}/ | "Get a tailored quote" → /enquire/

**Reset**: X button to dismiss and search again

### 3. NO MATCH — Inline Nearby Bands
When API returns 404 (venue not in our ~235 profiles):

**NOT a redirect** — inline results:
- "We don't have specific data on that venue yet"
- "Here are bands near {location}:"
- 3-4 band cards with photos (from location-filtered API)
- "Explore all bands" → /browse/?location={place_id}
- "Get a personalised recommendation" → /enquire/
- Reset button to try another venue

### Free Text (no autocomplete selection)
Enter key → /browse/?search={query}

## Technical Architecture

### Backend
- `GET /api-v2/venues/by-place-id/{place_id}/` — new endpoint, VenueProfileOut schema, 404 on miss
- VenueProfile.place_id already exists (unique, CharField(512), indexed)
- Auth: ExternalSiteTokenAuth (existing pattern)

### Frontend
- Replace hero in `src/pages/index.astro`
- New component: `src/components/HeroVenueSearch.astro` (client-side state machine)
- Google Places Autocomplete with NO type restriction (unlike browse page which uses `(regions)`)
- Parallel fetch: venue detail + first review (for quote)

### Data Fields Available (all in VenueProfileOut)
| Category | Fields for Hero |
|----------|----------------|
| Identity | canonical_name, slug, formatted_address |
| Stats | unique_band_count, booking_count |
| Pricing | price_range_low, price_range_high, price_currency |
| Curfew | curfew_time, curfew_notes |
| Guests | guest_count_median, guest_count_min, guest_count_max |
| Season | peak_months |
| Music | top_categories (dict → pills) |
| Bands | top_bands (array → cards with photos) |
| Photos | google_photos[0] → backdrop |
| Reviews | notable_quotes[0] or first review text |

### Autocomplete Config Difference from Browse Page
```js
// Browse page: cities/regions only
{ types: ['(regions)'], componentRestrictions: { country: 'it' } }

// Hero: venues AND regions
{ componentRestrictions: { country: 'it' } }
// NO types restriction — lets venue names like "Castello di Vincigliata" appear
// Additional fields: ['place_id', 'formatted_address', 'name', 'photos']
```

## Cards
1. **P1** Backend — venue lookup by place_id: https://trello.com/c/PJZEnfYY
2. **P1** Frontend — Hero search + 3-state intelligence reveal: https://trello.com/c/FgClZ3gu
3. ~~P2 Venue result preview~~ → merged into card 2
4. **P2** No-match inline band showcase: https://trello.com/c/VH1n8Qg4
5. **P3** Popular venue pills + ambient credibility: https://trello.com/c/JPksU9FM
