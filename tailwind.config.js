/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        mlb: {
          dark: '#1a1a1a',
          darker: '#0f0f0f',
          card: '#282828',
          cardHover: '#333333',
          border: '#444d58',
          blue: '#0062e3',
          blueHover: '#2c7df8',
          textPrimary: '#ffffff',
          textSecondary: '#acb3bc',
          textMuted: '#8a8a8a',
        }
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
