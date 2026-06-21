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
        hard: '4px 4px 0 #16241C',
        'hard-md': '6px 6px 0 #16241C',
        'hard-lg': '9px 9px 0 #16241C',
        'hard-green': '6px 6px 0 #12693A',
      },
      borderRadius: {
        sm: '4px',
        md: '7px',
        lg: '10px',
        xl: '14px',
      },
      borderWidth: { DEFAULT: '2px' },
    },
  },
  plugins: [],
}

export default config
