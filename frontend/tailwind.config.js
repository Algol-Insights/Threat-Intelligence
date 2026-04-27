/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: { 50: '#eef9ff', 100: '#d9f1ff', 200: '#bce7ff', 300: '#8ed9ff', 400: '#59c3ff', 500: '#33a6ff', 600: '#1b87f5', 700: '#146fe1', 800: '#175ab6', 900: '#194d8f', 950: '#143057' },
        soc: {
          bg: '#0a0e17', surface: '#111827', card: '#1a2236', border: '#1e293b',
          text: '#e2e8f0', muted: '#94a3b8', accent: '#38bdf8',
          critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#22c55e', info: '#6366f1',
        },
      },
      fontFamily: { sans: ['"DM Sans"', 'system-ui', 'sans-serif'], mono: ['"JetBrains Mono"', 'monospace'] },
    },
  },
  plugins: [],
}
