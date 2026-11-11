package kr.co.checkmate.server.domain.evaluation;

import kr.co.checkmate.server.config.JpaConfig;
import kr.co.checkmate.server.domain.evaluation.entity.EvaluationResult;
import kr.co.checkmate.server.domain.evaluation.entity.EvidenceSentence;
import kr.co.checkmate.server.domain.evaluation.repository.EvaluationResultRepository;
import kr.co.checkmate.server.domain.evaluation.repository.EvidenceSentenceRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@Import(JpaConfig.class)
class EvaluationResultRepositoryTest {

    @Autowired
    private EvaluationResultRepository evaluationResultRepository;

    @Autowired
    private EvidenceSentenceRepository evidenceSentenceRepository;

    @Test
    @DisplayName("평가 결과와 1:N 근거 문장을 함께 저장하면 Cascade로 자동 영속화된다")
    void saveWithEvidenceSentences_cascadePersist() {
        // given
        UUID tenantId = UUID.randomUUID();
        UUID applicantId = UUID.randomUUID();

        EvaluationResult evaluation = EvaluationResult.builder()
                .tenantId(tenantId)
                .applicantId(applicantId)
                .summary("백엔드 분산 시스템과 동시성 제어 역량이 매우 뛰어납니다.")
                .totalScore(92)
                .passRecommendation(true)
                .fitScore(90)
                .competencyScore(95)
                .plagiarismScore(3)
                .build();

        EvidenceSentence ev1 = EvidenceSentence.builder()
                .category("문제해결력")
                .sentence("Kafka 분산 큐를 도입하여 초당 10만 건의 트래픽 병목을 해소했습니다.")
                .quoteOffsetStart(120)
                .quoteOffsetEnd(165)
                .confidenceScore(0.98)
                .rationale("대규모 트래픽 병목 해결을 명확한 기술 스택과 수치로 제시함")
                .interviewQuestion("Kafka 파티션 리밸런싱 시 발생했던 컨슈머 랙(Lag)은 어떻게 모니터링하셨나요?")
                .build();

        EvidenceSentence ev2 = EvidenceSentence.builder()
                .category("협업능력")
                .sentence("프론트엔드 팀과의 API 스키마 사전 정의로 개발 일정을 2주 단축했습니다.")
                .quoteOffsetStart(310)
                .quoteOffsetEnd(355)
                .confidenceScore(0.92)
                .rationale("직무 간 인터페이스 사전 조율을 통한 프로젝트 생산성 증대 기여")
                .interviewQuestion("API 명세 충돌 시 어떤 도구와 커뮤니케이션으로 합의를 도출했나요?")
                .build();

        evaluation.addEvidenceSentence(ev1);
        evaluation.addEvidenceSentence(ev2);

        // when
        EvaluationResult saved = evaluationResultRepository.saveAndFlush(evaluation);

        // then
        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getEvidenceSentences()).hasSize(2);

        // 자식 엔티티 DB 조회 검증
        Optional<EvaluationResult> found = evaluationResultRepository.findByTenantIdAndApplicantId(tenantId, applicantId);
        assertThat(found).isPresent();
        assertThat(found.get().getEvidenceSentences()).hasSize(2);

        EvidenceSentence firstEvidence = found.get().getEvidenceSentences().get(0);
        assertThat(firstEvidence.getCategory()).isEqualTo("문제해결력");
        assertThat(firstEvidence.getQuoteOffsetStart()).isEqualTo(120);
        assertThat(firstEvidence.getInterviewQuestion()).contains("Kafka 파티션 리밸런싱");
    }

    @Test
    @DisplayName("서로 다른 테넌트 간 평가 결과는 절대 조회되지 않는다 (Tenant Isolation)")
    void multiTenantEvaluationIsolation() {
        // given
        UUID tenantA = UUID.randomUUID();
        UUID tenantB = UUID.randomUUID();
        UUID applicantA = UUID.randomUUID();

        EvaluationResult evalA = EvaluationResult.builder()
                .tenantId(tenantA)
                .applicantId(applicantA)
                .summary("테넌트 A 지원자 평가")
                .totalScore(85)
                .passRecommendation(true)
                .build();

        evaluationResultRepository.saveAndFlush(evalA);

        // when: 테넌트 B에서 테넌트 A의 지원자 평가 결과 조회를 시도
        Optional<EvaluationResult> crossTenantAttempt =
                evaluationResultRepository.findByTenantIdAndApplicantId(tenantB, applicantA);

        // then: 반드시 empty여야 함 (보안 차단)
        assertThat(crossTenantAttempt).isEmpty();
    }

    @Test
    @DisplayName("인간 검토관이 승인 서명 시 reviewedByHuman이 true로 변경되고 메모가 저장된다")
    void approveByHuman_success() {
        // given
        UUID tenantId = UUID.randomUUID();
        UUID applicantId = UUID.randomUUID();

        EvaluationResult evaluation = EvaluationResult.builder()
                .tenantId(tenantId)
                .applicantId(applicantId)
                .summary("AI 1차 서류 평가 완료")
                .totalScore(80)
                .passRecommendation(true)
                .reviewedByHuman(false)
                .build();

        EvaluationResult saved = evaluationResultRepository.saveAndFlush(evaluation);
        assertThat(saved.isReviewedByHuman()).isFalse();

        // when
        saved.approveByHuman("인사팀장 김철수 최종 확인 완료: 2차 실무 면접 진행 요망");
        evaluationResultRepository.saveAndFlush(saved);

        // then
        EvaluationResult updated = evaluationResultRepository.findById(saved.getId()).orElseThrow();
        assertThat(updated.isReviewedByHuman()).isTrue();
        assertThat(updated.getReviewerNotes()).contains("인사팀장 김철수");
    }
}

