import type { Config } from 'tailwindcss';
import { colors } from './src/theme/colors';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors,
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        urdu: ['"Noto Nastaliq Urdu"', 'serif'],
      },
      fontSize: { base: ['18px', '1.6'] },
      borderRadius: { xl2: '1.25rem' },
      boxShadow: { card: '0 1px 2px rgba(10,20,16,0.04), 0 4px 16px rgba(10,20,16,0.06)' },
    },
  },
  plugins: [],
};
export default config;
