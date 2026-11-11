package kr.co.checkmate.server.domain.interview;

import kr.co.checkmate.server.domain.applicant.entity.Applicant;
import kr.co.checkmate.server.domain.applicant.repository.ApplicantRepository;
import kr.co.checkmate.server.domain.interview.dto.InterviewScorecardResponse;
import kr.co.checkmate.server.domain.interview.dto.InterviewScorecardSubmitRequest;
import kr.co.checkmate.server.domain.interview.dto.InterviewSummaryResponse;
import kr.co.checkmate.server.domain.interview.dto.QuestionEvaluationDto;
import kr.co.checkmate.server.domain.interview.entity.InterviewRecommendation;
import kr.co.checkmate.server.domain.interview.entity.InterviewScorecard;
import kr.co.checkmate.server.domain.interview.repository.InterviewScorecardRepository;
import kr.co.checkmate.server.domain.interview.service.InterviewService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class InterviewServiceTest {

    @Mock
    private InterviewScorecardRepository scorecardRepository;

    @Mock
    private ApplicantRepository applicantRepository;

    @InjectMocks
    private InterviewService interviewService;

    @Test
    @DisplayName("신규 면접관 채점표를 성공적으로 저장한다")
    void submitScorecard_createsNew() {
        // given
        UUID tenantId = UUID.randomUUID();
        UUID applicantId = UUID.randomUUID();

        Applicant applicant = Applicant.builder()
                .tenantId(tenantId)
                .name("김지원")
                .targetRole("백엔드")
                .coverLetterText("자소서")
                .build();

        given(applicantRepository.findByTenantIdAndId(tenantId, applicantId)).willReturn(Optional.of(applicant));
        given(scorecardRepository.findByTenantIdAndApplicantIdAndInterviewerName(tenantId, applicantId, "김수석 면접관"))
                .willReturn(Optional.empty());

        QuestionEvaluationDto q1 = QuestionEvaluationDto.builder()
                .questionText("Kafka 리밸런싱 대응책은?")
                .category("기술역량")
                .checked(true)
                .score(5)
                .interviewerNote("이론과 실무 경험 모두 탁월함")
                .build();

        InterviewScorecardSubmitRequest request = InterviewScorecardSubmitRequest.builder()
                .interviewerName("김수석 면접관")
                .recommendation(InterviewRecommendation.PASS)
                .totalScore(95)
                .overallComment("강력 추천")
                .questionEvaluations(List.of(q1))
                .build();

        InterviewScorecard saved = InterviewScorecard.builder()
                .tenantId(tenantId)
                .applicantId(applicantId)
                .interviewerName(request.getInterviewerName())
                .recommendation(request.getRecommendation())
                .totalScore(request.getTotalScore())
                .overallComment(request.getOverallComment())
                .build();
        saved.addQuestionEvaluation(q1.toEntity());

        given(scorecardRepository.save(any(InterviewScorecard.class))).willReturn(saved);

        // when
        InterviewScorecardResponse response = interviewService.submitScorecard(tenantId, applicantId, request);

        // then
        assertThat(response).isNotNull();
        assertThat(response.getInterviewerName()).isEqualTo("김수석 면접관");
        assertThat(response.getRecommendation()).isEqualTo(InterviewRecommendation.PASS);
        assertThat(response.getTotalScore()).isEqualTo(95);
        assertThat(response.getQuestionEvaluations()).hasSize(1);
        verify(scorecardRepository).save(any(InterviewScorecard.class));
    }

    @Test
    @DisplayName("다중 면접관 채점표의 평균 점수 및 합의 추천(consensus)이 정확하게 집계된다")
    void getInterviewSummary_aggregatesCorrectly() {
        // given
        UUID tenantId = UUID.randomUUID();
        UUID applicantId = UUID.randomUUID();

        Applicant applicant = Applicant.builder()
                .tenantId(tenantId)
                .name("김지원")
                .targetRole("백엔드")
                .coverLetterText("자소서")
                .build();

        given(applicantRepository.findByTenantIdAndId(tenantId, applicantId)).willReturn(Optional.of(applicant));

        InterviewScorecard sc1 = InterviewScorecard.builder()
                .tenantId(tenantId)
                .applicantId(applicantId)
                .interviewerName("면접관 A")
                .recommendation(InterviewRecommendation.PASS)
                .totalScore(90)
                .build();

        InterviewScorecard sc2 = InterviewScorecard.builder()
                .tenantId(tenantId)
                .applicantId(applicantId)
                .interviewerName("면접관 B")
                .recommendation(InterviewRecommendation.PASS)
                .totalScore(80)
                .build();

        given(scorecardRepository.findByTenantIdAndApplicantId(tenantId, applicantId))
                .willReturn(List.of(sc1, sc2));

        // when
        InterviewSummaryResponse summary = interviewService.getInterviewSummary(tenantId, applicantId);

        // then
        assertThat(summary.getTotalInterviewers()).isEqualTo(2);
        assertThat(summary.getAverageScore()).isEqualTo(85.0);
        assertThat(summary.getPassCount()).isEqualTo(2);
        assertThat(summary.getFailCount()).isEqualTo(0);
        assertThat(summary.getConsensusRecommendation()).isEqualTo(InterviewRecommendation.PASS);
        assertThat(summary.getScorecards()).hasSize(2);
    }
}
