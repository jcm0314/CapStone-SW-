import { describe, it, expect } from 'vitest';
import { parseCoverLetterQuestions, buildQuestionEvaluations } from './questionParser';

describe('questionParser', () => {
  it('번호가 매겨진 자소서 문항을 제목과 본문으로 분리한다', () => {
    const raw = `1. 지원 동기 및 입사 후 포부
대규모 트래픽 환경에서 안정적인 백엔드를 구축하고자 지원했습니다.

2. 문제 해결 경험
장애 원인을 로그 기반으로 추적하여 응답 시간을 40% 단축했습니다.`;

    const sections = parseCoverLetterQuestions(raw);
    expect(sections).toHaveLength(2);
    expect(sections[0].question).toContain('지원 동기');
    expect(sections[1].answer).toContain('응답 시간을 40% 단축');
  });

  it('문항별 점수와 근거(하이라이트 매칭)를 생성한다', () => {
    const applicant = {
      rawText: `1. 직무 역량
Kafka와 Redis를 활용한 비동기 파이프라인을 설계했습니다. 대용량 트래픽 환경에서 메시지 유실 없이 안정적으로 이벤트를 처리하도록 컨슈머 그룹을 튜닝하고 모니터링을 구축했습니다.

2. 협업 경험
팀 내 코드 리뷰 문화를 정착시켰습니다. 매주 아키텍처 리뷰 세션을 운영하며 신규 입사자 온보딩 문서화와 장애 회고 프로세스를 주도적으로 개선하여 배포 안정성과 개발 생산성을 크게 높였습니다.`,
      analysis: {
        summary: { totalScore: 80 },
        highlights: [
          { quote: 'Kafka와 Redis를 활용한 비동기 파이프라인', type: 'positive', reason: '핵심 기술 스택 검증됨' }
        ]
      }
    };

    const evals = buildQuestionEvaluations(applicant);
    expect(evals).toHaveLength(2);
    expect(evals[0].score).toBe(83);
    expect(evals[0].rationale).toContain('핵심 기술 스택 검증됨');
    expect(evals[1].score).toBe(80);
  });
});
