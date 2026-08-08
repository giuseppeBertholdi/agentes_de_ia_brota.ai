import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Archivo"', 'system-ui', 'sans-serif'],
        body: ['"Archivo"', 'system-ui', 'sans-serif'],
        mono: ['"Archivo"', 'system-ui', 'sans-serif'],
      },
      colors: {
        // fundo do app e superfícies neutras
        cream: {
          DEFAULT: '#F7F9F8',
          2: '#F0F2F5',
          3: '#E7EAEC',
        },
        // texto
        ink: {
          DEFAULT: '#111B21',
          soft: '#54656F',
          faint: '#8696A0',
        },
        // verde WhatsApp (marca / CTA de destaque) + teal (ações/links)
        green: {
          DEFAULT: '#25D366',
          deep: '#0B6156',
          700: '#094B43',
          soft: '#E7F8EF',
          tint: '#E7F8EF',
        },
        // botão de CTA no estilo WhatsApp: fundo verde, texto verde bem escuro
        lime: '#25D366',
        // alerta / precisa de atenção humana
        amber: {
          DEFAULT: '#F2A33C',
          text: '#9A6C1E',
          soft: '#FEF3E2',
        },
        // bolha de chat (Inbox)
        chat: {
          bg: '#EFEAE2',
          bubble: '#D9FDD3',
          meta: '#667781',
        },
      },
      boxShadow: {
        xs: '0 1px 2px 0 rgba(17, 27, 33, 0.06)',
        soft: '0 1px 2px 0 rgba(17, 27, 33, 0.06), 0 1px 3px 0 rgba(17, 27, 33, 0.08)',
        'soft-md': '0 2px 4px -1px rgba(17, 27, 33, 0.06), 0 4px 10px -2px rgba(17, 27, 33, 0.08)',
        'soft-lg': '0 8px 16px -4px rgba(17, 27, 33, 0.1), 0 4px 6px -3px rgba(17, 27, 33, 0.06)',
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
