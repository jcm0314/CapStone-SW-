package kr.co.checkmate.server.domain.evaluation.entity;

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
        name = "evaluation_results",
        indexes = {
                @Index(name = "idx_eval_tenant_applicant", columnList = "tenant_id, applicant_id"),
                @Index(name = "idx_eval_tenant_score", columnList = "tenant_id, total_score")
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class EvaluationResult extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "applicant_id", nullable = false)
    private UUID applicantId;

    @Column(name = "summary", nullable = false, columnDefinition = "TEXT")
    private String summary;

    @Column(name = "total_score", nullable = false)
    private Integer totalScore;

    @Column(name = "pass_recommendation", nullable = false)
    private boolean passRecommendation;

    @Column(name = "fit_score")
    private Integer fitScore;

    @Column(name = "competency_score")
    private Integer competencyScore;

    @Column(name = "plagiarism_score")
    private Integer plagiarismScore;

    @Column(name = "is_reviewed_by_human", nullable = false)
    private boolean reviewedByHuman;

    @Column(name = "reviewer_notes", columnDefinition = "TEXT")
    private String reviewerNotes;

    @OneToMany(mappedBy = "evaluationResult", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<EvidenceSentence> evidenceSentences = new ArrayList<>();

    @Builder
    public EvaluationResult(UUID tenantId, UUID applicantId, String summary,
                            Integer totalScore, Boolean passRecommendation,
                            Integer fitScore, Integer competencyScore, Integer plagiarismScore,
                            Boolean reviewedByHuman, String reviewerNotes) {
        this.tenantId = tenantId;
        this.applicantId = applicantId;
        this.summary = summary;
        this.totalScore = totalScore != null ? totalScore : 0;
        this.passRecommendation = passRecommendation != null ? passRecommendation : false;
        this.fitScore = fitScore;
        this.competencyScore = competencyScore;
        this.plagiarismScore = plagiarismScore;
        this.reviewedByHuman = reviewedByHuman != null ? reviewedByHuman : false;
        this.reviewerNotes = reviewerNotes;
    }

    public void addEvidenceSentence(EvidenceSentence evidenceSentence) {
        this.evidenceSentences.add(evidenceSentence);
        evidenceSentence.assignEvaluationResult(this);
    }

    public void approveByHuman(String notes) {
        this.reviewedByHuman = true;
        this.reviewerNotes = notes;
    }
}

