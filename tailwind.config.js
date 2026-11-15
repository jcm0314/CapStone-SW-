/** @type {import('tailwindcss').Config} */
// 색상은 src/index.css 의 CSS 변수(라이트/다크)로 정의합니다.
// UI는 거의 무채색(먹색 버튼, 회색 선)이고, 브랜드 강조색은 형광펜 노랑(accent) 하나입니다.
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./Front/**/*.{js,ts,jsx,tsx}",
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
        // brand = 먹색(주요 버튼·선택 상태). 다크 모드에서는 밝은 회색으로 반전됩니다.
        brand: { DEFAULT: v('brand'), strong: v('brand-strong'), soft: v('brand-soft'), line: v('brand-line'), fg: v('brand-fg') },
        'on-brand': v('on-brand'),
        // accent = 형광펜 노랑 (로고, 선택 표시, 텍스트 선택)
        accent: { DEFAULT: v('accent'), ink: v('accent-ink') },
        ok: { DEFAULT: v('ok'), solid: v('ok-solid'), soft: v('ok-soft'), line: v('ok-line') },
        warn: { DEFAULT: v('warn'), solid: v('warn-solid'), soft: v('warn-soft'), line: v('warn-line') },
        bad: { DEFAULT: v('bad'), solid: v('bad-solid'), soft: v('bad-soft'), line: v('bad-line') },
        hl: { ok: v('hl-ok'), warn: v('hl-warn'), bad: v('hl-bad') }
      },
      fontFamily: {
        sans: ['Pretendard', '"Pretendard Variable"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace']
      },
      borderRadius: {
        card: '6px'
      }
    },
    // 업무 도구 톤: 모서리는 작게(4~6px), 그림자는 거의 쓰지 않고 1px 선으로 구분합니다.
    borderRadius: {
      none: '0',
      sm: '3px',
      DEFAULT: '4px',
      md: '5px',
      lg: '6px',
      xl: '6px',
      '2xl': '8px',
      '3xl': '10px',
      full: '9999px',
      card: '6px'
    },
    boxShadow: {
      none: 'none',
      sm: 'none',
      DEFAULT: 'none',
      md: 'none',
      lg: 'none',
      xl: 'none',
      '2xl': '0 8px 24px -8px rgb(0 0 0 / 0.18)',
      inner: 'none',
      card: 'none',
      pop: '0 10px 30px -10px rgb(0 0 0 / 0.22), 0 0 0 1px rgb(0 0 0 / 0.04)'
    }
  },
  plugins: [],
}
