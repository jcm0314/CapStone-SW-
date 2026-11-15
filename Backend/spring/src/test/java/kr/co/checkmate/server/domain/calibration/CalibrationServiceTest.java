package kr.co.checkmate.server.domain.calibration;

import kr.co.checkmate.server.common.exception.BusinessException;
import kr.co.checkmate.server.domain.calibration.dto.CalibrationRecordRequest;
import kr.co.checkmate.server.domain.calibration.dto.CalibrationResponse;
import kr.co.checkmate.server.domain.calibration.dto.WeightProfileResponse;
import kr.co.checkmate.server.domain.calibration.dto.WeightProfileUpsertRequest;
import kr.co.checkmate.server.domain.calibration.entity.CalibrationCorrection;
import kr.co.checkmate.server.domain.calibration.entity.TenantWeightProfile;
import kr.co.checkmate.server.domain.calibration.repository.CalibrationCorrectionRepository;
import kr.co.checkmate.server.domain.calibration.repository.TenantWeightProfileRepository;
import kr.co.checkmate.server.domain.calibration.service.CalibrationService;
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
class CalibrationServiceTest {

    @Mock
    private TenantWeightProfileRepository weightProfileRepository;

    @Mock
    private CalibrationCorrectionRepository calibrationCorrectionRepository;

    @InjectMocks
    private CalibrationService calibrationService;

    @Test
    @DisplayName("신규 인재상 역량 가중치 프로필을 성공적으로 생성한다")
    void saveOrUpdateWeightProfile_createsNew() {
        // given
        UUID tenantId = UUID.randomUUID();
        WeightProfileUpsertRequest request = WeightProfileUpsertRequest.builder()
                .jobRole("BACKEND_DEV")
                .cultureFitWeight(30)
                .jobCompetencyWeight(40)
                .problemSolvingWeight(20)
                .collaborationWeight(10)
                .description("백엔드 엔지니어링 역량 강화 프로필")
                .build();

        given(weightProfileRepository.findByTenantIdAndJobRole(tenantId, "BACKEND_DEV"))
                .willReturn(Optional.empty());

        TenantWeightProfile savedProfile = TenantWeightProfile.builder()
                .tenantId(tenantId)
                .jobRole("BACKEND_DEV")
                .cultureFitWeight(30)
                .jobCompetencyWeight(40)
                .problemSolvingWeight(20)
                .collaborationWeight(10)
                .description("백엔드 엔지니어링 역량 강화 프로필")
                .build();

        given(weightProfileRepository.save(any(TenantWeightProfile.class)))
                .willReturn(savedProfile);

        // when
        WeightProfileResponse response = calibrationService.saveOrUpdateWeightProfile(tenantId, request);

        // then
        assertThat(response).isNotNull();
        assertThat(response.getJobRole()).isEqualTo("BACKEND_DEV");
        assertThat(response.getTotalWeight()).isEqualTo(100);
        assertThat(response.getCultureFitWeight()).isEqualTo(30);
        verify(weightProfileRepository).save(any(TenantWeightProfile.class));
    }

    @Test
    @DisplayName("기존 역량 가중치 프로필이 존재하면 업데이트한다")
    void saveOrUpdateWeightProfile_updatesExisting() {
        // given
        UUID tenantId = UUID.randomUUID();
        WeightProfileUpsertRequest request = WeightProfileUpsertRequest.builder()
                .jobRole("DEFAULT")
                .cultureFitWeight(20)
                .jobCompetencyWeight(50)
                .problemSolvingWeight(20)
                .collaborationWeight(10)
                .description("수정된 기본 프로필")
                .build();

        TenantWeightProfile existing = TenantWeightProfile.builder()
                .tenantId(tenantId)
                .jobRole("DEFAULT")
                .cultureFitWeight(25)
                .jobCompetencyWeight(25)
                .problemSolvingWeight(25)
                .collaborationWeight(25)
                .description("초기 프로필")
                .build();

        given(weightProfileRepository.findByTenantIdAndJobRole(tenantId, "DEFAULT"))
                .willReturn(Optional.of(existing));

        // when
        WeightProfileResponse response = calibrationService.saveOrUpdateWeightProfile(tenantId, request);

        // then
        assertThat(response.getJobCompetencyWeight()).isEqualTo(50);
        assertThat(response.getDescription()).isEqualTo("수정된 기본 프로필");
        assertThat(existing.getJobCompetencyWeight()).isEqualTo(50);
    }

