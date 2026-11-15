package kr.co.checkmate.server.domain.feedback.dto;

import kr.co.checkmate.server.domain.feedback.entity.ApplicantFeedbackReport;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class PublicFeedbackReportResponse {

    private String feedbackToken;
    private String strengthsSummary;
    private String improvementPoints;
    private String recommendedActions;
    private String overallCoachingComment;
    private LocalDateTime generatedAt;

    public static PublicFeedbackReportResponse from(ApplicantFeedbackReport report) {
        return PublicFeedbackReportResponse.builder()
                .feedbackToken(report.getFeedbackToken())
                .strengthsSummary(report.getStrengthsSummary())
                .improvementPoints(report.getImprovementPoints())
                .recommendedActions(report.getRecommendedActions())
                .overallCoachingComment(report.getOverallCoachingComment())
                .generatedAt(report.getCreatedAt())
                .build();
    }
}
