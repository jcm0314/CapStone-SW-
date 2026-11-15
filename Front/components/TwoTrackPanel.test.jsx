import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import TwoTrackPanel, { computeCombinedTrackScore } from './TwoTrackPanel';

const mockApplicant = {
  id: 'app-1',
  name: '김체크',
  applyJobId: 'tech_backend',
  analysis: {
    summary: {
      totalScore: 80,
      decision: 'INTERVIEW',
      decisionReason: '백엔드 아키텍처 경험이 우수합니다.'
    },
    competencyScores: {
      problem_solving: 85,
      tech_skill: 80
    }
  }
};

const mockJob = {
  id: 'tech_backend',
  competencies: [
    { id: 'problem_solving', name: '문제 해결력' },
    { id: 'tech_skill', name: '기술 깊이' }
  ]
};

describe('TwoTrackPanel', () => {
  it('서류 점수와 면접 점수의 가중 합산 점수를 정확히 계산한다', () => {
    expect(computeCombinedTrackScore(80, 90, 0.5)).toBe(85);
    expect(computeCombinedTrackScore(80, 60, 0.4)).toBe(68);
    expect(computeCombinedTrackScore(80, null, 0.5)).toBeNull();
  });

  it('서류와 면접 점수 차이가 15점 이상이면 편차 주의 배지를 표시한다', () => {
    const { getByLabelText, getByText } = render(
      <TwoTrackPanel applicant={mockApplicant} currentJob={mockJob} onSaveTwoTrack={vi.fn()} />
    );

    const scoreInput = getByLabelText('면접 점수');
    fireEvent.change(scoreInput, { target: { value: '60' } });

    expect(getByText(/서류·면접 편차 20점/)).toBeTruthy();
    expect(getByText('70점')).toBeTruthy();
  });

  it('면접 기록을 입력하고 저장하면 onSaveTwoTrack에 페이로드를 전달한다', () => {
    const onSave = vi.fn();
    const { getByLabelText, getByText } = render(
      <TwoTrackPanel applicant={mockApplicant} currentJob={mockJob} onSaveTwoTrack={onSave} />
    );

    fireEvent.change(getByLabelText('면접 단계'), { target: { value: '2차 임원 면접' } });
    fireEvent.change(getByLabelText('면접 점수'), { target: { value: '90' } });
    fireEvent.change(getByLabelText('면접 판정'), { target: { value: 'PASS' } });
    fireEvent.change(getByLabelText('면접에서 확인된 강점'), { target: { value: '장애 대응 경험이 구체적임' } });
    fireEvent.change(getByLabelText('종합 면접 코멘트'), { target: { value: '최종 합격 추천' } });

    fireEvent.click(getByText('면접 기록 저장'));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith(
      'app-1',
      expect.objectContaining({
        stage: '2차 임원 면접',
        score: 90,
        verdict: 'PASS',
        docWeight: 0.5,
        strengthsNote: '장애 대응 경험이 구체적임',
        summaryNote: '최종 합격 추천'
      })
    );
  });
});
