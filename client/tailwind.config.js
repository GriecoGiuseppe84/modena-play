/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        'modena-navy': '#1A237E',
        'modena-cyan': '#00E5FF',
        'modena-gold': '#FFD700',
        'modena-black': '#0A0A0A',
      },
    }, extend: {} },
  plugins: [],
};
