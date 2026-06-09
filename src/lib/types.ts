// Site configuration type
export interface SiteConfig {
  id: string;
  name: string;
  domain: string;
  tagline: string;
  description: string;
  regionId: number;
  regionSlug: string;

  theme: {
    primaryColor: string;
    primaryDarkColor: string;
    accentColor: string;
    surfaceColor: string;
    surfaceDarkColor: string;
    headingFont: string;
    bodyFont: string;
  };

  locale: string;
  ogImage: string;
  sourceSite: string;

  hero: {
    title: string;
    subtitle: string;
    ctaText: string;
    ctaLink: string;
  };

  footer: {
    about: string;
  };
}

// API response types (V2 Ninja endpoints) — matches actual API schema

export interface BandPhoto {
  uri: string;
  small: string;
  medium: string;
  large: string;
  thumbhash: string;
  vertical_align: string | null;
  offset_x: number | null;
  offset_y: number | null;
  order: number;
}

export interface BandVideo {
  aspect_ratio: number;
  duration: number;
  thumbnail_url: string;
  thumbnail_external_url: string;
  title: string;
  source: string;
  external_id: string;
  mux_id: string;
}

export interface Band {
  id: number;
  name: string;
  slug: string;
  kicker: string;
  currency: string;
  location: string;
  price_low: number | null;
  price_high: number | null;
  hide_price: boolean;
  avg_booking: number | null;
  reviews_count: number;
  distance_km: number | null;
  main_photo: BandPhoto | null;
  main_video: BandVideo | null;
}

export interface BandDetail extends Band {
  tags: string[];
  featured: boolean;
  visible: boolean;
  insured: boolean;
  bookings_count: number;
  audio_media: unknown[];
  video_media: unknown[];
  facebook: string;
  instagram: string;
  website: string;
  youtube: string;
  vimeo: string;
}

export interface BandCategory {
  id: number;
  slug: string;
  name: string;
  num_bands: number;
  band_exemplar?: Band;
}

export interface Region {
  id: number;
  name: string;
  admin_level: number;
  location_center_lat: number;
  location_center_lng: number;
  num_bands: number;
  categories: RegionCategory[];
}

export interface RegionCategory {
  slug: string;
  name: string;
  num_bands: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  count: number;
  page: number;
  page_size: number;
  num_pages: number;
}

export interface EnquiryPayload {
  email: string;
  name?: string;
  phone?: string;
  location: string;
  location_place_id?: string;
  event_date?: string;
  budget_min?: number;
  budget_max?: number;
  message?: string;
  act: string[]; // band slugs
  source_site: string;
}

export interface EnquiryResponse {
  id: number;
  client_secret: string;
}

// Venue Intelligence (from /api-v2/venues/)

export interface VenueListItem {
  place_id: string;
  canonical_name: string;
  slug: string;
  lat: number | null;
  lng: number | null;
  booking_count: number;
  unique_band_count: number;
  first_booking_year: number | null;
  latest_booking_year: number | null;
  peak_months: number[];
  guest_count_median: number | null;
  curfew_time: string | null;
  price_range_low: number | null;
  price_range_high: number | null;
  price_currency: string;
  extracted_at: string | null;
  needs_review: boolean;
}

export interface VenueDetail extends VenueListItem {
  curfew_notes: string | null;
  guest_count_min: number | null;
  guest_count_max: number | null;
  has_accommodation: boolean | null;
  has_indoor_backup: boolean | null;
  overtime_rate_low: number | null;
  overtime_rate_high: number | null;
  payment_methods: string[];
  top_categories: Record<string, number>;
  top_bands: Array<{ name: string; slug: string; count: number }>;
  setup_areas: string[];
  associated_planners: string[];
  load_in_notes: string | null;
  power_notes: string | null;
  sound_notes: string | null;
  rain_backup_notes: string | null;
  notable_quotes: string[];
  editorial_summary: string | null;
  venue_description: string | null;
  google_photos: string[];
  website_url: string | null;
  phone_number: string | null;
  formatted_address: string | null;
  message_count_analyzed: number;
}

// Derived client-side from canonical_name
export function venueShortName(canonicalName: string): string {
  const parts = canonicalName.split(',').map(p => p.trim());
  return parts[0] || canonicalName;
}

export function venueTown(canonicalName: string): string {
  const parts = canonicalName.split(',').map(p => p.trim());
  if (parts.length >= 3) return parts[parts.length - 3]; // town before "Province of X"
  if (parts.length === 2) return parts[1];
  return '';
}

const MONTH_NAMES = ['', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

export function monthName(n: number): string {
  return MONTH_NAMES[n] || '';
}
