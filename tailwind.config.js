/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Institutional light-blue palette — anchored, professional, financial
        'primary': {
          50:  '#EEF4FB',
          100: '#DCE7F5',
          200: '#B6CDEA',
          300: '#86AED9',
          400: '#5188C2',
          500: '#2F6CAE',
          600: '#1F5594',
          700: '#0B4A8F', // brand anchor
          800: '#0A3D77',
          900: '#082C56',
          950: '#051A33',
        },
        // Paper-blue surfaces — replaces gray-50/100 for warmth and depth
        'surface': {
          DEFAULT: '#F4F7FB',
          subtle:  '#EDF2F8',
          muted:   '#E4EBF3',
          line:    '#DCE4EE',
        },
        // Editorial neutrals with slight blue cast (vs. neutral grays)
        'ink': {
          900: '#0F1E36',
          800: '#1A2B45',
          700: '#2A3B57',
          600: '#3F506C',
          500: '#5A6B82',
          400: '#8A99B0',
          300: '#B4BFCF',
          200: '#D5DCE6',
          100: '#E9EDF3',
        },
        // Restrained semantic accents
        'positive': {
          50:  '#E8F5EE',
          500: '#0F9D58',
          600: '#0C7E47',
          700: '#0A6638',
        },
        'negative': {
          50:  '#FBEAEA',
          500: '#D14343',
          600: '#B12F2F',
          700: '#8E2424',
        },
        'caution': {
          50:  '#FBF3E1',
          500: '#C4901B',
          600: '#9F7414',
        },
        // Kept for back-compat with existing components
        'trading-dark': {
          900: '#0A1220',
          800: '#0F1A2D',
          700: '#162338',
          600: '#1F2E48',
          500: '#293A58',
        },
        'trading-accent': {
          green: '#0F9D58',
          red:   '#D14343',
          orange:'#C4901B',
          blue:  '#2F6CAE',
        }
      },
      fontFamily: {
        // Standard, functional sans for the entire UI (numbers + headings + body)
        sans:  ['"Inter"', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono:  ['"JetBrains Mono"', 'Consolas', 'monospace'],
      },
      letterSpacing: {
        'tightest': '-0.04em',
        'tighter':  '-0.02em',
        'tight':    '-0.01em',
      },
      fontFeatureSettings: {
        'tabular': '"tnum", "lnum"',
      },
      boxShadow: {
        'hairline': '0 0 0 1px rgba(11, 74, 143, 0.08)',
        'card': '0 1px 2px rgba(15, 30, 54, 0.04), 0 0 0 1px rgba(11, 74, 143, 0.06)',
        'card-hover': '0 4px 16px rgba(11, 74, 143, 0.08), 0 0 0 1px rgba(11, 74, 143, 0.10)',
        'inset-line': 'inset 0 -1px 0 rgba(11, 74, 143, 0.06)',
      },
      backgroundImage: {
        'paper': 'linear-gradient(180deg, #F4F7FB 0%, #EDF2F8 100%)',
        'sky-fade': 'linear-gradient(180deg, #E8F0FA 0%, #F4F7FB 60%, #FFFFFF 100%)',
      },
      keyframes: {
        'gondola-up': {
          '0%':   { offsetDistance: '0%',   opacity: '0' },
          '5%':   { opacity: '1' },
          '95%':  { opacity: '1' },
          '100%': { offsetDistance: '100%', opacity: '0' },
        },
        'snow-fall': {
          '0%':   { transform: 'translateY(-10%) translateX(0)', opacity: '0' },
          '10%':  { opacity: '0.8' },
          '90%':  { opacity: '0.6' },
          '100%': { transform: 'translateY(110%) translateX(20px)', opacity: '0' },
        },
        'pulse-soft': {
          '0%, 100%': { transform: 'scale(1)',   opacity: '1' },
          '50%':      { transform: 'scale(1.4)', opacity: '0' },
        },
        'shimmer-x': {
          '0%':   { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'snow-fall':  'snow-fall 9s linear infinite',
        'pulse-soft': 'pulse-soft 2.4s ease-out infinite',
        'shimmer-x':  'shimmer-x 2.4s linear infinite',
      },
    },
  },
  plugins: [],
}
