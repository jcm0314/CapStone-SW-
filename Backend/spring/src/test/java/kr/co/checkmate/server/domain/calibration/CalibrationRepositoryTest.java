package kr.co.checkmate.server.domain.calibration;

import kr.co.checkmate.server.config.JpaConfig;
import kr.co.checkmate.server.domain.calibration.entity.CalibrationCorrection;
import kr.co.checkmate.server.domain.calibration.entity.TenantWeightProfile;
import kr.co.checkmate.server.domain.calibration.repository.CalibrationCorrectionRepository;
import kr.co.checkmate.server.domain.calibration.repository.TenantWeightProfileRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ActiveProfiles("local")
@Import(JpaConfig.class)
class CalibrationRepositoryTest {

    @Autowired
    private TenantWeightProfileRepository weightProfileRepository;

    @Autowired
    private CalibrationCorrectionRepository calibrationCorrectionRepository;

    @Test
    @DisplayName("테넌트별 역량 가중치 프로필 저장 및 직무별 고유 조회를 검증한다")
    void testTenantWeightProfile_saveAndFind() {
        // given
        UUID tenantA = UUID.randomUUID();
        UUID tenantB = UUID.randomUUID();

        TenantWeightProfile profileA = TenantWeightProfile.builder()
                .tenantId(tenantA)
                .jobRole("BACKEND")
                .cultureFitWeight(20)
                .jobCompetencyWeight(40)
                .problemSolvingWeight(30)
                .collaborationWeight(10)
                .description("테넌트 A 백엔드 가중치")
                .build();

        TenantWeightProfile profileB = TenantWeightProfile.builder()
                .tenantId(tenantB)
                .jobRole("BACKEND")
                .cultureFitWeight(30)
                .jobCompetencyWeight(30)
                .problemSolvingWeight(20)
                .collaborationWeight(20)
                .description("테넌트 B 백엔드 가중치")
                .build();

        weightProfileRepository.save(profileA);
        weightProfileRepository.save(profileB);

        // when
        Optional<TenantWeightProfile> foundA = weightProfileRepository.findByTenantIdAndJobRole(tenantA, "BACKEND");
        List<TenantWeightProfile> listA = weightProfileRepository.findAllByTenantId(tenantA);

        // then
        assertThat(foundA).isPresent();
        assertThat(foundA.get().getJobCompetencyWeight()).isEqualTo(40);
        assertThat(listA).hasSize(1);
    }

    @Test
    @DisplayName("HITL 교정 데이터 저장 및 테넌트 격리 조회를 검증한다")
    void testCalibrationCorrection_saveAndIsolation() {
        // given
        UUID tenantA = UUID.randomUUID();
        UUID tenantB = UUID.randomUUID();
        UUID applicantA = UUID.randomUUID();

        CalibrationCorrection c1 = CalibrationCorrection.builder()
                .tenantId(tenantA)
                .applicantId(applicantA)
                .correctorEmail("hr_a@kakao.com")
                .originalScore(70)
                .correctedScore(85)
                .correctionReason("역량 탁월")
                .build();

        CalibrationCorrection c2 = CalibrationCorrection.builder()
                .tenantId(tenantB)
                .applicantId(UUID.randomUUID())
                .correctorEmail("hr_b@line.me")
                .originalScore(50)
                .correctedScore(65)
                .correctionReason("테넌트 B 교정")
                .build();

        calibrationCorrectionRepository.save(c1);
        calibrationCorrectionRepository.save(c2);

        // when
        List<CalibrationCorrection> tenantAResults = calibrationCorrectionRepository.findAllByTenantIdOrderByCreatedAtDesc(tenantA);
        List<CalibrationCorrection> applicantAResults = calibrationCorrectionRepository.findAllByTenantIdAndApplicantIdOrderByCreatedAtDesc(tenantA, applicantA);

        // then
        assertThat(tenantAResults).hasSize(1);
        assertThat(tenantAResults.get(0).getCorrectorEmail()).isEqualTo("hr_a@kakao.com");
        assertThat(applicantAResults).hasSize(1);
    }
}
