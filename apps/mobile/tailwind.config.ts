import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    '../../packages/ui/src/**/*.{js,jsx,ts,tsx}',
    '../../packages/shared/src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fff1f2',
          100: '#ffe4e6',
          200: '#fecdd3',
          300: '#fda4af',
          400: '#fb7185',
          500: '#f43f5e',
          600: '#e11d48',
          700: '#be123c',
          800: '#9f1239',
          900: '#881337',
        },
        ink: {
          900: '#0b0b0f',
          800: '#1f2024',
          700: '#374151',
          600: '#4b5563',
          500: '#6b7280',
          400: '#9ca3af',
          300: '#d1d5db',
          200: '#e5e7eb',
          100: '#f3f4f6',
          50: '#f9fafb',
        },
        cream: {
          50: '#fdfcfa',
          100: '#faf7f2',
          200: '#f1ece3',
        },
      },
      borderRadius: {
        pill: '9999px',
        card: '20px',
        field: '14px',
      },
      fontSize: {
        display: ['44px', { lineHeight: '48px', letterSpacing: '-1px', fontWeight: '700' }],
        h1: ['32px', { lineHeight: '38px', letterSpacing: '-0.5px', fontWeight: '700' }],
        h2: ['24px', { lineHeight: '30px', letterSpacing: '-0.3px', fontWeight: '700' }],
        h3: ['20px', { lineHeight: '26px', fontWeight: '600' }],
        body: ['15px', { lineHeight: '22px', fontWeight: '400' }],
        meta: ['13px', { lineHeight: '18px', fontWeight: '500' }],
      },
      boxShadow: {
        card: '0 8px 24px rgba(15,15,20,0.06)',
        cta: '0 8px 20px rgba(228,29,72,0.28)',
      },
    },
  },
  plugins: [],
};

export default config;
