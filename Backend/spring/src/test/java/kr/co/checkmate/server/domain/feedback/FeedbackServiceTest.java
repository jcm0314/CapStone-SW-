package kr.co.checkmate.server.domain.feedback;

import kr.co.checkmate.server.common.exception.EntityNotFoundException;
import kr.co.checkmate.server.domain.applicant.entity.Applicant;
import kr.co.checkmate.server.domain.applicant.repository.ApplicantRepository;
import kr.co.checkmate.server.domain.feedback.dto.FeedbackReportCreateRequest;
import kr.co.checkmate.server.domain.feedback.dto.FeedbackReportResponse;
import kr.co.checkmate.server.domain.feedback.dto.PublicFeedbackReportResponse;
import kr.co.checkmate.server.domain.feedback.entity.ApplicantFeedbackReport;
import kr.co.checkmate.server.domain.feedback.repository.FeedbackReportRepository;
import kr.co.checkmate.server.domain.feedback.service.FeedbackService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class FeedbackServiceTest {

    @Mock
    private FeedbackReportRepository feedbackReportRepository;

    @Mock
    private ApplicantRepository applicantRepository;

    @InjectMocks
    private FeedbackService feedbackService;

    @Test
    @DisplayName("신규 성장 코칭 피드백 리포트를 생성한다")
    void createFeedbackReport_createsNew() {
        // given
        UUID tenantId = UUID.randomUUID();
        UUID applicantId = UUID.randomUUID();

        Applicant applicant = Applicant.builder()
                .tenantId(tenantId)
                .name("이성장")
                .email("growth@test.com")
                .targetRole("백엔드 엔지니어")
                .coverLetterText("자소서 본문입니다.")
                .build();

        FeedbackReportCreateRequest request = FeedbackReportCreateRequest.builder()
                .strengthsSummary("탁월한 문제 해결 역량")
                .improvementPoints("글의 논리적 연결성 강화")
                .recommendedActions("문단별 핵심 문장 우선 배치")
                .overallCoachingComment("충분히 훌륭한 잠재력을 가진 인재입니다.")
                .build();

        ApplicantFeedbackReport savedReport = ApplicantFeedbackReport.builder()
                .tenantId(tenantId)
                .applicantId(applicantId)
                .feedbackToken("test-token-1234")
                .strengthsSummary(request.getStrengthsSummary())
                .improvementPoints(request.getImprovementPoints())
                .recommendedActions(request.getRecommendedActions())
                .overallCoachingComment(request.getOverallCoachingComment())
                .build();

        given(applicantRepository.findByTenantIdAndId(tenantId, applicantId))
                .willReturn(Optional.of(applicant));
        given(feedbackReportRepository.findByTenantIdAndApplicantId(tenantId, applicantId))
                .willReturn(Optional.empty());
        given(feedbackReportRepository.save(any(ApplicantFeedbackReport.class)))
                .willReturn(savedReport);

        // when
        FeedbackReportResponse response = feedbackService.createOrUpdateFeedbackReport(tenantId, applicantId, request);

        // then
        assertThat(response).isNotNull();
        assertThat(response.getStrengthsSummary()).isEqualTo("탁월한 문제 해결 역량");
        assertThat(response.getFeedbackToken()).isEqualTo("test-token-1234");
        assertThat(response.isSent()).isFalse();
        verify(feedbackReportRepository).save(any(ApplicantFeedbackReport.class));
    }

    @Test
    @DisplayName("지원자가 존재하지 않으면 EntityNotFoundException 예외가 발생한다")
    void createFeedbackReport_applicantNotFound_throwsException() {
        // given
        UUID tenantId = UUID.randomUUID();
        UUID applicantId = UUID.randomUUID();
        FeedbackReportCreateRequest request = FeedbackReportCreateRequest.builder()
                .strengthsSummary("강점")
                .improvementPoints("개선점")
                .recommendedActions("행동")
                .build();

        given(applicantRepository.findByTenantIdAndId(tenantId, applicantId))
                .willReturn(Optional.empty());

        // when & then
        assertThatThrownBy(() -> feedbackService.createOrUpdateFeedbackReport(tenantId, applicantId, request))
                .isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    @DisplayName("피드백 리포트를 발송 상태(isSent=true)로 변경한다")
    void markFeedbackAsSent_updatesStatus() {
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

        given(feedbackReportRepository.findByTenantIdAndApplicantId(tenantId, applicantId))
                .willReturn(Optional.of(report));

        // when
        FeedbackReportResponse response = feedbackService.markFeedbackAsSent(tenantId, applicantId);

        // then
        assertThat(response.isSent()).isTrue();
        assertThat(report.isSent()).isTrue();
        assertThat(report.getSentAt()).isNotNull();
    }

    @Test
    @DisplayName("공개 토큰으로 열람 시 구직자 전용 DTO를 반환하고 조회수를 증가시킨다")
    void getPublicFeedbackReport_incrementsViewCount() {
        // given
        String token = "public-token-uuid";
        ApplicantFeedbackReport report = ApplicantFeedbackReport.builder()
                .tenantId(UUID.randomUUID())
                .applicantId(UUID.randomUUID())
                .feedbackToken(token)
                .strengthsSummary("강점 요약")
                .improvementPoints("개선 포인트")
                .recommendedActions("추천 학습")
                .overallCoachingComment("응원합니다.")
                .build();

        given(feedbackReportRepository.findByFeedbackToken(token))
                .willReturn(Optional.of(report));

        // when
        PublicFeedbackReportResponse response = feedbackService.getPublicFeedbackReport(token);

        // then
        assertThat(response).isNotNull();
        assertThat(response.getFeedbackToken()).isEqualTo(token);
        assertThat(response.getStrengthsSummary()).isEqualTo("강점 요약");
        assertThat(report.getViewCount()).isEqualTo(1);
    }
}
