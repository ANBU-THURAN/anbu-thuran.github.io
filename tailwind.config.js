/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        mono: ['JetBrains Mono', 'IBM Plex Mono', 'Fira Code', 'SF Mono', 'Menlo', 'Monaco', 'Consolas', 'Courier New', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      fontSize: {
        'xs': ['0.6875rem', { lineHeight: '1.15' }],
        'sm': ['0.8125rem', { lineHeight: '1.35' }],
        'base': ['0.9375rem', { lineHeight: '1.5' }],
        'md': ['1.0625rem', { lineHeight: '1.5' }],
        'lg': ['1.25rem', { lineHeight: '1.35' }],
        'xl': ['1.5rem', { lineHeight: '1.15' }],
        '2xl': ['2rem', { lineHeight: '1.15' }],
        '3xl': ['2.5rem', { lineHeight: '1.15' }],
        '4xl': ['3rem', { lineHeight: '1.1' }],
      },
      spacing: {
        '0.5': '0.125rem',
        '1.5': '0.375rem',
        '2.5': '0.625rem',
      },
      transitionTimingFunction: {
        'expo': 'cubic-bezier(0.19, 1, 0.22, 1)',
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'circ': 'cubic-bezier(0.85, 0, 0.15, 1)',
      },
      transitionDuration: {
        '400': '400ms',
      },
      typography: (theme) => ({
        DEFAULT: {
          css: {
            '--tw-prose-body': 'var(--color-text-primary)',
            '--tw-prose-headings': 'var(--color-text-primary)',
            '--tw-prose-links': 'var(--color-accent)',
            '--tw-prose-bold': 'var(--color-text-primary)',
            '--tw-prose-code': 'var(--color-text-primary)',
            '--tw-prose-pre-bg': 'var(--color-bg-secondary)',
          },
        },
      }),
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}

