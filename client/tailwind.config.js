/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Thread status colors
        status: {
          open: '#3b82f6',
          under_review: '#eab308',
          experimental: '#f97316',
          partially_solved: '#22c55e',
          solved: '#10b981',
          archived: '#9ca3af',
          contested: '#ef4444',
        }
      }
    },
  },
  plugins: [],
}
