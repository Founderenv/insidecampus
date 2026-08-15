/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#070810',
          900: '#0a0b0f',
          850: '#0f1117',
          800: '#14161f',
          750: '#191c27',
          700: '#1f2330',
          600: '#2a2f3e',
          500: '#3a4150',
        },
        zeal: {
          50: '#e7fff2',
          100: '#c2ffd9',
          200: '#84ffb3',
          300: '#4dff8f',
          400: '#1ff96f',
          500: '#00e676',
          600: '#00c853',
          700: '#00a843',
          800: '#007a31',
          900: '#004d1f',
        },
        accent: {
          blue: '#3b82f6',
          amber: '#f59e0b',
          rose: '#f43f5e',
          violet: '#8b5cf6',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 24px rgba(0, 230, 118, 0.25)',
        'glow-sm': '0 0 12px rgba(0, 230, 118, 0.18)',
        card: '0 1px 2px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.3)',
      },
      keyframes: {
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'scale-in': {
          '0%': { transform: 'scale(0.96)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'pop': {
          '0%': { transform: 'scale(1)' },
          '40%': { transform: 'scale(1.3)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.6s infinite',
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-up': 'slide-up 0.3s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
        pop: 'pop 0.3s ease-out',
      },
    },
  },
  plugins: [],
}
