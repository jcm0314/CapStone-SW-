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

  it('지원자가 없으면 시작 안내를 보여 주고, 업로드·붙여넣기로 시작한다', () => {
    const onPaste = vi.fn();
    const onUpload = vi.fn();
    const { getByText, getByRole } = render(
      <ApplicantList applicants={[]} selectedId={null} onOpen={() => {}} onNew={() => {}} onUpload={onUpload} onPaste={onPaste} />
    );
    expect(getByText(/AI가 점수와 근거 문장을 보여줍니다/)).toBeTruthy();
    fireEvent.click(getByRole('button', { name: /PDF · TXT 올리기/ }));
    expect(onUpload).toHaveBeenCalled();
    fireEvent.click(getByRole('button', { name: /직접 붙여넣기/ }));
    expect(onPaste).toHaveBeenCalled();
  });

  it('보고서 버튼은 결과 화면을 열지 않고 보고서만 연다', () => {
    const onOpen = vi.fn();
    const onOpenReport = vi.fn();
    const { getAllByLabelText } = render(
      <ApplicantList applicants={applicants} selectedId={null} onOpen={onOpen} onNew={() => {}} onOpenReport={onOpenReport} />
    );
    fireEvent.click(getAllByLabelText('지원자 A 평가 보고서')[0]);
    expect(onOpenReport).toHaveBeenCalledWith(expect.objectContaining({ name: '지원자 A' }));
    expect(onOpen).not.toHaveBeenCalled();
  });
});
