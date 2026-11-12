import { describe, it, expect, vi } from 'vitest';
import { executeMultiAgentEvaluation } from './multiAgentEvaluator';
import { JOB_TEMPLATES } from '../data/jobTemplates';
import * as claudeClient from './agents/claudeClient';

describe('HR Multi-Agent 4-Stage Orchestrator Engine', () => {
  const sampleJob = JOB_TEMPLATES[0];
  const sampleText = '응답 속도가 3초로 느린 문제를 발견하고 Redis 캐싱 기법을 도입하여 0.4초로 86.6% 단축시켰습니다. 팀원 간의 소통을 위해 주간 코드 리뷰 문화를 도입했습니다.';

  it('4대 에이전트 순차 체이닝 파이프라인이 정상적으로 실행되어 종합 분석 결과를 생성해야 함', async () => {
    // Mock callClaudeJson for each of the 4 agents (no network)
    const mockCall = vi.spyOn(claudeClient, 'callClaudeJson');

    // 1st call: Grounding Agent
    mockCall.mockResolvedValueOnce({
      data: {
        groundingEvidences: [
          {
            quote: 'Redis 캐싱 기법을 도입하여 0.4초로 86.6% 단축시켰습니다.',
            type: 'positive',
            competencyId: 'problem_solving',
            scoreImpact: 15,
            title: '정량 지표 개선',
            explanation: 'Redis 캐싱을 통한 성능 최적화 증명'
          }
        ],
        agentSummary: '1건의 정량적 근거 발췌 완료'
      },
      modelUsed: 'claude-opus-5-5'
    });

    // 2nd call: Critic Agent
    mockCall.mockResolvedValueOnce({
      data: {
        aiTextProbability: 10,
        exaggerationRisk: 'LOW',
        critiqueNotes: '정량 수치 지표의 신뢰성 우수',
        flaggedQuotes: [],
        recommendedPenalty: 0
      },
      modelUsed: 'claude-opus-5-5'
    });

    // 3rd call: Supervisor Agent
    mockCall.mockResolvedValueOnce({
      data: {
        summary: {
          totalScore: 92,
          decision: 'STRONG_PASS',
          decisionReason: '실무 즉시 투입 가능한 백엔드 성능 최적화 역량 보유',
          aiTextProbability: 10
        },
        competencyScores: {
          problem_solving: 95,
          tech_skill: 92,
          teamwork: 88,
          growth: 85,
          ethics: 90
        },
        executiveComments: '서류 우수 추천'
      },
      modelUsed: 'claude-opus-5-5'
    });

    // 4th call: Interviewer Agent
    mockCall.mockResolvedValueOnce({
      data: {
        interviewQuestions: [
          {
            basedQuote: 'Redis 캐싱 기법을 도입하여 0.4초로 86.6% 단축시켰습니다.',
            category: '기술적 사실 검증',
            question: 'Redis 캐시 장애(Down) 시 서비스 지속성을 위해 어떤 폴백 메커니즘을 구성하셨습니까?',
            intent: '캐시 아키텍처 장애 복원력 검증',
            checklist: ['장애 대응 방안 유무', '실제 측정 여부']
          }
        ]
      },
      modelUsed: 'claude-opus-5-5'
    });

    const progressLogs = [];
    const result = await executeMultiAgentEvaluation({
      name: '김민준',
      jobTemplate: sampleJob,
      cleanText: sampleText,
      originalRawText: sampleText,
      onProgress: (p) => progressLogs.push(p)
    });

    // 4단계 에이전트가 모두 호출되었는지 확인
    expect(mockCall).toHaveBeenCalledTimes(4);

    // 블라인드 채용: 외부 LLM으로 전송되는 프롬프트에 지원자 성명이 포함되면 안 됨
    mockCall.mock.calls.forEach(([args]) => {
      expect(args.prompt).not.toContain('김민준');
    });

    // 결과 객체 구조 검증
    expect(result.mode).toBe('MULTI_AGENT_ENSEMBLE');
    expect(result.agentMetadata).toBeDefined();
    expect(result.agentMetadata.executedAgents.length).toBe(4);
    expect(result.analysis.summary.totalScore).toBe(92);
    expect(result.analysis.summary.decision).toBe('STRONG_PASS');
    expect(result.analysis.groundingEvidences.length).toBe(1);
    expect(result.analysis.interviewQuestions.length).toBe(1);

    // 프로그레스 콜백이 각 에이전트 단계를 거쳤는지 확인
    expect(progressLogs.some(p => p.currentAgent === 'Grounding Agent')).toBe(true);
    expect(progressLogs.some(p => p.currentAgent === 'Critic Agent')).toBe(true);
    expect(progressLogs.some(p => p.currentAgent === 'Supervisor Agent')).toBe(true);
    expect(progressLogs.some(p => p.currentAgent === 'Interviewer Agent')).toBe(true);

    mockCall.mockRestore();
  });

  const groundingOk = {
    data: {
      groundingEvidences: [{ quote: 'Redis 캐싱 기법을 도입하여 0.4초로 86.6% 단축시켰습니다.', type: 'positive', competencyId: 'problem_solving', scoreImpact: 10, title: 't', explanation: 'e' }],
      agentSummary: 'ok'
    },
    modelUsed: 'claude-opus-5-5'
  };
  const criticOk = {
    data: { aiTextProbability: 10, exaggerationRisk: 'LOW', critiqueNotes: 'ok', flaggedQuotes: [], recommendedPenalty: 0 },
    modelUsed: 'claude-opus-5-5'
  };

  it('Supervisor Agent가 실패하면 가짜 점수(78점 등) 없이 평가 자체가 실패해야 함', async () => {
    const mockCall = vi.spyOn(claudeClient, 'callClaudeJson').mockImplementation(async ({ prompt }) => {
      if (prompt.includes('Grounding Agent"입니다')) return groundingOk;
      if (prompt.includes('Critic Agent (비판적 검증관)')) return criticOk;
      if (prompt.includes('Supervisor Agent (최종 의사결정')) throw new Error('Claude API 오류(500): overloaded');
      return { data: { interviewQuestions: [] }, modelUsed: 'claude-opus-5-5' };
    });

    await expect(executeMultiAgentEvaluation({
      name: '김민준', jobTemplate: sampleJob, cleanText: sampleText, originalRawText: sampleText
    })).rejects.toThrow(/overloaded/);

    mockCall.mockRestore();
  });

  it('Interviewer Agent만 실패하면 점수는 유지하고 면접 질문 없이 DEGRADED로 표시해야 함', async () => {
    const mockCall = vi.spyOn(claudeClient, 'callClaudeJson').mockImplementation(async ({ prompt }) => {
      if (prompt.includes('Grounding Agent"입니다')) return groundingOk;
      if (prompt.includes('Critic Agent (비판적 검증관)')) return criticOk;
      if (prompt.includes('Supervisor Agent (최종 의사결정')) {
        return {
          data: {
            summary: { totalScore: 81, decision: 'INTERVIEW', decisionReason: 'r', aiTextProbability: 10 },
            competencyScores: { problem_solving: 80, tech_skill: 82, teamwork: 80, growth: 80, ethics: 80 },
            executiveComments: 'c'
          },
          modelUsed: 'claude-opus-5-5'
        };
      }
      throw new Error('interviewer down');
    });

    const result = await executeMultiAgentEvaluation({
      name: '김민준', jobTemplate: sampleJob, cleanText: sampleText, originalRawText: sampleText
    });

    expect(result.analysis.summary.totalScore).toBe(81);
    expect(result.analysis.interviewQuestions).toEqual([]);
    expect(result.agentMetadata.executedAgents[3].status).toBe('DEGRADED_FALLBACK');
    mockCall.mockRestore();
  });

  it('server에서 전달된 promptAddendum이 4개 에이전트 프롬프트 모두에 들어가야 함', async () => {
    const mockCall = vi.spyOn(claudeClient, 'callClaudeJson').mockImplementation(async ({ prompt }) => {
      if (prompt.includes('Grounding Agent"입니다')) return groundingOk;
      if (prompt.includes('Critic Agent (비판적 검증관)')) return criticOk;
      if (prompt.includes('Supervisor Agent (최종 의사결정')) {
        return {
          data: {
            summary: { totalScore: 70, decision: 'HOLD', decisionReason: 'r', aiTextProbability: 10 },
            competencyScores: { problem_solving: 70, tech_skill: 70, teamwork: 70, growth: 70, ethics: 70 },
            executiveComments: ''
          },
          modelUsed: 'claude-opus-5-5'
        };
      }
      return { data: { interviewQuestions: [] }, modelUsed: 'claude-opus-5-5' };
    });

    await executeMultiAgentEvaluation({
      name: '김민준', jobTemplate: sampleJob, cleanText: sampleText, originalRawText: sampleText,
      promptAddendum: '[Enterprise Custom HR Requirements]: 고객집착-테스트'
    });

    expect(mockCall).toHaveBeenCalledTimes(4);
    mockCall.mock.calls.forEach(([args]) => {
      expect(args.prompt).toContain('고객집착-테스트');
      expect(args.schema).toBeDefined();
    });
    mockCall.mockRestore();
  });
});
