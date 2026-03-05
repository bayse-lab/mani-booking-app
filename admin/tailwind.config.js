/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#1F1A15',
          light: '#2e261e',
        },
        accent: {
          DEFAULT: '#C4A97D',
          dark: '#A8905F',
          light: '#D4BC9A',
        },
        sand: {
          DEFAULT: '#F0CDA9',
          light: '#F5E8D5',
          mid: '#E8D4B8',
          dark: '#C4A97D',
        },
        mani: {
          brown: '#6b4c2f',
          taupe: '#B8A898',
          cream: '#F5E8D5',
          gold: '#C4A97D',
          warmGrey: '#8A7D70',
          tierRed: '#C8201A',
        },
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        body: ['"Jost"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        sm: '2px',
        DEFAULT: '2px',
        md: '2px',
        lg: '2px',
        xl: '2px',
        '2xl': '2px',
      },
    },
  },
  plugins: [],
};
