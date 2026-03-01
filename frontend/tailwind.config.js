/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f0f5ff',
          100: '#e0ebff',
          500: '#4f6ef7',
          600: '#3b5ce4',
          700: '#2d4ac9',
          900: '#1a2a6c',
        },
      },
    },
  },
  plugins: [],
}
