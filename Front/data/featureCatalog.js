// 기능 메뉴 / ⌘K 검색에서 함께 쓰는 기능 목록.
// status: 'ready' = 사용 가능 (선택 시 해당 화면으로 이동), 'planned' = 로드맵 (안내만 표시)

export const FEATURES = [
  {
    id: 'hitl',
    status: 'ready',
    icon: 'UserCheck',
    title: '사람 검토(HITL) 보정',
    desc: '점수와 근거를 담당자가 직접 수정',
    keywords: 'hitl 보정 검토 수정 점수 사람',
    action: { type: 'modal', modal: 'hitl' }
  },
  {
    id: 'share',
    status: 'ready',
    icon: 'Share2',
    title: '면접관 공유',
    desc: '공유 링크 만들기, 면접관 메모',
    keywords: '공유 링크 면접관 메모 협업 share',
    action: { type: 'modal', modal: 'share' }
  },
  {
    id: 'notify',
    status: 'ready',
    icon: 'Send',
    title: '결과 메일 발송',
    desc: '평가 결과 화면에서 지원자별 합격·불합격·면접 메일',
    keywords: '통보 메일 이메일 발송 알림 합격 불합격 면접 resend',
    action: { type: 'tab', tab: 'comparison' }
  },
  {
    id: 'report',
    status: 'ready',
    icon: 'Printer',
    title: '평가 보고서',
    desc: '인쇄, PDF, CSV, 텍스트 복사',
    keywords: '보고서 출력 인쇄 pdf csv 엑셀 report',
    action: { type: 'modal', modal: 'report' }
  },
  {
    id: 'feedback',
    status: 'ready',
    icon: 'Sprout',
    title: '지원자 피드백',
    desc: '지원자에게 보낼 피드백 문서',
    keywords: '피드백 리포트 지원자 코칭',
    action: { type: 'modal', modal: 'feedback' }
  },
  {
    id: 'tenant',
    status: 'ready',
    icon: 'Building2',
    title: '회사 전환',
    desc: '회사(테넌트)별 지원자 목록 전환',
    keywords: '회사 테넌트 전환 계정 역할 sso',
    action: { type: 'modal', modal: 'profile' }
  },
  {
    id: 'two-track',
    status: 'ready',
    icon: 'Columns2',
    title: '서류·면접 2-Track',
    desc: '서류 평가와 면접 기록 나란히 보기',
    keywords: '2트랙 서류 면접 투트랙',
    action: { type: 'result', target: 'section-two-track' }
  },
  {
    id: 'tag-weights',
    status: 'ready',
    icon: 'Tags',
    title: '태그형 가중치',
    desc: '역량 태그로 가중치 지정',
    keywords: '태그 가중치 설정',
    action: { type: 'view', view: 'new', target: 'section-tag-weights' }
  },
  {
    id: 'per-question',
    status: 'ready',
    icon: 'ListOrdered',
    title: '문항별 평가',
    desc: '자소서 문항마다 점수와 근거',
    keywords: '문항 문항별 평가 자소서',
    action: { type: 'result', target: 'section-per-question' }
  },
  {
    id: 'keyword-questions',
    status: 'ready',
    icon: 'Hash',
    title: '면접 키워드 질문',
    desc: '키워드 태그로 질문 묶기',
    keywords: '키워드 태그 면접 질문',
    action: { type: 'result', target: 'section-questions' }
  },
  {
    id: 'ats',
    status: 'ready',
    icon: 'Plug',
    title: 'ATS 연동',
    desc: '채용 관리 시스템 연동',
    keywords: 'ats 연동 채용관리',
    action: { type: 'modal', modal: 'ats' }
  }
];

export const PLANNED_MESSAGE = '준비 중인 기능입니다.';
