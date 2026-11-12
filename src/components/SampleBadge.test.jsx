import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import ReportExporter from './ReportExporter';
import { SAMPLE_APPLICANTS } from '../data/sampleApplicants';
import { JOB_TEMPLATES } from '../data/jobTemplates';

describe('샘플 데이터 배지 (#26)', () => {
  const job = JOB_TEMPLATES[0];

  it('샘플 결과의 보고서에는 "샘플 데이터" 배지와 안내 문구가 보인다', () => {
    const { getAllByTestId, getByText } = render(
      <ReportExporter result={SAMPLE_APPLICANTS[0]} currentJob={job} onClose={() => {}} />
    );
    expect(getAllByTestId('sample-badge').length).toBeGreaterThan(0);
    expect(getByText(/AI를 실행하지 않은 예시 결과입니다/)).toBeTruthy();
  });

  it('실제 AI 평가 결과(새 ID, 플래그 없음)에는 배지가 없다', () => {
    const { isSample, ...rest } = SAMPLE_APPLICANTS[0];
    const realResult = { ...rest, id: 'app_1731390000000' };
    const { queryAllByTestId } = render(
      <ReportExporter result={realResult} currentJob={job} onClose={() => {}} />
    );
    expect(queryAllByTestId('sample-badge').length).toBe(0);
  });
});
