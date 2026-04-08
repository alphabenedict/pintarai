import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
          dark: '#4F46E5',
          light: '#EEF2FF',
        },
        accent: '#0EA5E9',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        ring: 'hsl(var(--ring))',
        surface: 'rgba(255,255,255,0.6)',
        'text-main': '#0F172A',
        'text-muted': '#64748B',
        success: '#10B981',
        danger: '#EF4444',
      },
      fontFamily: {
        brand: ['"Baloo 2"', 'cursive'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'glass': '16px',
        'glass-lg': '20px',
        'pill': '9999px',
      },
      backdropBlur: {
        'glass': '16px',
        'glass-sm': '8px',
      },
      boxShadow: {
        'glass': '0 4px 24px rgba(99,102,241,0.08), 0 1px 2px rgba(0,0,0,0.04)',
        'glass-md': '0 8px 32px rgba(99,102,241,0.1), 0 2px 4px rgba(0,0,0,0.06)',
        'glass-lg': '0 16px 48px rgba(99,102,241,0.12), 0 4px 8px rgba(0,0,0,0.08)',
      },
      animation: {
        'collapsible-down': 'collapsible-down 0.2s ease-out',
        'collapsible-up': 'collapsible-up 0.2s ease-out',
        'fade-in': 'fade-in 0.3s ease-out',
      },
      keyframes: {
        'collapsible-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-collapsible-content-height)' },
        },
        'collapsible-up': {
          from: { height: 'var(--radix-collapsible-content-height)' },
          to: { height: '0' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
