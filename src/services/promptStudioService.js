/**
 * Custom HR Prompt Studio Service
 * Manages enterprise-specific talent profiles, core values, taboo words, and prompt instructions.
 */

const PROMPT_STUDIO_STORAGE_KEY = 'HR_AX_PROMPT_STUDIO_SETTINGS';

export const PROMPT_PRESETS = [
  {
    id: 'lg_group',
    name: 'LG그룹 인재상 (정정도경 & 고객 가치)',
    companyName: 'LG그룹',
    coreValues: ['고객 가치 창조', '인간 존중의 경영', '정정당당한 승부(정도경영)', '자율과 책임'],
    tabooWords: ['귀사', '타사명 언급', '불분명한 퇴사사유', '근거없는 수식어'],
    customInstruction: 'LG 정도경영 철학에 부합하도록 정직성과 고객 관점의 정량 성과를 최우선으로 검증하세요.'
  },
  {
    id: 'tech_startup',
    name: 'IT / 테크 스타트업 (몰입 & 빠른 실행)',
    companyName: '테크 스타트업',
    coreValues: ['빠른 시도와 피드백', '주도적 임팩트', '수치 기반 직무 기술성', '솔직한 소통'],
    tabooWords: ['지시대로 수행', '수동적 조력자', '추상적 목표만 기술'],
    customInstruction: '대용량 트래픽 처리, 오케스트레이션, 코드 최적화 등 실질적 기술 스택과 실행력을 집중 평가하세요.'
  },
  {
    id: 'finance_enterprise',
    name: '금융 / 보안 대기업 (신뢰 & 리스크 관리)',
    companyName: '금융보안그룹',
    coreValues: ['철저한 리스크 관리', '고객 신뢰 준수', '컴플라이언스 이해', '데이터 정합성'],
    tabooWords: ['보안 지침 무시', '독단적 결정', '확인되지 않은 테스트'],
    customInstruction: '법적 규제 및 정보보호 지침 준수 의식과 리스크 예방 관점의 서술을 집중 검증하세요.'
  }
];

export const DEFAULT_PROMPT_SETTINGS = {
  companyName: 'LG그룹 AX 본부',
  coreValues: PROMPT_PRESETS[0].coreValues,
  tabooWords: PROMPT_PRESETS[0].tabooWords,
  customInstruction: PROMPT_PRESETS[0].customInstruction
};

/**
 * Gets active prompt settings from localStorage or defaults
 */
export function getCompanyPromptSettings() {
  try {
    const data = localStorage.getItem(PROMPT_STUDIO_STORAGE_KEY);
    if (data) {
      return { ...DEFAULT_PROMPT_SETTINGS, ...JSON.parse(data) };
    }
  } catch (err) {
    console.warn('Failed to read prompt studio settings:', err);
  }
  return DEFAULT_PROMPT_SETTINGS;
}

/**
 * Saves prompt settings to localStorage
 */
export function saveCompanyPromptSettings(settings) {
  try {
    const updated = { ...getCompanyPromptSettings(), ...settings };
    localStorage.setItem(PROMPT_STUDIO_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.warn('Failed to save prompt studio settings:', err);
  }
  return settings;
}

/**
 * Resets settings to default LG Group preset
 */
export function resetCompanyPromptSettings() {
  try {
    localStorage.removeItem(PROMPT_STUDIO_STORAGE_KEY);
  } catch (err) {
    console.warn('Failed to reset prompt studio settings:', err);
  }
  return DEFAULT_PROMPT_SETTINGS;
}

/**
 * Formats custom prompt addendum for LLM prompt generation
 */
export function formatCustomPromptAddendum(settings = getCompanyPromptSettings()) {
  return `
[Enterprise Custom HR Requirements]:
- Company Name: ${settings.companyName}
- Company Core Values: ${settings.coreValues.join(', ')}
- Taboo / Forbidden Words (Flag as Risk if found): ${settings.tabooWords.join(', ')}
- Custom Evaluation Rationale: ${settings.customInstruction}
`;
}