    @Test
    @DisplayName("가중치 합계가 0 이하이면 BusinessException 예외를 발생시킨다")
    void saveOrUpdateWeightProfile_throwsWhenZeroTotal() {
        // given
        UUID tenantId = UUID.randomUUID();
        WeightProfileUpsertRequest request = WeightProfileUpsertRequest.builder()
                .jobRole("QA")
                .cultureFitWeight(0)
                .jobCompetencyWeight(0)
                .problemSolvingWeight(0)
                .collaborationWeight(0)
                .build();

        // when & then
        assertThatThrownBy(() -> calibrationService.saveOrUpdateWeightProfile(tenantId, request))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", "INVALID_WEIGHT");
    }

    @Test
    @DisplayName("HITL AI 채점 교정 데이터를 기록하고 점수 차이(delta)를 올바르게 계산한다")
    void recordCorrection_recordsAndCalculatesDelta() {
        // given
        UUID tenantId = UUID.randomUUID();
        UUID applicantId = UUID.randomUUID();
        UUID evalId = UUID.randomUUID();

        CalibrationRecordRequest request = CalibrationRecordRequest.builder()
                .applicantId(applicantId)
                .evaluationResultId(evalId)
                .correctorEmail("lead_hr@kakao.com")
                .originalScore(70)
                .correctedScore(85)
                .originalDecision("HOLD")
                .correctedDecision("PASS")
                .correctionReason("프로젝트 아키텍처 기여도 입증으로 점수 15점 상향")
                .fewShotContextText("대규모 트래픽 샤딩 아키텍처를 설계하여 300% TPS 향상 달성")
                .build();

        CalibrationCorrection correction = CalibrationCorrection.builder()
                .tenantId(tenantId)
                .applicantId(applicantId)
                .evaluationResultId(evalId)
                .correctorEmail("lead_hr@kakao.com")
                .originalScore(70)
                .correctedScore(85)
                .originalDecision("HOLD")
                .correctedDecision("PASS")
                .correctionReason("프로젝트 아키텍처 기여도 입증으로 점수 15점 상향")
                .fewShotContextText("대규모 트래픽 샤딩 아키텍처를 설계하여 300% TPS 향상 달성")
                .build();

        given(calibrationCorrectionRepository.save(any(CalibrationCorrection.class)))
                .willReturn(correction);

        // when
        CalibrationResponse response = calibrationService.recordCorrection(tenantId, request);

        // then
        assertThat(response).isNotNull();
        assertThat(response.getOriginalScore()).isEqualTo(70);
        assertThat(response.getCorrectedScore()).isEqualTo(85);
        assertThat(response.getScoreDelta()).isEqualTo(15);
        assertThat(response.getCorrectorEmail()).isEqualTo("lead_hr@kakao.com");
        verify(calibrationCorrectionRepository).save(any(CalibrationCorrection.class));
    }

    @Test
    @DisplayName("테넌트 전용 HITL 교정 이력 목록을 조회한다")
    void getCalibrations_returnsList() {
        // given
        UUID tenantId = UUID.randomUUID();
        CalibrationCorrection c1 = CalibrationCorrection.builder()
                .tenantId(tenantId)
                .applicantId(UUID.randomUUID())
                .correctorEmail("hr@test.com")
                .originalScore(60)
                .correctedScore(75)
                .correctionReason("사유1")
                .build();

        given(calibrationCorrectionRepository.findAllByTenantIdOrderByCreatedAtDesc(tenantId))
                .willReturn(List.of(c1));

        // when
        List<CalibrationResponse> results = calibrationService.getCalibrations(tenantId, null);

        // then
        assertThat(results).hasSize(1);
        assertThat(results.get(0).getScoreDelta()).isEqualTo(15);
    }
}
