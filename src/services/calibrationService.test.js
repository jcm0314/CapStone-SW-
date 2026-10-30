import { describe, it, expect, beforeEach } from 'vitest';
import {
  recordHitlCalibration,
  getHitlCalibrations,
  formatCalibrationFewShotAddendum
} from './calibrationService';

describe('Enterprise HITL Few-Shot Calibration Memory Service', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('인사담당자의 점수 보정 이력을 테넌트 및 직무별로 저장하고 조회해야 함', () => {
    recordHitlCalibration({
      tenantId: 'toss-payments',
      jobId: 'dev',
      originalScore: 78,
      calibratedScore: 88,
      originalDecision: 'INTERVIEW',
      calibratedDecision: 'STRONG_PASS',
      reviewerNote: '대규모 결제 트랜잭션 튜닝 실무 경험을 높이 평가함'
    });

    const list = getHitlCalibrations('toss-payments', 'dev');
    expect(list.length).toBe(1);
    expect(list[0].scoreDelta).toBe(10);
    expect(list[0].calibratedDecision).toBe('STRONG_PASS');
  });

  it('누적된 HITL 보정 이력을 Supervisor Agent 주입용 Few-Shot 프롬프트로 포맷팅해야 함', () => {
    recordHitlCalibration({
      tenantId: 'daangn',
      jobId: 'dev',
      originalScore: 85,
      calibratedScore: 75,
      originalDecision: 'STRONG_PASS',
      calibratedDecision: 'INTERVIEW',
      reviewerNote: '팀 프로젝트에서 개인 기여도 증명이 부족하여 하향 보정'
    });

    const promptText = formatCalibrationFewShotAddendum('daangn', 'dev');
    expect(promptText).toContain('기업 전용 HITL Few-Shot Calibration Memory');
    expect(promptText).toContain('-10점');
    expect(promptText).toContain('개인 기여도 증명이 부족하여 하향 보정');
  });
});
