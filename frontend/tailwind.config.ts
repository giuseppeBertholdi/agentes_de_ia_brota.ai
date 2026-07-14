import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
        body: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"Space Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        cream: {
          DEFAULT: '#FBF7EC',
          2: '#F1E9D6',
          3: '#ECE2CB',
        },
        ink: {
          DEFAULT: '#16241C',
          soft: '#45564B',
          faint: '#7C8A7F',
        },
        green: {
          DEFAULT: '#1F8A4C',
          deep: '#12693A',
          700: '#145F36',
          soft: '#E2F1DD',
          tint: '#EFF7E9',
        },
        lime: '#C7F25C',
      },
      boxShadow: {
        xs: '0 1px 2px 0 rgba(22, 36, 28, 0.04)',
        soft: '0 1px 2px 0 rgba(22, 36, 28, 0.04), 0 1px 3px 0 rgba(22, 36, 28, 0.06)',
        'soft-md': '0 2px 4px -1px rgba(22, 36, 28, 0.05), 0 4px 10px -2px rgba(22, 36, 28, 0.07)',
        'soft-lg': '0 8px 16px -4px rgba(22, 36, 28, 0.09), 0 4px 6px -3px rgba(22, 36, 28, 0.05)',
      },
      borderRadius: {
        sm: '6px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '20px',
      },
    },
  },
  plugins: [],
}

export default config
