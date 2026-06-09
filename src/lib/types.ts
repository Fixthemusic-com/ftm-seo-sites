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
