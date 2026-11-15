import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  generateShareId,
  createSharedEvaluation,
  getSharedEvaluation,
  addCollaborativeNote
} from './shareService';

describe('shareService (Multi-Interviewer Live Sync & Share ID)', () => {
  beforeEach(() => {
    localStorage.clear();
    // 게이트웨이 미가동(오프라인) 상황을 명시적으로 모킹: 실제 네트워크/로컬 포트 상태에 의존하지 않음
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network offline (mocked)')));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const mockApplicant = {
    id: 'app_test_01',
    name: '김지원',
    orgId: 'toss-payments',
    applyJobId: 'dev',
    rawText: '대규모 결제 트래픽 튜닝 경험',
    analysis: {
      summary: { totalScore: 90, decision: 'STRONG_PASS', decisionReason: '우수' },
      competencies: [],
      groundingEvidences: []
    }
  };

  it('generateShareId는 eval_ 접두사를 가진 고유 식별자를 생성해야 한다', () => {
    const id1 = generateShareId();
    const id2 = generateShareId();
    expect(id1).toMatch(/^eval_[a-z0-9]+$/);
    expect(id2).toMatch(/^eval_[a-z0-9]+$/);
    expect(id1).not.toBe(id2);
  });

  it('createSharedEvaluation은 유효한 URL과 만료일을 생성하고 저장해야 한다', async () => {
    const result = await createSharedEvaluation(mockApplicant, {
      expiresHours: 24,
      creatorName: '홍길동',
      creatorRole: 'RECRUITER'
    });

    expect(result.shareId).toBeDefined();
    expect(result.shareUrl).toContain(`?share=${result.shareId}`);
    expect(result.expiresAt).toBeDefined();

    // 저장된 데이터 복원 검증
    const loaded = await getSharedEvaluation(result.shareId);
    expect(loaded).not.toBeNull();
    expect(loaded.applicantSnapshot.name).toBe('김지원');
    expect(loaded.createdBy.name).toBe('홍길동');
    expect(loaded.collaborativeNotes.length).toBeGreaterThan(0);
  });

  it('만료된 공유 링크는 에러를 반환해야 한다', async () => {
    // 만료 시간을 과거(-1시간)로 설정
    const result = await createSharedEvaluation(mockApplicant, {
      expiresHours: -1
    });

    await expect(getSharedEvaluation(result.shareId)).rejects.toThrow('만료되었습니다');
  });

  it('addCollaborativeNote는 면접관의 실시간 코멘트 및 점수 보정을 추가해야 한다', async () => {
    const { shareId } = await createSharedEvaluation(mockApplicant);

    const updated = await addCollaborativeNote(shareId, {
      author: '박도현 팀장',
      role: 'INTERVIEWER',
      content: '동시성 제어 질문에 매우 명확하게 답변함.',
      scoreAdjustment: 5
    });

    expect(updated.collaborativeNotes.length).toBe(2);
    const addedNote = updated.collaborativeNotes[1];
    expect(addedNote.author).toBe('박도현 팀장');
    expect(addedNote.scoreAdjustment).toBe(5);
    expect(addedNote.content).toContain('동시성 제어');
  });
});
