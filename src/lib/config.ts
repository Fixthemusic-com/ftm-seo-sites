/**
 * Load the site config based on SITE_ID environment variable.
 * Falls back to weddingbandsitaly if not set.
 */
import type { SiteConfig } from './types';
import wbiConfig from '../../sites/weddingbandsitaly.config';
import wmbiConfig from '../../sites/weddingmusicbanditaly.config';

const siteId = import.meta.env.SITE_ID || 'weddingbandsitaly';

const configs: Record<string, SiteConfig> = {
  weddingbandsitaly: wbiConfig,
  weddingmusicbanditaly: wmbiConfig,
};

export const siteConfig: SiteConfig = configs[siteId] || configs.weddingbandsitaly;
