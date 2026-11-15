package kr.co.checkmate.server.domain.interview.entity;

import jakarta.persistence.*;
import kr.co.checkmate.server.common.domain.BaseTimeEntity;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(
        name = "interview_scorecards",
        indexes = {
                @Index(name = "idx_scorecard_tenant_applicant", columnList = "tenant_id, applicant_id"),
                @Index(name = "idx_scorecard_interviewer", columnList = "tenant_id, applicant_id, interviewer_name", unique = true)
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class InterviewScorecard extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "applicant_id", nullable = false)
    private UUID applicantId;

    @Column(name = "interviewer_name", nullable = false, length = 100)
    private String interviewerName;

    @Enumerated(EnumType.STRING)
    @Column(name = "recommendation", nullable = false, length = 20)
    private InterviewRecommendation recommendation;

    @Column(name = "total_score", nullable = false)
    private Integer totalScore;

    @Column(name = "overall_comment", columnDefinition = "TEXT")
    private String overallComment;

    @OneToMany(mappedBy = "interviewScorecard", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<InterviewQuestionEvaluation> questionEvaluations = new ArrayList<>();

    @Builder
    public InterviewScorecard(UUID tenantId, UUID applicantId, String interviewerName,
                              InterviewRecommendation recommendation, Integer totalScore,
                              String overallComment) {
        this.tenantId = tenantId;
        this.applicantId = applicantId;
        this.interviewerName = interviewerName;
        this.recommendation = recommendation != null ? recommendation : InterviewRecommendation.HOLD;
        this.totalScore = totalScore != null ? totalScore : 0;
        this.overallComment = overallComment;
    }

    public void updateScorecard(InterviewRecommendation recommendation, Integer totalScore, String overallComment) {
        this.recommendation = recommendation;
        this.totalScore = totalScore != null ? totalScore : 0;
        this.overallComment = overallComment;
    }

    public void addQuestionEvaluation(InterviewQuestionEvaluation evaluation) {
        this.questionEvaluations.add(evaluation);
        evaluation.assignScorecard(this);
    }

    public void clearQuestionEvaluations() {
        this.questionEvaluations.clear();
    }
}
