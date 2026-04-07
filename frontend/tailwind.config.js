/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#0a3d5c',
          light: '#0d4f78',
          dark: '#062840',
        },
        seafoam: {
          DEFAULT: '#4dcfaa',
          dark: '#3ab898',
        },
      },
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
