import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getAtsConfig,
  saveAtsConfig,
  buildAtsPayload,
  syncApplicantToAts,
  getAtsSyncLogs
} from './atsService';

describe('atsService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('테넌트별 ATS 설정을 저장하고 불러온다', () => {
    saveAtsConfig('toss', {
      provider: 'ninehire',
      webhookUrl: 'https://ats.example.com/hook',
      apiKey: 'secret-key',
      autoSync: true
    });
    const loaded = getAtsConfig('toss');
    expect(loaded.provider).toBe('ninehire');
    expect(loaded.webhookUrl).toBe('https://ats.example.com/hook');
    expect(loaded.autoSync).toBe(true);
  });

  it('Webhook URL이 없으면 시뮬레이션 모드로 페이로드를 생성하고 로그를 기록한다', async () => {
    const applicant = {
      id: 'app-10',
      name: '홍길동',
      applyJobId: 'tech_backend',
      applyJobTitle: '소프트웨어 엔지니어',
      analysis: { summary: { totalScore: 88, decision: 'STRONG_PASS', decisionReason: '우수' } }
    };

    const res = await syncApplicantToAts({
      applicant,
      config: { provider: 'greeting', webhookUrl: '' },
      tenant: { id: 'toss', name: '토스' }
    });

    expect(res.ok).toBe(true);
    expect(res.mode).toBe('PREVIEW');
    expect(res.payload.candidate.documentScore).toBe(88);
    expect(getAtsSyncLogs('toss')).toHaveLength(1);
  });

  it('Webhook URL이 있으면 POST 요청을 전송하고 SYNCED 로그를 남긴다', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    const applicant = {
      id: 'app-11',
      name: '김연동',
      analysis: { summary: { totalScore: 91, decision: 'STRONG_PASS' } }
    };

    const res = await syncApplicantToAts({
      applicant,
      config: { provider: 'greenhouse', webhookUrl: 'https://hooks.ats.test/in', apiKey: 'k-1' },
      tenant: { id: 'daangn', name: '당근' },
      fetchImpl: mockFetch
    });

    expect(res.mode).toBe('WEBHOOK');
    expect(mockFetch).toHaveBeenCalledWith(
      'https://hooks.ats.test/in',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'X-ATS-Api-Key': 'k-1' })
      })
    );
    expect(buildAtsPayload(applicant, 'greenhouse').candidate.name).toBe('김연동');
  });
});
