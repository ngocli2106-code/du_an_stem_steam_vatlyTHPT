import type { Config } from 'tailwindcss';
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { 50: '#eef6ff', 100: '#d9eaff', 600: '#1d5fd1', 700: '#164aa6', 800: '#143d86' },
      },
    },
  },
  plugins: [],
};
export default config;
