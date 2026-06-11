import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import tailwind from '@astrojs/tailwind';
import sitemapIntegration from '@astrojs/sitemap';

// Wrap sitemap to catch the known bug with empty dynamic routes
// (Cannot read properties of undefined (reading 'reduce'))
function safeSitemap(opts) {
  const integration = sitemapIntegration(opts);
  // Find the astro:build:done hook and wrap it with error handling
  const originalHooks = integration.hooks;
  integration.hooks = {
    ...originalHooks,
    'astro:build:done': async (...args) => {
      try {
        if (originalHooks['astro:build:done']) {
          await originalHooks['astro:build:done'](...args);
        }
      } catch (e) {
        console.warn(`[@astrojs/sitemap] Skipped due to error: ${e.message}`);
      }
    },
  };
  return integration;
}

// Site config is loaded from SITE_ID env var
const siteId = process.env.SITE_ID || 'weddingbandsitaly';

const siteConfigs = {
  weddingbandsitaly: {
    site: 'https://weddingbandsitaly.co.uk',
    title: 'Wedding Bands Italy',
  },
  weddingmusicbanditaly: {
    site: 'https://weddingmusicbanditaly.co.uk',
    title: 'Wedding Music Band Italy',
  },
};

const config = siteConfigs[siteId] || siteConfigs.weddingbandsitaly;

export default defineConfig({
  site: config.site,
  integrations: [
    tailwind(),
    mdx(),
    safeSitemap({
      filter: (page) => !page.includes('/venues/') || page === new URL('/venues/', config.site).href,
    }),
  ],
  output: 'static',
  trailingSlash: 'always',
  build: {
    format: 'directory',
  },
  vite: {
    define: {
      'import.meta.env.SITE_ID': JSON.stringify(siteId),
    },
  },
});
