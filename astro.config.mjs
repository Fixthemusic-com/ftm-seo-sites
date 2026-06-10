import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

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
    sitemap(),
  ],
  output: 'static',
  build: {
    format: 'directory',
  },
  vite: {
    define: {
      'import.meta.env.SITE_ID': JSON.stringify(siteId),
    },
  },
});
