/**
 * Site configuration for weddingbandsitaly.co.uk
 * Premium wedding bands for Italian weddings - luxury positioning
 */
import type { SiteConfig } from '../src/lib/types';

const config: SiteConfig = {
  id: 'weddingbandsitaly',
  name: 'Wedding Bands Italy',
  domain: 'weddingbandsitaly.co.uk',
  tagline: 'Premium Live Wedding Bands for Your Italian Wedding',
  description:
    'Discover the finest live wedding bands in Italy. From elegant jazz ensembles to high-energy party bands, find the perfect soundtrack for your dream Italian wedding.',
  regionId: 2221,
  regionSlug: 'italy',

  // Branding
  theme: {
    primaryColor: '#1a365d', // Deep navy
    primaryDarkColor: '#0d1b2a',
    accentColor: '#c9a84c', // Gold
    surfaceColor: '#faf9f6', // Warm white
    surfaceDarkColor: '#1a1a2e',
    headingFont: 'Playfair Display',
    bodyFont: 'Inter',
  },

  // SEO
  locale: 'en-GB',
  ogImage: '/images/og-wbi.jpg',

  // API auth
  sourceSite: 'weddingbandsitaly',

  // Content positioning
  hero: {
    title: 'Premium Live Wedding Bands for Your Italian Wedding',
    subtitle:
      'Hand-picked musicians and entertainment for weddings across Italy. From Lake Como to the Amalfi Coast.',
    ctaText: 'Browse Bands',
    ctaLink: '/browse/',
  },

  // Footer
  footer: {
    about:
      'Wedding Bands Italy connects you with the finest live musicians for Italian weddings. Every band is vetted for quality and reliability.',
  },
};

export default config;
