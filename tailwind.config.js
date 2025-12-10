/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'trading-dark': {
          900: '#0a0a0b',
          800: '#131316',
          700: '#1a1a1f',
          600: '#242429',
          500: '#2d2d35',
        },
        'trading-accent': {
          green: '#00ff88',
          red: '#ff4444',
          orange: '#ff9500',
          blue: '#0088ff',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      }
    },
  },
  plugins: [],
}
