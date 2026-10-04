import { describe, it, expect, beforeEach } from 'vitest';
import {
  getCompanyPromptSettings,
  saveCompanyPromptSettings,
  resetCompanyPromptSettings,
  formatCustomPromptAddendum,
  PROMPT_PRESETS
} from './promptStudioService';

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
});
