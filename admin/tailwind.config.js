/** Colours come from CSS variables (src/styles/index.css) so light/dark themes share one token set. */
const v = name => `rgb(var(--${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: v('bg'),
        surface: v('surface'),
        subtle: v('subtle'),
        line: v('line'),
        ink: v('ink'),
        muted: v('muted'),
        faint: v('faint'),
        primary: { DEFAULT: v('primary'), strong: v('primary-strong'), soft: v('primary-soft'), fg: v('primary-fg'), text: v('primary-text') },
        success: { DEFAULT: v('success'), soft: v('success-soft') },
        warning: { DEFAULT: v('warning'), soft: v('warning-soft') },
        danger: { DEFAULT: v('danger'), soft: v('danger-soft') },
        info: { DEFAULT: v('info'), soft: v('info-soft') },
        sidebar: { DEFAULT: v('sidebar'), line: v('sidebar-line'), text: v('sidebar-text'), muted: v('sidebar-muted'), hover: v('sidebar-hover') }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['"Inter Tight"', 'Inter', 'system-ui', 'sans-serif'],
        serif: ['"Instrument Serif"', 'Georgia', 'serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace']
      },
      borderRadius: { xl: '14px', '2xl': '18px' },
      boxShadow: {
        card: '0 1px 2px rgb(var(--shadow) / 0.06), 0 1px 1px rgb(var(--shadow) / 0.03)',
        pop: '0 18px 40px -16px rgb(var(--shadow) / 0.35), 0 2px 6px rgb(var(--shadow) / 0.08)',
        gold: '0 10px 24px -12px rgb(201 163 95 / 0.75)'
      },
      keyframes: {
        'fade-in': { from: { opacity: 0 }, to: { opacity: 1 } },
        shimmer: { '100%': { transform: 'translateX(100%)' } }
      },
      animation: { 'fade-in': 'fade-in .2s ease-out', shimmer: 'shimmer 1.4s infinite' }
    }
  },
  plugins: []
};
