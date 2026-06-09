/**
 * FTM V2 API client
 * ALL fetches go to the V2 async Ninja endpoints — zero V1 calls.
 */
import type {
  Band,
  BandDetail,
  BandCategory,
  Region,
  PaginatedResponse,
  EnquiryPayload,
  EnquiryResponse,
} from './types';

const API_BASE = import.meta.env.FTM_API_BASE || 'https://www.fixthemusic.com';
const SITE_TOKEN = import.meta.env.FTM_SITE_TOKEN || '';

/**
 * Generic fetch wrapper with error handling
 */
async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${res.statusText} for ${path}`);
  }

  return res.json();
}

// ─── Region ──────────────────────────────────────────────

export async function getRegion(slug: string): Promise<Region> {
  return apiFetch<Region>(`/api-v2/geography/regions/${slug}`);
}

// ─── Bands ───────────────────────────────────────────────

export interface BandListParams {
  region?: number;
  category?: string;
  page?: number;
  page_size?: number;
  ordering?: string;
  search?: string;
}

export async function getBands(
  params: BandListParams = {}
): Promise<PaginatedResponse<Band>> {
  const query = new URLSearchParams();
  if (params.region) query.set('region', String(params.region));
  if (params.category) query.set('category', params.category);
  if (params.page) query.set('page', String(params.page));
  if (params.page_size) query.set('page_size', String(params.page_size));
  if (params.ordering) query.set('ordering', params.ordering);
  if (params.search) query.set('search', params.search);

  const qs = query.toString();
  const res = await apiFetch<{ items: Band[]; count: number }>(
    `/api-v2/bands${qs ? `?${qs}` : ''}`
  );
  const pageSize = params.page_size || 24;
  return {
    items: res.items,
    count: res.count,
    page: params.page || 1,
    page_size: pageSize,
    num_pages: Math.ceil(res.count / pageSize),
  };
}

export async function getBand(slug: string): Promise<BandDetail> {
  return apiFetch<BandDetail>(`/api-v2/bands/${slug}`);
}

export async function getBandPhotos(slug: string): Promise<BandDetail['photos']> {
  return apiFetch<BandDetail['photos']>(`/api-v2/bands/${slug}/photos`);
}

export async function getBandVideos(slug: string): Promise<BandDetail['videos']> {
  return apiFetch<BandDetail['videos']>(`/api-v2/bands/${slug}/videos`);
}

export async function getBandReviews(slug: string): Promise<BandDetail['reviews']> {
  return apiFetch<BandDetail['reviews']>(`/api-v2/bands/${slug}/reviews`);
}

export async function getRelatedBands(slug: string): Promise<Band[]> {
  return apiFetch<Band[]>(`/api-v2/bands/${slug}/related_bands`);
}

export async function getRecentlyBooked(): Promise<Band[]> {
  return apiFetch<Band[]>(`/api-v2/bands/recently_booked`);
}

export async function getBulkBands(slugs: string[]): Promise<Band[]> {
  return apiFetch<Band[]>(
    `/api-v2/bands/bulk?slugs=${slugs.join(',')}`
  );
}

// ─── Categories ──────────────────────────────────────────

export async function getCategories(): Promise<BandCategory[]> {
  const res = await apiFetch<{ items: BandCategory[]; count: number }>(
    `/api-v2/band_categories/`
  );
  return res.items;
}

// ─── Enquiries ───────────────────────────────────────────

export async function submitEnquiry(
  payload: EnquiryPayload
): Promise<EnquiryResponse> {
  return apiFetch<EnquiryResponse>(
    `/api-v2/booking/external/enquiries/`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SITE_TOKEN}`,
      },
      body: JSON.stringify(payload),
    }
  );
}
