package kr.co.checkmate.server.domain.applicant.repository;

import kr.co.checkmate.server.domain.applicant.entity.Applicant;
import kr.co.checkmate.server.domain.applicant.entity.EvaluationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ApplicantRepository extends JpaRepository<Applicant, UUID> {

    List<Applicant> findByTenantId(UUID tenantId);

    Optional<Applicant> findByTenantIdAndId(UUID tenantId, UUID id);

    List<Applicant> findByTenantIdAndStatus(UUID tenantId, EvaluationStatus status);

    long countByTenantId(UUID tenantId);

    long countByTenantIdAndStatus(UUID tenantId, EvaluationStatus status);

    void deleteByTenantIdAndId(UUID tenantId, UUID id);
}

