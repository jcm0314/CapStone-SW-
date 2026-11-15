import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import ApplicantList from './ApplicantList';

const applicants = [
  {
    id: 'candidate-a',
    name: '지원자 A',
    analysis: { summary: { totalScore: 80, decision: 'STRONG_PASS' } }
  },
  {
    id: 'candidate-b',
    name: '지원자 B',
    analysis: { summary: { totalScore: 40, decision: 'REJECT' } }
  }
];

describe('ApplicantList (첫 화면 지원자 목록)', () => {
  it('지원자 행을 누르면 해당 지원자로 결과 화면을 연다', () => {
    const onOpen = vi.fn();
    const { getByLabelText } = render(
      <ApplicantList applicants={applicants} selectedId={null} onOpen={onOpen} onNew={() => {}} />
    );
    fireEvent.click(getByLabelText('지원자 B 평가 결과 열기'));
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ name: '지원자 B' }));
  });

  it('판정 탭으로 걸러 본다', () => {
    const { getByRole, queryByLabelText } = render(
      <ApplicantList applicants={applicants} selectedId={null} onOpen={() => {}} onNew={() => {}} />
    );
    fireEvent.click(getByRole('tab', { name: /탈락 권장/ }));
    expect(queryByLabelText('지원자 B 평가 결과 열기')).toBeTruthy();
    expect(queryByLabelText('지원자 A 평가 결과 열기')).toBeNull();
  });

  it('지원자가 없으면 새 평가 안내를 보여 준다', () => {
    const onNew = vi.fn();
    const { getByText, getAllByRole } = render(
      <ApplicantList applicants={[]} selectedId={null} onOpen={() => {}} onNew={onNew} />
    );
    expect(getByText('아직 평가한 지원자가 없습니다.')).toBeTruthy();
    fireEvent.click(getAllByRole('button', { name: /새 평가/ })[1]);
    expect(onNew).toHaveBeenCalled();
  });
});
