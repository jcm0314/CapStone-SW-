package kr.co.checkmate.server.domain.feedback.entity;

import jakarta.persistence.*;
import kr.co.checkmate.server.common.domain.BaseTimeEntity;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(
        name = "applicant_feedback_reports",
        indexes = {
                @Index(name = "idx_feedback_tenant_applicant", columnList = "tenant_id, applicant_id", unique = true),
                @Index(name = "idx_feedback_token", columnList = "feedback_token", unique = true)
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ApplicantFeedbackReport extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "applicant_id", nullable = false)
    private UUID applicantId;

    @Column(name = "evaluation_result_id")
    private UUID evaluationResultId;

    @Column(name = "feedback_token", nullable = false, unique = true, length = 64)
    private String feedbackToken;

    @Column(name = "strengths_summary", nullable = false, columnDefinition = "TEXT")
    private String strengthsSummary;

    @Column(name = "improvement_points", nullable = false, columnDefinition = "TEXT")
    private String improvementPoints;

    @Column(name = "recommended_actions", nullable = false, columnDefinition = "TEXT")
    private String recommendedActions;

    @Column(name = "overall_coaching_comment", columnDefinition = "TEXT")
    private String overallCoachingComment;

    @Column(name = "is_sent", nullable = false)
    private boolean isSent;

    @Column(name = "sent_at")
    private LocalDateTime sentAt;

    @Column(name = "view_count", nullable = false)
    private int viewCount;

    @Builder
    public ApplicantFeedbackReport(
            UUID tenantId,
            UUID applicantId,
            UUID evaluationResultId,
            String feedbackToken,
            String strengthsSummary,
            String improvementPoints,
            String recommendedActions,
            String overallCoachingComment
    ) {
        this.tenantId = tenantId;
        this.applicantId = applicantId;
        this.evaluationResultId = evaluationResultId;
        this.feedbackToken = (feedbackToken != null && !feedbackToken.isBlank())
                ? feedbackToken
                : UUID.randomUUID().toString();
        this.strengthsSummary = strengthsSummary;
        this.improvementPoints = improvementPoints;
        this.recommendedActions = recommendedActions;
        this.overallCoachingComment = overallCoachingComment;
        this.isSent = false;
        this.viewCount = 0;
    }

    public void update(
            String strengthsSummary,
            String improvementPoints,
            String recommendedActions,
            String overallCoachingComment
    ) {
        if (strengthsSummary != null) this.strengthsSummary = strengthsSummary;
        if (improvementPoints != null) this.improvementPoints = improvementPoints;
        if (recommendedActions != null) this.recommendedActions = recommendedActions;
        if (overallCoachingComment != null) this.overallCoachingComment = overallCoachingComment;
    }

    public void markAsSent() {
        this.isSent = true;
        this.sentAt = LocalDateTime.now();
    }

    public void incrementViewCount() {
        this.viewCount += 1;
    }
}
