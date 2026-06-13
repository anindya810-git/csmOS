export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ["'Plus Jakarta Sans'", 'ui-sans-serif', 'system-ui', 'sans-serif'] },
      colors: {
        brand: {
          50:  '#ECFBF5',
          100: '#D6F5E9',
          200: '#AEEBD3',
          300: '#2DD4A7',
          400: '#1BC49A',
          500: '#0EA47E',
          600: '#0EA47E',
          700: '#0A7C5E',
          800: '#076648',
          900: '#06251D',
        }
      }
    }
  },
  plugins: []
};
