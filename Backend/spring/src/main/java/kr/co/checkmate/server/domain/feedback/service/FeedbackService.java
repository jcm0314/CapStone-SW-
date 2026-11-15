package kr.co.checkmate.server.domain.feedback.service;

import kr.co.checkmate.server.common.exception.EntityNotFoundException;
import kr.co.checkmate.server.domain.applicant.repository.ApplicantRepository;
import kr.co.checkmate.server.domain.feedback.dto.FeedbackReportCreateRequest;
import kr.co.checkmate.server.domain.feedback.dto.FeedbackReportResponse;
import kr.co.checkmate.server.domain.feedback.dto.PublicFeedbackReportResponse;
import kr.co.checkmate.server.domain.feedback.entity.ApplicantFeedbackReport;
import kr.co.checkmate.server.domain.feedback.repository.FeedbackReportRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class FeedbackService {

    private final FeedbackReportRepository feedbackReportRepository;
    private final ApplicantRepository applicantRepository;

    @Value("${app.frontend.url:http://localhost:5173}")
    private String frontendUrl;

    @Transactional
    public FeedbackReportResponse createOrUpdateFeedbackReport(
            UUID tenantId,
            UUID applicantId,
            FeedbackReportCreateRequest request
    ) {
        // 지원자 존재 및 테넌트 소속 검증
        applicantRepository.findByTenantIdAndId(tenantId, applicantId)
                .orElseThrow(() -> new EntityNotFoundException("Applicant not found with id: " + applicantId));

        ApplicantFeedbackReport report = feedbackReportRepository.findByTenantIdAndApplicantId(tenantId, applicantId)
                .map(existing -> {
                    existing.update(
                            request.getStrengthsSummary(),
                            request.getImprovementPoints(),
                            request.getRecommendedActions(),
                            request.getOverallCoachingComment()
                    );
                    log.info("Updated feedback report for applicant: {}, tenant: {}", applicantId, tenantId);
                    return existing;
                })
                .orElseGet(() -> {
                    ApplicantFeedbackReport newReport = ApplicantFeedbackReport.builder()
                            .tenantId(tenantId)
                            .applicantId(applicantId)
                            .evaluationResultId(request.getEvaluationResultId())
                            .strengthsSummary(request.getStrengthsSummary())
                            .improvementPoints(request.getImprovementPoints())
                            .recommendedActions(request.getRecommendedActions())
                            .overallCoachingComment(request.getOverallCoachingComment())
                            .build();
                    log.info("Created new feedback report with token: {} for applicant: {}",
                            newReport.getFeedbackToken(), applicantId);
                    return feedbackReportRepository.save(newReport);
                });

        return FeedbackReportResponse.from(report, frontendUrl);
    }

    public FeedbackReportResponse getFeedbackReport(UUID tenantId, UUID applicantId) {
        ApplicantFeedbackReport report = feedbackReportRepository.findByTenantIdAndApplicantId(tenantId, applicantId)
                .orElseThrow(() -> new EntityNotFoundException("FeedbackReport not found for applicant: " + applicantId));

        return FeedbackReportResponse.from(report, frontendUrl);
    }

    @Transactional
    public FeedbackReportResponse markFeedbackAsSent(UUID tenantId, UUID applicantId) {
        ApplicantFeedbackReport report = feedbackReportRepository.findByTenantIdAndApplicantId(tenantId, applicantId)
                .orElseThrow(() -> new EntityNotFoundException("FeedbackReport not found for applicant: " + applicantId));

        report.markAsSent();
        log.info("Marked feedback report as sent for applicant: {}, sentAt: {}", applicantId, report.getSentAt());

        return FeedbackReportResponse.from(report, frontendUrl);
    }

    @Transactional
    public PublicFeedbackReportResponse getPublicFeedbackReport(String feedbackToken) {
        ApplicantFeedbackReport report = feedbackReportRepository.findByFeedbackToken(feedbackToken)
                .orElseThrow(() -> new EntityNotFoundException("Public feedback not found for token: " + feedbackToken));

        report.incrementViewCount();
        log.info("Public feedback opened: token={}, viewCount={}", feedbackToken, report.getViewCount());

        return PublicFeedbackReportResponse.from(report);
    }
}
