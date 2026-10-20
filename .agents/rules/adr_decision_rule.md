# Architecture Decision & GitHub Issue Documentation Rules

## 1. 핵심 원칙: "왜 이 결정을 했고, 왜 이 결정이 더 좋은지 근거를 항상 기록"
코드 변경, 아키텍처 전환, 인프라 및 비즈니스 모델 수정 시 GitHub Issue 및 Milestone에 다음 ADR(Architecture Decision Record) 필수 4단계를 반드시 기록한다:

1. **배경 및 문제 정의 (Context & Why)**:
   - 기존 방식의 명확한 한계점, 사용자 페인포인트, 왜 변화가 필요했는지 기술.
2. **대안 비교 매트릭스 (Alternatives Considered & Trade-offs)**:
   - 최소 2~3가지 선택지(Option A, Option B, Option C)를 표로 비교.
   - 개발 비용, 인프라 비용, 사용자 경험(UX), 보안/컴플라이언스 관점 비교.
3. **최종 결정과 정량적/정성적 근거 (Rationale & Evidence - Why Better)**:
   - 왜 이 결정이 다른 대안보다 압도적으로 우수한지 정량적 수치(비용, 응답속도, 마진율)와 정성적 가치(무설정 UX)로 증명.
4. **결과 및 비즈니스 임팩트 (Impact & Deliverables)**:
   - 프로덕션 배포 리비전, 테스트 통과 수치, 비즈니스적 파급 효과 요약.
