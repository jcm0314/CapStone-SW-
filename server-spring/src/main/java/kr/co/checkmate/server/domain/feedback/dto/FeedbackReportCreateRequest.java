package kr.co.checkmate.server.domain.feedback.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Getter
@NoArgsConstructor
public class FeedbackReportCreateRequest {

    private UUID evaluationResultId;

    @NotBlank(message = "강점 요약(strengthsSummary)은 필수입니다.")
    private String strengthsSummary;

    @NotBlank(message = "보완 및 개선점(improvementPoints)은 필수입니다.")
    private String improvementPoints;

    @NotBlank(message = "추천 학습 및 행동 가이드(recommendedActions)는 필수입니다.")
    private String recommendedActions;

    private String overallCoachingComment;

    @Builder
    public FeedbackReportCreateRequest(
            UUID evaluationResultId,
            String strengthsSummary,
            String improvementPoints,
            String recommendedActions,
            String overallCoachingComment
    ) {
        this.evaluationResultId = evaluationResultId;
        this.strengthsSummary = strengthsSummary;
        this.improvementPoints = improvementPoints;
        this.recommendedActions = recommendedActions;
        this.overallCoachingComment = overallCoachingComment;
    }
}
