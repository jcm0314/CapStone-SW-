import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
import CommandPalette from './CommandPalette';
import { FEATURES } from '../data/featureCatalog';
import { useTheme, THEME_STORAGE_KEY } from '../hooks/useTheme';

const items = FEATURES.map((f) => ({ ...f, group: f.status === 'ready' ? '기능' : '준비 중' }));

describe('기능 목록 (#29)', () => {
  it('구현됨 9개, 준비 중 6개이며 구현된 기능은 모두 이동 동작을 가진다', () => {
    const ready = FEATURES.filter((f) => f.status === 'ready');
    const planned = FEATURES.filter((f) => f.status === 'planned');
    expect(ready).toHaveLength(9);
    expect(planned).toHaveLength(6);
    ready.forEach((f) => expect(f.action).toBeTruthy());
    planned.forEach((f) => expect(f.action).toBeUndefined());
  });
});

describe('CommandPalette', () => {
  it('검색어로 기능을 거르고 Enter 로 선택한다', () => {
    const onSelect = vi.fn();
    const { getByLabelText, queryByText } = render(
      <CommandPalette isOpen onClose={() => {}} items={items} onSelect={onSelect} />
    );
    const input = getByLabelText('기능 검색어');
    fireEvent.change(input, { target: { value: 'ATS' } });
    expect(queryByText('면접 질문 생성')).toBeNull();
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'ats', status: 'planned' }));
  });

  it('결과가 없으면 안내 문구를 보여 주고, Esc 로 닫힌다', () => {
    const onClose = vi.fn();
    const { getByLabelText, getByText } = render(
      <CommandPalette isOpen onClose={onClose} items={items} onSelect={() => {}} />
    );
    const input = getByLabelText('기능 검색어');
    fireEvent.change(input, { target: { value: 'zzzz없는기능' } });
    expect(getByText(/맞는 기능이 없습니다/)).toBeTruthy();
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});

describe('useTheme', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  function Probe() {
    const { theme, toggleTheme } = useTheme();
    return <button onClick={toggleTheme}>{theme}</button>;
  }

  it('기본은 라이트이고, 전환하면 html.dark 와 localStorage 에 저장된다', () => {
    const { getByRole } = render(<Probe />);
    expect(getByRole('button').textContent).toBe('light');
    act(() => fireEvent.click(getByRole('button')));
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });
});
