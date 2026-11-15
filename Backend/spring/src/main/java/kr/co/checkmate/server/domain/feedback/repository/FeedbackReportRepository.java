package kr.co.checkmate.server.domain.feedback.repository;

import kr.co.checkmate.server.domain.feedback.entity.ApplicantFeedbackReport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface FeedbackReportRepository extends JpaRepository<ApplicantFeedbackReport, UUID> {

    Optional<ApplicantFeedbackReport> findByTenantIdAndApplicantId(UUID tenantId, UUID applicantId);

    Optional<ApplicantFeedbackReport> findByFeedbackToken(String feedbackToken);
}
