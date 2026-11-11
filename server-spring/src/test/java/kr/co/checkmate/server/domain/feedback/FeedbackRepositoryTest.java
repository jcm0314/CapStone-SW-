package kr.co.checkmate.server.domain.feedback;

import kr.co.checkmate.server.config.JpaConfig;
import kr.co.checkmate.server.domain.feedback.entity.ApplicantFeedbackReport;
import kr.co.checkmate.server.domain.feedback.repository.FeedbackReportRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ActiveProfiles("local")
@Import(JpaConfig.class)
class FeedbackRepositoryTest {

    @Autowired
    private FeedbackReportRepository feedbackReportRepository;

    @Test
    @DisplayName("피드백 리포트를 저장하고 공개 토큰 및 테넌트/지원자 ID로 조회한다")
    void saveAndFindFeedbackReport() {
        // given
        UUID tenantId = UUID.randomUUID();
        UUID applicantId = UUID.randomUUID();
        String token = UUID.randomUUID().toString();

        ApplicantFeedbackReport report = ApplicantFeedbackReport.builder()
                .tenantId(tenantId)
                .applicantId(applicantId)
                .feedbackToken(token)
                .strengthsSummary("구체적인 프로젝트 경험과 성과 수치 제시가 우수함")
                .improvementPoints("협업 과정에서의 갈등 해결 사례 보완 권장")
                .recommendedActions("STAR 기법을 활용한 문제 해결 서술 연습")
                .overallCoachingComment("직무 전문성이 매우 돋보이며 실무 투입에 적합합니다.")
                .build();

        feedbackReportRepository.save(report);

        // when
        Optional<ApplicantFeedbackReport> foundByApplicant = feedbackReportRepository.findByTenantIdAndApplicantId(tenantId, applicantId);
        Optional<ApplicantFeedbackReport> foundByToken = feedbackReportRepository.findByFeedbackToken(token);

        // then
        assertThat(foundByApplicant).isPresent();
        assertThat(foundByApplicant.get().getStrengthsSummary()).contains("구체적인 프로젝트 경험");
        assertThat(foundByApplicant.get().isSent()).isFalse();
        assertThat(foundByApplicant.get().getViewCount()).isEqualTo(0);

        assertThat(foundByToken).isPresent();
        assertThat(foundByToken.get().getFeedbackToken()).isEqualTo(token);
    }

    @Test
    @DisplayName("발송 상태 변경 및 조회수 증가가 정상적으로 영속화된다")
    void markAsSentAndIncrementViewCount() {
        // given
        UUID tenantId = UUID.randomUUID();
        UUID applicantId = UUID.randomUUID();

        ApplicantFeedbackReport report = ApplicantFeedbackReport.builder()
                .tenantId(tenantId)
                .applicantId(applicantId)
                .strengthsSummary("강점")
                .improvementPoints("보완점")
                .recommendedActions("추천행동")
                .build();

        ApplicantFeedbackReport saved = feedbackReportRepository.save(report);

        // when
        saved.markAsSent();
        saved.incrementViewCount();
        saved.incrementViewCount();
        feedbackReportRepository.flush();

        // then
        ApplicantFeedbackReport updated = feedbackReportRepository.findById(saved.getId()).orElseThrow();
        assertThat(updated.isSent()).isTrue();
        assertThat(updated.getSentAt()).isNotNull();
        assertThat(updated.getViewCount()).isEqualTo(2);
    }
}
