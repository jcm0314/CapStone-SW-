package kr.co.checkmate.server.domain.calibration.repository;

import kr.co.checkmate.server.domain.calibration.entity.TenantWeightProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TenantWeightProfileRepository extends JpaRepository<TenantWeightProfile, UUID> {

    Optional<TenantWeightProfile> findByTenantIdAndJobRole(UUID tenantId, String jobRole);

    List<TenantWeightProfile> findAllByTenantId(UUID tenantId);
}
