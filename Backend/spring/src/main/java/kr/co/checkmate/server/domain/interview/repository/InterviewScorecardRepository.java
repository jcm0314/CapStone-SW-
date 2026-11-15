package kr.co.checkmate.server.domain.interview.repository;

import kr.co.checkmate.server.domain.interview.entity.InterviewScorecard;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface InterviewScorecardRepository extends JpaRepository<InterviewScorecard, UUID> {

    @EntityGraph(attributePaths = {"questionEvaluations"})
    List<InterviewScorecard> findByTenantIdAndApplicantId(UUID tenantId, UUID applicantId);

    @EntityGraph(attributePaths = {"questionEvaluations"})
    Optional<InterviewScorecard> findByTenantIdAndApplicantIdAndInterviewerName(
            UUID tenantId, UUID applicantId, String interviewerName
    );

    long countByTenantIdAndApplicantId(UUID tenantId, UUID applicantId);
}
