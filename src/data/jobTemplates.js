export const JOB_TEMPLATES = [
  {
    id: "tech_backend",
    title: "백엔드 소프트웨어 엔지니어",
    category: "IT / 개발",
    description: "대용량 트래픽 처리, DB 최적화 및 안정적 아키텍처 설계 역량이 핵심인 직무",
    competencies: [
      { id: "problem_solving", name: "문제 해결력 & 논리성", weight: 30, color: "#3B82F6" },
      { id: "tech_skill", name: "직무 전문성 & 기술력", weight: 30, color: "#8B5CF6" },
      { id: "teamwork", name: "협업 & 커뮤니케이션", weight: 20, color: "#10B981" },
      { id: "growth", name: "성장 가능성 & 주도성", weight: 10, color: "#F59E0B" },
      { id: "ethics", name: "책임감 & 조직 적합성", weight: 10, color: "#EC4899" }
    ]
  },
  {
    id: "marketing_growth",
    title: "그로스 마케팅 스페셜리스트",
    category: "마케팅 / 기획",
    description: "데이터 기반 퍼널 분석, CAC/LTV 최적화 및 ROAS 극대화 경험이 중요한 직무",
    competencies: [
      { id: "tech_skill", name: "데이터 분석 & 툴 활용력", weight: 30, color: "#8B5CF6" },
      { id: "problem_solving", name: "성과 창출 & 가설 검증력", weight: 30, color: "#3B82F6" },
      { id: "growth", name: "기획력 & 도메인 이해도", weight: 20, color: "#F59E0B" },
      { id: "teamwork", name: "소통 & 협업 능률", weight: 10, color: "#10B981" },
      { id: "ethics", name: "도전 정신 & 열정", weight: 10, color: "#EC4899" }
    ]
  },
  {
    id: "sales_account",
    title: "B2B 영업 & 아카운트 매니저",
    category: "영업 / 사업개발",
    description: "엔터프라이즈 고객 설득, 딜 클로징, 목표 매출 달성 및 파이프라인 관리가 핵심인 직무",
    competencies: [
      { id: "teamwork", name: "고객 설득 & 커뮤니케이션", weight: 35, color: "#10B981" },
      { id: "problem_solving", name: "목표 달성력 & 딜 실행력", weight: 30, color: "#3B82F6" },
      { id: "growth", name: "시장 분석 & 기획력", weight: 15, color: "#F59E0B" },
      { id: "tech_skill", name: "제품 이해도 & 기술 소통", weight: 10, color: "#8B5CF6" },
      { id: "ethics", name: "회복 탄력성 & 관계 구축", weight: 10, color: "#EC4899" }
    ]
  },
  {
    id: "hr_recruiter",
    title: "HR 리크루터 & 인사담당자",
    category: "인사 / 경영지원",
    description: "우수 인재 발굴, 객관적 서류/면접 평가 및 조직 문화 이해가 요구되는 직무",
    competencies: [
      { id: "ethics", name: "인재 검증력 & 윤리 의식", weight: 30, color: "#EC4899" },
      { id: "teamwork", name: "공감 & 조직 소통 역량", weight: 25, color: "#10B981" },
      { id: "growth", name: "채용 브랜딩 & 기획력", weight: 20, color: "#F59E0B" },
      { id: "problem_solving", name: "전략적 문제 해결력", weight: 15, color: "#3B82F6" },
      { id: "tech_skill", name: "HR 테크 & 데이터 활용력", weight: 10, color: "#8B5CF6" }
    ]
  }
];
