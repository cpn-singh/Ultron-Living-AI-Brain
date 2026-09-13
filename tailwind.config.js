/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        cyber: {
          bg: '#020617',
          panel: 'rgba(15, 23, 42, 0.75)',
          border: 'rgba(244, 63, 94, 0.3)',
        }
      }
    },
  },
  plugins: [],
}
