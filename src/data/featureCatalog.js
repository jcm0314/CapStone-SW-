// 기능 메뉴 / ⌘K 검색에서 함께 쓰는 기능 목록.
// status: 'ready' = 구현됨 (선택 시 해당 화면으로 이동), 'planned' = 준비 중 (안내만 표시)

export const FEATURE_STATUS = {
  ready: { label: '구현됨', chip: 'chip-ok' },
  planned: { label: '준비 중', chip: 'chip-neutral' }
};

export const FEATURES = [
  {
    id: 'evidence',
    short: '근거 문장 형광펜',
    status: 'ready',
    icon: 'Highlighter',
    title: '서류 평가 · 근거 문장 형광펜',
    desc: '점수의 근거가 된 문장을 원문에 형광펜으로 표시',
    keywords: '평가 근거 형광펜 하이라이트 자소서 서류 grounding',
    action: { type: 'scroll', tab: 'evaluator', target: 'section-evidence' }
  },
  {
    id: 'questions',
    short: '면접 질문 생성',
    status: 'ready',
    icon: 'MessagesSquare',
    title: '면접 질문 생성',
    desc: '검증이 필요한 문장에서 뽑은 맞춤 면접 질문',
    keywords: '면접 질문 인터뷰 interview',
    action: { type: 'scroll', tab: 'evaluator', target: 'section-questions' }
  },
  {
    id: 'hitl',
    short: '사람 검토(HITL) 보정',
    status: 'ready',
    icon: 'UserCheck',
    title: '사람 검토(HITL) 보정',
    desc: 'AI 점수와 근거를 담당자가 직접 고치고 기록',
    keywords: 'hitl 보정 검토 수정 점수 사람',
    action: { type: 'modal', modal: 'hitl' }
  },
  {
    id: 'share',
    short: '면접관 공유 · 메모',
    status: 'ready',
    icon: 'Share2',
    title: '면접관 공유 링크 · 메모',
    desc: '링크 하나로 면접관과 결과를 공유하고 메모 남기기',
    keywords: '공유 링크 면접관 메모 협업 share',
    action: { type: 'modal', modal: 'share' }
  },
  {
    id: 'compare',
    short: '비교 · 표절 · 상위 N명',
    status: 'ready',
    icon: 'Users',
    title: '지원자 비교 · 표절 매트릭스 · 상위 N명 컷오프',
    desc: '가중치 조절, 순위·컷오프, 자소서 간 유사도 확인',
    keywords: '비교 표절 유사도 컷오프 순위 top-n 랭킹',
    action: { type: 'tab', tab: 'comparison' }
  },
  {
    id: 'report',
    short: '평가 보고서 출력',
    status: 'ready',
    icon: 'Printer',
    title: '평가 보고서 출력',
    desc: '인쇄 · PDF 저장 · CSV 다운로드 · 텍스트 복사',
    keywords: '보고서 출력 인쇄 pdf csv 엑셀 report',
    action: { type: 'modal', modal: 'report' }
  },
  {
    id: 'upload',
    short: 'PDF / TXT 업로드',
    status: 'ready',
    icon: 'Upload',
    title: 'PDF / TXT 업로드',
    desc: '파일 여러 개를 올려 한 번에 평가',
    keywords: '업로드 파일 pdf txt docx 일괄',
    action: { type: 'upload' }
  },
  {
    id: 'feedback',
    short: '지원자 피드백 리포트',
    status: 'ready',
    icon: 'Sprout',
    title: '지원자 피드백 리포트',
    desc: '지원자에게 보낼 성장 피드백 문서 만들기',
    keywords: '피드백 리포트 지원자 코칭',
    action: { type: 'modal', modal: 'feedback' }
  },
  {
    id: 'tenant',
    short: '회사(테넌트) 전환',
    status: 'ready',
    icon: 'Building2',
    title: '회사(테넌트) 전환',
    desc: '회사별로 분리된 지원자 목록 사이를 전환',
    keywords: '회사 테넌트 전환 계정 역할 sso',
    action: { type: 'modal', modal: 'profile' }
  },
  {
    id: 'notify',
    short: '합격/불합격 일괄 통보',
    status: 'planned',
    icon: 'Send',
    title: '합격/불합격 일괄 통보 (메일·문자)',
    desc: '결과를 지원자에게 한 번에 알리기',
    keywords: '통보 메일 문자 알림 합격 불합격'
  },
  {
    id: 'two-track',
    short: '서류 ↔ 면접 2-Track',
    status: 'planned',
    icon: 'Columns2',
    title: '서류 ↔ 면접 2-Track 화면',
    desc: '서류 평가와 면접 기록을 나란히 보기',
    keywords: '2트랙 서류 면접 투트랙'
  },
  {
    id: 'tag-weights',
    short: '태그형 가중치',
    status: 'planned',
    icon: 'Tags',
    title: '태그형 가중치 설정',
    desc: '역량 태그로 가중치를 빠르게 지정',
    keywords: '태그 가중치 설정'
  },
  {
    id: 'per-question',
    short: '자소서 문항별 평가',
    status: 'planned',
    icon: 'ListOrdered',
    title: '자소서 문항별 평가',
    desc: '문항마다 따로 점수와 근거 보기',
    keywords: '문항 문항별 평가'
  },
  {
    id: 'keyword-questions',
    short: '면접 키워드 질문',
    status: 'planned',
    icon: 'Hash',
    title: '면접 키워드 태그 질문',
    desc: '키워드 태그로 면접 질문 묶어 보기',
    keywords: '키워드 태그 면접 질문'
  },
  {
    id: 'ats',
    short: 'ATS 연동',
    status: 'planned',
    icon: 'Plug',
    title: 'ATS 연동',
    desc: '채용 관리 시스템과 지원자 데이터 연동',
    keywords: 'ats 연동 채용관리 그리팅 리멤버'
  }
];

export const PLANNED_MESSAGE = '준비 중인 기능입니다.';
