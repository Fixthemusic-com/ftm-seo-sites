/**
 * Site configuration for weddingmusicbanditaly.co.uk
 * Broader wedding music and entertainment - inclusive positioning
 */
import type { SiteConfig } from '../src/lib/types';

const config: SiteConfig = {
  id: 'weddingmusicbanditaly',
  name: 'Wedding Music Band Italy',
  domain: 'weddingmusicbanditaly.co.uk',
  tagline: 'Wedding Music & Entertainment for Italy',
  description:
    'Find amazing wedding music and entertainment for your Italian wedding. DJs, bands, singers, saxophonists and more across every region of Italy.',
  regionId: 2221,
  regionSlug: 'italy',

  // Branding
  theme: {
    primaryColor: '#2d3748', // Slate
    primaryDarkColor: '#1a202c',
    accentColor: '#e53e3e', // Warm red
    surfaceColor: '#ffffff',
    surfaceDarkColor: '#171923',
    headingFont: 'DM Serif Display',
    bodyFont: 'DM Sans',
  },

  // SEO
  locale: 'en-GB',
  ogImage: '/images/og-wmbi.jpg',

  // API auth
  sourceSite: 'weddingmusicbanditaly',

  // Content positioning
  hero: {
    title: 'Wedding Music & Entertainment for Italy',
    subtitle:
      'From acoustic duos to full showbands, DJs to string quartets. Find your perfect wedding entertainment anywhere in Italy.',
    ctaText: 'Find Entertainment',
    ctaLink: '/browse/',
  },

  // Footer
  footer: {
    about:
      'Wedding Music Band Italy is your one-stop destination for wedding entertainment across Italy. Hundreds of verified musicians ready to make your day unforgettable.',
  },
};

export default config;
