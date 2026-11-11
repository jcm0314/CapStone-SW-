package kr.co.checkmate.server.domain.evaluation;

import kr.co.checkmate.server.common.exception.EntityNotFoundException;
import kr.co.checkmate.server.domain.applicant.entity.Applicant;
import kr.co.checkmate.server.domain.applicant.entity.EvaluationStatus;
import kr.co.checkmate.server.domain.applicant.repository.ApplicantRepository;
import kr.co.checkmate.server.domain.evaluation.dto.EvaluationApprovalRequest;
import kr.co.checkmate.server.domain.evaluation.dto.EvaluationResponse;
import kr.co.checkmate.server.domain.evaluation.dto.EvaluationSaveRequest;
import kr.co.checkmate.server.domain.evaluation.dto.EvidenceSentenceDto;
import kr.co.checkmate.server.domain.evaluation.entity.EvaluationResult;
import kr.co.checkmate.server.domain.evaluation.repository.EvaluationResultRepository;
import kr.co.checkmate.server.domain.evaluation.service.EvaluationService;
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
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class EvaluationServiceTest {

    @Mock
    private EvaluationResultRepository evaluationResultRepository;

    @Mock
    private ApplicantRepository applicantRepository;

    @InjectMocks
    private EvaluationService evaluationService;

    @Test
    @DisplayName("평가 결과 저장 시 지원자 엔티티 상태가 COMPLETED로 자동 갱신된다")
    void saveEvaluation_updatesApplicantStatusToCompleted() {
        // given
        UUID tenantId = UUID.randomUUID();
        UUID applicantId = UUID.randomUUID();

        Applicant applicant = Applicant.builder()
                .tenantId(tenantId)
                .name("김지원")
                .targetRole("서버")
                .coverLetterText("자소서 본문")
                .status(EvaluationStatus.PENDING)
                .build();

        given(applicantRepository.findByTenantIdAndId(tenantId, applicantId)).willReturn(Optional.of(applicant));
        given(evaluationResultRepository.findByTenantIdAndApplicantId(tenantId, applicantId)).willReturn(Optional.empty());

        EvidenceSentenceDto evidenceDto = EvidenceSentenceDto.builder()
                .category("문제해결")
                .sentence("Kafka 분산 큐 도입")
                .quoteOffsetStart(10)
                .quoteOffsetEnd(30)
                .confidenceScore(0.95)
                .rationale("기술 근거 명확")
                .interviewQuestion("리밸런싱 대응은?")
                .build();

        EvaluationSaveRequest saveRequest = EvaluationSaveRequest.builder()
                .summary("우수한 백엔드 역량 보유")
                .totalScore(90)
                .passRecommendation(true)
                .fitScore(88)
                .competencyScore(92)
                .plagiarismScore(2)
                .evidenceSentences(List.of(evidenceDto))
                .build();

        EvaluationResult savedEntity = EvaluationResult.builder()
                .tenantId(tenantId)
                .applicantId(applicantId)
                .summary(saveRequest.getSummary())
                .totalScore(saveRequest.getTotalScore())
                .passRecommendation(saveRequest.getPassRecommendation())
                .fitScore(saveRequest.getFitScore())
                .competencyScore(saveRequest.getCompetencyScore())
                .plagiarismScore(saveRequest.getPlagiarismScore())
                .build();
        savedEntity.addEvidenceSentence(evidenceDto.toEntity());

        given(evaluationResultRepository.save(any(EvaluationResult.class))).willReturn(savedEntity);

        // when
        EvaluationResponse response = evaluationService.saveEvaluation(tenantId, applicantId, saveRequest);

        // then
        assertThat(response).isNotNull();
        assertThat(response.getTotalScore()).isEqualTo(90);
        assertThat(response.isPassRecommendation()).isTrue();
        assertThat(response.getEvidenceSentences()).hasSize(1);
        assertThat(response.isReviewedByHuman()).isFalse();

        // 지원자 상태가 COMPLETED로 변경되었는지 검증
        assertThat(applicant.getStatus()).isEqualTo(EvaluationStatus.COMPLETED);
        assertThat(applicant.getFinalScore()).isEqualTo(90);
        assertThat(applicant.getPassRecommendation()).isTrue();
    }

    @Test
    @DisplayName("평가 결과 미존재 시 getEvaluationByApplicant는 EntityNotFoundException을 던진다")
    void getEvaluation_notFound_throwsException() {
        // given
        UUID tenantId = UUID.randomUUID();
        UUID applicantId = UUID.randomUUID();
        given(evaluationResultRepository.findByTenantIdAndApplicantId(tenantId, applicantId))
                .willReturn(Optional.empty());

        // when & then
        assertThatThrownBy(() -> evaluationService.getEvaluationByApplicant(tenantId, applicantId))
                .isInstanceOf(EntityNotFoundException.class)
                .hasMessageContaining("해당 지원자의 평가 결과를 찾을 수 없습니다");
    }

    @Test
    @DisplayName("인간 검토관 승인 처리 시 reviewedByHuman이 true가 되고 메모가 저장된다")
    void approveEvaluation_success() {
        // given
        UUID tenantId = UUID.randomUUID();
        UUID applicantId = UUID.randomUUID();

        EvaluationResult evaluation = EvaluationResult.builder()
                .tenantId(tenantId)
                .applicantId(applicantId)
                .summary("1차 AI 평가")
                .totalScore(85)
                .passRecommendation(true)
                .reviewedByHuman(false)
                .build();

        given(evaluationResultRepository.findByTenantIdAndApplicantId(tenantId, applicantId))
                .willReturn(Optional.of(evaluation));

        EvaluationApprovalRequest approvalRequest = EvaluationApprovalRequest.builder()
                .reviewerNotes("인사팀장 승인: 면접 대상자 확정")
                .build();

        // when
        EvaluationResponse response = evaluationService.approveEvaluation(tenantId, applicantId, approvalRequest);

        // then
        assertThat(response.isReviewedByHuman()).isTrue();
        assertThat(response.getReviewerNotes()).isEqualTo("인사팀장 승인: 면접 대상자 확정");
    }
}
