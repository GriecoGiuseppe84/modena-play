/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'modena-navy': '#1A237E',
        'modena-cyan': '#00E5FF',
        'modena-gold': '#FFD700',
        'modena-black': '#0A0A0A',
      },
      fontFamily: {
        display: ['"Exo 2"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        body: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(255,255,255,0.06), 0 20px 80px rgba(0,0,0,0.45)',
      },
    },
  },
  plugins: [],
};
