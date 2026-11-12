/** @type {import('tailwindcss').Config} */
// 색상은 src/index.css 의 CSS 변수(라이트/다크)로 정의합니다.
// 컴포넌트에서는 bg-surface / text-fg / border-line / bg-brand 같은 의미 토큰만 사용합니다.
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: v('canvas'),
        surface: v('surface'),
        subtle: v('subtle'),
        muted: v('muted'),
        line: { DEFAULT: v('line'), strong: v('line-strong') },
        fg: { DEFAULT: v('fg'), muted: v('fg-muted'), subtle: v('fg-subtle') },
        brand: { DEFAULT: v('brand'), strong: v('brand-strong'), soft: v('brand-soft'), line: v('brand-line'), fg: v('brand-fg') },
        ok: { DEFAULT: v('ok'), solid: v('ok-solid'), soft: v('ok-soft'), line: v('ok-line') },
        warn: { DEFAULT: v('warn'), solid: v('warn-solid'), soft: v('warn-soft'), line: v('warn-line') },
        bad: { DEFAULT: v('bad'), solid: v('bad-solid'), soft: v('bad-soft'), line: v('bad-line') },
        hl: { ok: v('hl-ok'), warn: v('hl-warn'), bad: v('hl-bad') }
      },
      fontFamily: {
        sans: ['Pretendard', '"Pretendard Variable"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace']
      },
      boxShadow: {
        card: '0 1px 2px rgb(15 23 42 / 0.04), 0 1px 3px rgb(15 23 42 / 0.04)',
        pop: '0 12px 32px -8px rgb(15 23 42 / 0.18), 0 4px 8px -4px rgb(15 23 42 / 0.08)'
      },
      borderRadius: {
        card: '14px'
      }
    },
  },
  plugins: [],
}
