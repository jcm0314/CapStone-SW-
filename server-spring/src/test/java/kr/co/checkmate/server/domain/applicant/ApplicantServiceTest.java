package kr.co.checkmate.server.domain.applicant;

import kr.co.checkmate.server.common.exception.EntityNotFoundException;
import kr.co.checkmate.server.domain.applicant.dto.ApplicantCreateRequest;
import kr.co.checkmate.server.domain.applicant.dto.ApplicantResponse;
import kr.co.checkmate.server.domain.applicant.dto.ApplicantStatusUpdateRequest;
import kr.co.checkmate.server.domain.applicant.entity.Applicant;
import kr.co.checkmate.server.domain.applicant.entity.EvaluationStatus;
import kr.co.checkmate.server.domain.applicant.repository.ApplicantRepository;
import kr.co.checkmate.server.domain.applicant.service.ApplicantService;
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
class ApplicantServiceTest {

    @Mock
    private ApplicantRepository applicantRepository;

    @InjectMocks
    private ApplicantService applicantService;

    @Test
    @DisplayName("신규 지원자를 성공적으로 생성하고 PENDING 상태로 저장한다")
    void createApplicant_success() {
        // given
        UUID tenantId = UUID.randomUUID();
        ApplicantCreateRequest request = ApplicantCreateRequest.builder()
                .name("김지원")
                .email("kim@toss.im")
                .targetRole("백엔드 엔지니어")
                .coverLetterText("대규모 트래픽 분산 처리를 경험했습니다.")
                .anonymized(true)
                .build();

        Applicant savedApplicant = Applicant.builder()
                .tenantId(tenantId)
                .name(request.getName())
                .email(request.getEmail())
                .targetRole(request.getTargetRole())
                .coverLetterText(request.getCoverLetterText())
                .status(EvaluationStatus.PENDING)
                .anonymized(true)
                .build();

        given(applicantRepository.save(any(Applicant.class))).willReturn(savedApplicant);

        // when
        ApplicantResponse response = applicantService.createApplicant(tenantId, request);

        // then
        assertThat(response).isNotNull();
        assertThat(response.getName()).isEqualTo("김지원");
        assertThat(response.getStatus()).isEqualTo(EvaluationStatus.PENDING);
        assertThat(response.getTargetRole()).isEqualTo("백엔드 엔지니어");
        verify(applicantRepository).save(any(Applicant.class));
    }

    @Test
    @DisplayName("지원자 단건 조회 시 존재하지 않는 ID인 경우 EntityNotFoundException을 던진다")
    void getApplicant_notFound_throwsException() {
        // given
        UUID tenantId = UUID.randomUUID();
        UUID applicantId = UUID.randomUUID();
        given(applicantRepository.findByTenantIdAndId(tenantId, applicantId)).willReturn(Optional.empty());

        // when & then
        assertThatThrownBy(() -> applicantService.getApplicant(tenantId, applicantId))
                .isInstanceOf(EntityNotFoundException.class)
                .hasMessageContaining("해당 지원자를 찾을 수 없습니다");
    }

    @Test
    @DisplayName("평가 완료 상태 및 점수 갱신이 성공적으로 반영된다")
    void updateStatus_toCompleted_success() {
        // given
        UUID tenantId = UUID.randomUUID();
        UUID applicantId = UUID.randomUUID();

        Applicant applicant = Applicant.builder()
                .tenantId(tenantId)
                .name("이지원")
                .targetRole("서버")
                .coverLetterText("자소서")
                .status(EvaluationStatus.PENDING)
                .build();

        given(applicantRepository.findByTenantIdAndId(tenantId, applicantId)).willReturn(Optional.of(applicant));

        ApplicantStatusUpdateRequest updateRequest = ApplicantStatusUpdateRequest.builder()
                .status(EvaluationStatus.COMPLETED)
                .finalScore(95)
                .passRecommendation(true)
                .build();

        // when
        ApplicantResponse response = applicantService.updateStatus(tenantId, applicantId, updateRequest);

        // then
        assertThat(response.getStatus()).isEqualTo(EvaluationStatus.COMPLETED);
        assertThat(response.getFinalScore()).isEqualTo(95);
        assertThat(response.getPassRecommendation()).isTrue();
    }
}
