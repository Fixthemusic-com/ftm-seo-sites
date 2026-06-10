# Hero Venue Search Plan
Date: 2026-06-10

## Trello Epic
https://trello.com/c/CcnHd7G7

## Goal
Add a prominent search field to the SEO site homepage hero section.
"Where will your wedding be?" with placeholder "Enter a venue name or city or region"

## Flow
1. User types venue name, city, or region
2. Google Places Autocomplete suggests matches
3. On selection:
   - Fetch `GET /api-v2/venues/by-place-id/{place_id}/`
   - **Exact match (200)**: Show inline venue result card with photo, name, band count, reviews, music categories, CTAs
   - **No match (404)**: Redirect to `/browse/?location={place_id}&location_text={name}` showing nearby bands
4. Free text (no autocomplete selection): redirect to `/browse/?search={query}`

## Cards
1. **P1** Backend — venue lookup by place_id: https://trello.com/c/PJZEnfYY
2. **P1** Frontend — Hero search component: https://trello.com/c/FgClZ3gu
3. **P2** Frontend — Venue result preview card: https://trello.com/c/mLuoZDzE
4. **P2** Frontend — No-match flow: https://trello.com/c/VH1n8Qg4
5. **P3** Frontend — Popular venue suggestions and polish: https://trello.com/c/JPksU9FM

## Technical Notes
- `VenueProfile.place_id` already exists (unique field, Google Places ID)
- No existing API endpoint looks up by place_id — new one needed
- Browse page already uses Google Places Autocomplete with `(regions)` type
- Hero search needs NO type restriction (to include venue names, not just cities)
- ~235 VenueProfiles currently exist (5+ bookings) — coverage will grow with venue expansion
- Google API key already configured: `PUBLIC_NEXT_PUBLIC_GOOGLE_API_KEY`
