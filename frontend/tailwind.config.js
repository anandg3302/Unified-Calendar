/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './contexts/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        inter: ['Inter', 'ui-sans-serif', 'system-ui'],
        poppins: ['Poppins', 'ui-sans-serif', 'system-ui'],
      },
      colors: {
        orange: {
          500: '#f97316',
        },
        gray: {
          600: '#4b5563',
        },
      },
    },
  },
  plugins: [],
};


