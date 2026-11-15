package kr.co.checkmate.server.domain.calibration.repository;

import kr.co.checkmate.server.domain.calibration.entity.CalibrationCorrection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CalibrationCorrectionRepository extends JpaRepository<CalibrationCorrection, UUID> {

    List<CalibrationCorrection> findAllByTenantIdOrderByCreatedAtDesc(UUID tenantId);

    List<CalibrationCorrection> findAllByTenantIdAndApplicantIdOrderByCreatedAtDesc(UUID tenantId, UUID applicantId);
}
