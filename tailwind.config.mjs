import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        // Shared palette - site-specific overrides via CSS variables
        primary: 'var(--color-primary)',
        'primary-dark': 'var(--color-primary-dark)',
        accent: 'var(--color-accent)',
        surface: 'var(--color-surface)',
        'surface-dark': 'var(--color-surface-dark)',
      },
      fontFamily: {
        heading: ['var(--font-heading)', 'serif'],
        body: ['var(--font-body)', 'sans-serif'],
      },
      typography: () => ({
        DEFAULT: {
          css: {
            '--tw-prose-body': '#374151',
            '--tw-prose-headings': '#111827',
            '--tw-prose-links': 'var(--color-primary)',
            '--tw-prose-bold': '#111827',
            '--tw-prose-counters': '#6b7280',
            '--tw-prose-bullets': 'var(--color-accent)',
            '--tw-prose-hr': '#e5e7eb',
            '--tw-prose-quotes': '#111827',
            '--tw-prose-quote-borders': 'var(--color-accent)',
            '--tw-prose-th-borders': '#d1d5db',
            '--tw-prose-td-borders': '#e5e7eb',
            maxWidth: 'none',
            lineHeight: '1.8',
            fontSize: '1.0625rem',
            h2: {
              fontFamily: 'var(--font-heading), serif',
              fontSize: '1.75em',
              fontWeight: '700',
              letterSpacing: '-0.02em',
              marginTop: '2.5em',
              marginBottom: '1em',
              lineHeight: '1.25',
              color: 'var(--color-primary)',
              borderBottom: '2px solid var(--color-accent)',
              paddingBottom: '0.4em',
            },
            h3: {
              fontFamily: 'var(--font-heading), serif',
              fontSize: '1.35em',
              fontWeight: '600',
              letterSpacing: '-0.01em',
              marginTop: '2em',
              marginBottom: '0.75em',
              lineHeight: '1.3',
              color: '#1f2937',
            },
            h4: {
              fontFamily: 'var(--font-heading), serif',
              fontSize: '1.15em',
              fontWeight: '600',
              marginTop: '1.75em',
              marginBottom: '0.5em',
              color: '#374151',
            },
            p: {
              marginTop: '1.25em',
              marginBottom: '1.25em',
            },
            a: {
              color: 'var(--color-primary)',
              fontWeight: '500',
              textDecoration: 'underline',
              textDecorationColor: 'var(--color-accent)',
              textUnderlineOffset: '3px',
              transition: 'color 0.15s',
              '&:hover': {
                color: 'var(--color-accent)',
              },
            },
            strong: {
              fontWeight: '600',
              color: '#111827',
            },
            blockquote: {
              fontStyle: 'italic',
              borderLeftWidth: '3px',
              borderLeftColor: 'var(--color-accent)',
              backgroundColor: 'rgba(0, 0, 0, 0.02)',
              paddingLeft: '1.25em',
              paddingTop: '0.75em',
              paddingBottom: '0.75em',
              borderRadius: '0 0.375rem 0.375rem 0',
            },
            ul: {
              marginTop: '1.25em',
              marginBottom: '1.25em',
            },
            'ul > li': {
              paddingLeft: '0.5em',
              marginTop: '0.5em',
              marginBottom: '0.5em',
            },
            ol: {
              marginTop: '1.25em',
              marginBottom: '1.25em',
            },
            'ol > li': {
              paddingLeft: '0.5em',
              marginTop: '0.5em',
              marginBottom: '0.5em',
            },
            hr: {
              marginTop: '3em',
              marginBottom: '3em',
              borderColor: '#e5e7eb',
            },
            table: {
              fontSize: '0.925em',
              width: '100%',
            },
            thead: {
              borderBottomWidth: '2px',
              borderBottomColor: 'var(--color-primary)',
            },
            'thead th': {
              fontFamily: 'var(--font-body), sans-serif',
              fontWeight: '600',
              color: '#111827',
              paddingTop: '0.75em',
              paddingBottom: '0.75em',
              paddingLeft: '1em',
              paddingRight: '1em',
              textAlign: 'left',
              backgroundColor: '#f9fafb',
            },
            'tbody td': {
              paddingTop: '0.75em',
              paddingBottom: '0.75em',
              paddingLeft: '1em',
              paddingRight: '1em',
            },
            'tbody tr': {
              borderBottomWidth: '1px',
              borderBottomColor: '#f3f4f6',
            },
            'tbody tr:nth-child(even)': {
              backgroundColor: '#fafaf9',
            },
          },
        },
        lg: {
          css: {
            fontSize: '1.125rem',
            lineHeight: '1.8',
            h2: {
              fontSize: '1.875em',
              marginTop: '2.5em',
              marginBottom: '1em',
            },
            h3: {
              fontSize: '1.4em',
              marginTop: '2em',
              marginBottom: '0.75em',
            },
            p: {
              marginTop: '1.25em',
              marginBottom: '1.25em',
            },
          },
        },
      }),
    },
  },
  plugins: [typography],
};
