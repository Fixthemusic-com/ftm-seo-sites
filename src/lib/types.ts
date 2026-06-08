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

// API response types (V2 Ninja endpoints)

export interface Band {
  id: number;
  name: string;
  slug: string;
  kicker: string;
  price_low: number | null;
  price_high: number | null;
  profile_image: string | null;
  location_name: string;
  average_rating: number | null;
  review_count: number;
  categories: string[];
}

export interface BandDetail extends Band {
  description: string;
  profile_markdown: string;
  locations: string[];
  set_list: string | null;
  faq: string | null;
  photos: BandPhoto[];
  videos: BandVideo[];
  reviews: BandReview[];
}

export interface BandPhoto {
  id: number;
  url: string;
  thumbnail_url: string;
  caption: string;
  order: number;
}

export interface BandVideo {
  id: number;
  url: string;
  thumbnail_url: string;
  title: string;
}

export interface BandReview {
  id: number;
  author_name: string;
  rating: number;
  text: string;
  date: string;
  event_type: string;
}

export interface BandCategory {
  id: number;
  name: string;
  slug: string;
  band_count: number;
}

export interface Region {
  id: number;
  name: string;
  slug: string;
  band_count: number;
  categories: BandCategory[];
  center_lat: number;
  center_lng: number;
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
