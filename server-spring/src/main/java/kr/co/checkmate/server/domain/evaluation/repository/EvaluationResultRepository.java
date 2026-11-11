package kr.co.checkmate.server.domain.evaluation.repository;

import kr.co.checkmate.server.domain.evaluation.entity.EvaluationResult;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface EvaluationResultRepository extends JpaRepository<EvaluationResult, UUID> {

    @EntityGraph(attributePaths = {"evidenceSentences"})
    Optional<EvaluationResult> findByTenantIdAndApplicantId(UUID tenantId, UUID applicantId);

    @EntityGraph(attributePaths = {"evidenceSentences"})
    Optional<EvaluationResult> findByTenantIdAndId(UUID tenantId, UUID id);

    List<EvaluationResult> findByTenantId(UUID tenantId);

    boolean existsByTenantIdAndApplicantId(UUID tenantId, UUID applicantId);

    void deleteByTenantIdAndApplicantId(UUID tenantId, UUID applicantId);
}

