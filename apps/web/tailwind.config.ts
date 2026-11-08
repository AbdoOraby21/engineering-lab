import type { Config } from 'tailwindcss';

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--color-bg) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        surface2: 'rgb(var(--color-surface-2) / <alpha-value>)',
        line: 'rgb(var(--color-border) / <alpha-value>)',
        content: 'rgb(var(--color-text) / <alpha-value>)',
        muted: 'rgb(var(--color-muted) / <alpha-value>)',
        brand: {
          DEFAULT: '#22C55E',
          hover: '#16A34A',
          soft: 'rgb(34 197 94 / 0.12)',
          fg: '#04130A',
        },
      },
      fontFamily: {
        sans: ['Poppins', 'Cairo', 'system-ui', 'sans-serif'],
        arabic: ['Cairo', 'Tajawal', 'Poppins', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 32px rgba(34, 197, 94, 0.28)',
        'glow-sm': '0 0 16px rgba(34, 197, 94, 0.22)',
        card: '0 18px 40px -24px rgba(0, 0, 0, 0.55)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'toast-in': {
          from: { opacity: '0', transform: 'translateY(12px) scale(0.98)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.45s ease-out both',
        float: 'float 6s ease-in-out infinite',
        'toast-in': 'toast-in 0.2s ease-out both',
      },
    },
  },
  plugins: [],
} satisfies Config;
