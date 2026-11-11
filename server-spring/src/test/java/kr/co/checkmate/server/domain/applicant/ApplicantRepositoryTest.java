package kr.co.checkmate.server.domain.applicant;

import kr.co.checkmate.server.config.JpaConfig;
import kr.co.checkmate.server.domain.applicant.entity.Applicant;
import kr.co.checkmate.server.domain.applicant.entity.EvaluationStatus;
import kr.co.checkmate.server.domain.applicant.repository.ApplicantRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@Import(JpaConfig.class)
class ApplicantRepositoryTest {

    @Autowired
    private ApplicantRepository applicantRepository;

    @Test
    @DisplayName("서로 다른 테넌트의 지원자는 철저히 격리되어 조회된다 (Multi-Tenant Isolation)")
    void multiTenantApplicantDataIsolation() {
        // given
        UUID tenantA = UUID.randomUUID(); // Toss
        UUID tenantB = UUID.randomUUID(); // Daangn

        Applicant appA1 = Applicant.builder()
                .tenantId(tenantA)
                .name("지원자A1 (가명: 김철수)")
                .email("a1@toss.im")
                .targetRole("백엔드 엔지니어")
                .coverLetterText("대규모 트래픽 처리 경험과 Kafka MSA를 설계했습니다.")
                .status(EvaluationStatus.COMPLETED)
                .finalScore(92)
                .passRecommendation(true)
                .build();

        Applicant appA2 = Applicant.builder()
                .tenantId(tenantA)
                .name("지원자A2 (가명: 이영희)")
                .email("a2@toss.im")
                .targetRole("프론트엔드 엔지니어")
                .coverLetterText("React 성능 최적화와 가상화 렌더링을 구현했습니다.")
                .status(EvaluationStatus.PENDING)
                .build();

        Applicant appB1 = Applicant.builder()
                .tenantId(tenantB)
                .name("지원자B1 (가명: 박민수)")
                .email("b1@daangn.com")
                .targetRole("데이터 엔지니어")
                .coverLetterText("실시간 위치 기반 추천 알고리즘을 파이프라인으로 구축했습니다.")
                .status(EvaluationStatus.COMPLETED)
                .finalScore(88)
                .passRecommendation(true)
                .build();

        applicantRepository.saveAll(List.of(appA1, appA2, appB1));

        // when: 테넌트 A 관점에서 지원자 목록 조회
        List<Applicant> tenantAApplicants = applicantRepository.findByTenantId(tenantA);
        List<Applicant> tenantBApplicants = applicantRepository.findByTenantId(tenantB);

        // then: 데이터 격리 검증
        assertThat(tenantAApplicants).hasSize(2);
        assertThat(tenantAApplicants)
                .extracting(Applicant::getName)
                .containsExactlyInAnyOrder("지원자A1 (가명: 김철수)", "지원자A2 (가명: 이영희)");
        assertThat(tenantAApplicants)
                .noneMatch(a -> a.getTenantId().equals(tenantB));

        assertThat(tenantBApplicants).hasSize(1);
        assertThat(tenantBApplicants.get(0).getName()).isEqualTo("지원자B1 (가명: 박민수)");

        // when: 테넌트 A가 테넌트 B 지원자 ID로 조회를 시도할 때 (Cross-Tenant 침범 시도)
        Optional<Applicant> crossTenantAttempt = applicantRepository.findByTenantIdAndId(tenantA, appB1.getId());

        // then: 결과는 반드시 empty여야 함 (보안 차단)
        assertThat(crossTenantAttempt).isEmpty();
    }

    @Test
    @DisplayName("테넌트 내에서 평가 상태(PENDING/COMPLETED)별로 필터링 조회 및 카운트가 정상 동작한다")
    void filterAndCountByTenantAndStatus() {
        // given
        UUID tenant = UUID.randomUUID();

        Applicant pending = Applicant.builder()
                .tenantId(tenant)
                .name("지원자1")
                .targetRole("서버")
                .coverLetterText("자소서1")
                .status(EvaluationStatus.PENDING)
                .build();

        Applicant completed = Applicant.builder()
                .tenantId(tenant)
                .name("지원자2")
                .targetRole("서버")
                .coverLetterText("자소서2")
                .status(EvaluationStatus.COMPLETED)
                .finalScore(85)
                .build();

        applicantRepository.saveAll(List.of(pending, completed));

        // when & then
        assertThat(applicantRepository.countByTenantId(tenant)).isEqualTo(2);
        assertThat(applicantRepository.countByTenantIdAndStatus(tenant, EvaluationStatus.PENDING)).isEqualTo(1);
        assertThat(applicantRepository.countByTenantIdAndStatus(tenant, EvaluationStatus.COMPLETED)).isEqualTo(1);

        List<Applicant> completedList = applicantRepository.findByTenantIdAndStatus(tenant, EvaluationStatus.COMPLETED);
        assertThat(completedList).hasSize(1);
        assertThat(completedList.get(0).getName()).isEqualTo("지원자2");
    }
}

