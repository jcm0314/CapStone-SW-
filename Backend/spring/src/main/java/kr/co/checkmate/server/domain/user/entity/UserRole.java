package kr.co.checkmate.server.domain.user.entity;

/**
 * 테넌트 내부 사용자 역할 (API 명세 #21 RBAC 표 기준)
 * ADMIN: 전체 권한 / RECRUITER: 지원자·평가·공유링크 쓰기 / INTERVIEWER: 조회 + 면접 스코어카드
 */
public enum UserRole {
    ADMIN,
    RECRUITER,
    INTERVIEWER
}
