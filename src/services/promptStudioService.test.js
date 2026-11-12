import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getCompanyPromptSettings,
  saveCompanyPromptSettings,
  resetCompanyPromptSettings,
  formatCustomPromptAddendum,
  getActivePromptAddendum,
  PROMPT_PRESETS
} from './promptStudioService';
import * as claudeClient from './agents/claudeClient';
import { runGroundingAgent } from './agents/groundingAgent';
import { JOB_TEMPLATES } from '../data/jobTemplates';

describe('Enterprise Custom HR Prompt Studio Service', () => {
  beforeEach(() => {
    resetCompanyPromptSettings();
  });

  it('기본 프롬프트 설정 및 프리셋 3종이 정상 탑재되어야 함', () => {
    const settings = getCompanyPromptSettings();
    expect(settings).toBeDefined();
    expect(settings.companyName).toContain('LG그룹');
    expect(PROMPT_PRESETS.length).toBe(3);
  });

  it('커스텀 인재상 및 금기어를 수정 및 저장할 수 있어야 함', () => {
    saveCompanyPromptSettings({
      companyName: 'LG CNS',
      tabooWords: ['귀사', '퇴사 사유']
    });

    const updated = getCompanyPromptSettings();
    expect(updated.companyName).toBe('LG CNS');
    expect(updated.tabooWords).toContain('퇴사 사유');
  });

  it('formatCustomPromptAddendum이 LLM 전달용 서식 문자열을 올바르게 생성해야 함', () => {
    const addendum = formatCustomPromptAddendum();
    expect(addendum).toContain('[Enterprise Custom HR Requirements]');
    expect(addendum).toContain('LG그룹');
    expect(addendum).toContain('Taboo / Forbidden Words');
  });

  it('저장된 설정이 없으면 에이전트 프롬프트 addendum은 비어 있어야 함', () => {
    expect(getActivePromptAddendum()).toBe('');
  });

  it('저장된 Prompt Studio 설정(회사명/금기어)이 실제 에이전트 프롬프트에 반영되어야 함', async () => {
    saveCompanyPromptSettings({ companyName: '테스트전자', tabooWords: ['귀사', '열정페이'] });

    const spy = vi.spyOn(claudeClient, 'callClaudeJson').mockResolvedValue({
      data: { groundingEvidences: [] },
      modelUsed: 'mock-model'
    });

    await runGroundingAgent({
      name: '김민준',
      jobTemplate: JOB_TEMPLATES[0],
      rawText: '본문'
    });

    const sentPrompt = spy.mock.calls[0][0].prompt;
    expect(sentPrompt).toContain('테스트전자');
    expect(sentPrompt).toContain('열정페이');
    spy.mockRestore();
  });
});
