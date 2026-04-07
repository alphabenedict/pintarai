import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#2563EB',
        'primary-dark': '#1d4ed8',
        'primary-darker': '#1e3a8a',
        secondary: '#3B82F6',
        cta: '#F97316',
        'cta-dark': '#ea6c05',
        'cta-darker': '#c2410c',
        background: '#F8FAFC',
        'text-main': '#1E293B',
        success: '#22C55E',
      },
      fontFamily: {
        baloo: ['"Baloo 2"', 'cursive'],
        comic: ['"Comic Neue"', 'cursive'],
      },
      borderRadius: {
        'card': '32px',
        'button': '20px',
        'input': '16px',
        'outer': '48px',
      },
      animation: {
        'bounce-slow': 'bounce 1.5s infinite',
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
