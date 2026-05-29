import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Industrial neutral palette. Sharper steps than Tailwind defaults.
        ink: {
          950: '#08090b',
          900: '#0e1014',
          800: '#15181d',
          700: '#1d2128',
          600: '#262b34',
          500: '#3a414d',
          400: '#5a6371',
          300: '#8a93a3',
          200: '#bcc3cf',
          100: '#e4e7ed',
          50:  '#f5f6f8',
        },
        // Single accent. Reserved for active / live / important state.
        accent: {
          DEFAULT: '#f59e0b',
          muted:   '#b87600',
        },
        signal: {
          ok:    '#34d399',
          warn:  '#fbbf24',
          alert: '#f87171',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        sm: '2px',
        DEFAULT: '3px',
        md: '4px',
      },
      boxShadow: {
        panel: '0 1px 0 0 rgba(255,255,255,0.03) inset, 0 1px 2px 0 rgba(0,0,0,0.4)',
      },
    },
  },
  plugins: [],
};

export default config;
