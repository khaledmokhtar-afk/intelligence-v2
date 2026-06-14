import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/app/**/*.{ts,tsx}', './src/components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#08080F',
        card:       '#0F0F1A',
        border:     'rgba(0,200,232,0.15)',
        cyan:       '#00C8E8',
        green:      '#00E87A',
        red:        '#E83E3E',
        'text-primary': '#F0F0F5',
        'text-muted':   '#8888A0',
        'text-dim':     '#555566',
      },
      fontFamily: {
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        sans:    ['var(--font-sans)',    'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow:     '0 0 30px rgba(0,200,232,0.2)',
        'glow-sm':'0 0 12px rgba(0,200,232,0.15)',
      },
    },
  },
  plugins: [],
}

export default config
