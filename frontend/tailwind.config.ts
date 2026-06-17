import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        onyx: '#08090a',
        charcoal: '#0f1011',
        obsidian: '#161718',
        graphite: '#23252a',
        iron: '#323334',
        steel: '#383b3f',
        slate: '#62666d',
        fog: '#8a8f98',
        mist: '#d0d6e0',
        platinum: '#e5e5e6',
        snow: '#f7f8f8',
        'acid-lime': '#e4f222',
        indigo: '#5e6ad2',
        emerald: '#27a644',
        crimson: '#eb5757',
        cyan: '#02b8cc',
      },
      fontFamily: {
        sans: ['Inter Variable', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['Berkeley Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      borderRadius: {
        nav: '6px',
        cards: '12px',
        pills: '9999px',
        badges: '2px',
        inputs: '6px',
        buttons: '6px',
      },
      spacing: {
        '4': '4px',
        '8': '8px',
        '12': '12px',
        '16': '16px',
        '20': '20px',
        '24': '24px',
        '28': '28px',
        '32': '32px',
        '36': '36px',
        '40': '40px',
        '48': '48px',
        '56': '56px',
        '64': '64px',
        '80': '80px',
        '96': '96px',
        '128': '128px',
      },
    },
  },
  plugins: [],
}

export default config
