package kr.co.checkmate.server.domain.feedback.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import kr.co.checkmate.server.domain.feedback.entity.ApplicantFeedbackReport;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Builder
public class FeedbackReportResponse {

    private UUID id;
    private UUID tenantId;
    private UUID applicantId;
    private UUID evaluationResultId;
    private String feedbackToken;
    private String shareUrl;
    private String strengthsSummary;
    private String improvementPoints;
    private String recommendedActions;
    private String overallCoachingComment;

    @JsonProperty("isSent")
    private boolean isSent;

    private LocalDateTime sentAt;
    private int viewCount;
    private LocalDateTime createdAt;

    public static FeedbackReportResponse from(ApplicantFeedbackReport report, String baseUrl) {
        String url = (baseUrl != null ? baseUrl : "") + "/feedback/" + report.getFeedbackToken();

        return FeedbackReportResponse.builder()
                .id(report.getId())
                .tenantId(report.getTenantId())
                .applicantId(report.getApplicantId())
                .evaluationResultId(report.getEvaluationResultId())
                .feedbackToken(report.getFeedbackToken())
                .shareUrl(url)
                .strengthsSummary(report.getStrengthsSummary())
                .improvementPoints(report.getImprovementPoints())
                .recommendedActions(report.getRecommendedActions())
                .overallCoachingComment(report.getOverallCoachingComment())
                .isSent(report.isSent())
                .sentAt(report.getSentAt())
                .viewCount(report.getViewCount())
                .createdAt(report.getCreatedAt())
                .build();
    }
}
