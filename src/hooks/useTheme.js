import { useCallback, useEffect, useState } from 'react';

export const THEME_STORAGE_KEY = 'checkmate_theme';

function readStoredTheme() {
  try {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    return saved === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

/**
 * 라이트(기본) / 다크 테마 전환.
 * - <html class="dark"> 토글 + localStorage 저장 (접근 불가 환경에서는 저장만 건너뜀)
 * - index.html 의 인라인 스크립트가 첫 렌더 전에 같은 키를 읽어 깜빡임을 막습니다.
 */
export function useTheme() {
  const [theme, setTheme] = useState(() => (typeof window === 'undefined' ? 'light' : readStoredTheme()));

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#0C0F15' : '#F6F7F9');
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // 저장소 접근 불가(시크릿 모드 등) — 현재 세션에서만 유지
    }
  }, [theme]);

  const toggleTheme = useCallback(() => setTheme((t) => (t === 'dark' ? 'light' : 'dark')), []);

  return { theme, setTheme, toggleTheme };
}
