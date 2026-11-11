import { describe, it, expect } from 'vitest';
import { TENANTS } from '../contexts/TenantContext';
import { JOB_TEMPLATES } from './jobTemplates';

// docs/ARCHITECTURE.md §3 ApplicantAnalysis 표준 스키마 회귀 테스트
describe('테넌트 기본 지원자 데이터 표준 스키마', () => {
  const jobIds = JOB_TEMPLATES.map(j => j.id);
  const competencyIds = JOB_TEMPLATES[0].competencies.map(c => c.id);

  TENANTS.forEach(tenant => {
    describe(`${tenant.id}`, () => {
      it('모든 기본 지원자가 표준 스키마 필드를 가져야 한다', () => {
        expect(tenant.defaultApplicants.length).toBeGreaterThan(0);

        tenant.defaultApplicants.forEach(app => {
          expect(app.id).toBeTruthy();
          expect(app.orgId).toBe(tenant.id);
          expect(jobIds).toContain(app.applyJobId);
          expect(typeof app.rawText).toBe('string');

          const { summary, competencyScores, groundingEvidences, interviewQuestions } = app.analysis;
          expect(typeof summary.totalScore).toBe('number');
          expect(['STRONG_PASS', 'INTERVIEW', 'HOLD', 'REJECT']).toContain(summary.decision);

          competencyIds.forEach(cid => {
            expect(typeof competencyScores[cid]).toBe('number');
          });

          const evIds = new Set();
          groundingEvidences.forEach(ev => {
            expect(ev.id).toBeTruthy();
            evIds.add(ev.id);
            expect(['positive', 'risk', 'verify']).toContain(ev.type);
            expect(typeof ev.title).toBe('string');
            expect(typeof ev.explanation).toBe('string');
            expect(typeof ev.scoreImpact).toBe('number');
            // quote는 본문에 실제로 존재해야 1:1 하이라이트가 가능하다
            expect(app.rawText).toContain(ev.quote);
          });
          expect(evIds.size).toBe(groundingEvidences.length);

          interviewQuestions.forEach(iq => {
            expect(iq.id).toBeTruthy();
            expect(typeof iq.question).toBe('string');
            expect(typeof iq.category).toBe('string');
            expect(Array.isArray(iq.checklist)).toBe(true);
          });
        });
      });
    });
  });
});
