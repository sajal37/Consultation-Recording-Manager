/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // "Casebook" palette — warm paper, ink, clay + pine accents.
        paper: '#f1ece1',
        card: '#fbf8f1',
        line: '#e3dccb',
        ink: {
          DEFAULT: '#23241f',
          soft: '#55554c',
          faint: '#8b897c',
        },
        clay: {
          50: '#fbf0ec',
          100: '#f4d9cf',
          200: '#e7b3a1',
          400: '#cf6a4d',
          500: '#bf5236',
          600: '#a4422a',
          700: '#823322',
        },
        pine: {
          50: '#e9f1ef',
          100: '#caddd8',
          400: '#3f8a80',
          500: '#2c6f66',
          600: '#225851',
          700: '#1b443f',
        },
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'Cambria', 'serif'],
        sans: ['"Schibsted Grotesk"', 'system-ui', 'Segoe UI', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 0 #e3dccb, 0 8px 24px -18px rgba(35,36,31,0.45)',
        lift: '0 2px 0 #d8cfb8, 0 14px 30px -16px rgba(35,36,31,0.4)',
      },
      keyframes: {
        'pulse-ring': {
          '0%': { boxShadow: '0 0 0 0 rgba(191,82,54,0.45)' },
          '70%': { boxShadow: '0 0 0 12px rgba(191,82,54,0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(191,82,54,0)' },
        },
      },
      animation: {
        'pulse-ring': 'pulse-ring 1.6s ease-out infinite',
      },
    },
  },
  plugins: [],
};
