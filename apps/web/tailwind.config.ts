import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          green: '#16A36A',
          'green-deep': '#087F5B',
          emerald: '#10B981',
          'green-light': '#DDF8EC',
          'green-soft': '#EFFBF5',
          blue: '#3478F6',
          'blue-deep': '#2455C5',
          sky: '#5BB7F5',
          'blue-soft': '#EAF3FF',
          teal: '#16B8A6',
        },
        surface: {
          bg: 'var(--bg)',
          card: 'var(--card)',
          elevated: 'var(--elevated)',
          border: 'var(--border)',
        },
        ink: {
          main: 'var(--text-main)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
        },
        semantic: {
          success: '#16A36A',
          warning: '#F2A93B',
          danger: '#E65C68',
          info: '#3478F6',
        },
      },
      borderRadius: {
        control: '8px',
        input: '12px',
        card: '18px',
        panel: '22px',
      },
      boxShadow: {
        soft: '0 4px 20px -4px rgba(23, 43, 37, 0.08)',
        elevated: '0 12px 32px -8px rgba(23, 43, 37, 0.14)',
      },
    },
  },
  plugins: [],
};

export default config;
