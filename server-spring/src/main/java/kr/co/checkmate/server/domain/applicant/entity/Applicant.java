package kr.co.checkmate.server.domain.applicant.entity;

import jakarta.persistence.*;
import kr.co.checkmate.server.common.domain.BaseTimeEntity;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Entity
@Table(
        name = "applicants",
        indexes = {
                @Index(name = "idx_applicants_tenant_id", columnList = "tenant_id"),
                @Index(name = "idx_applicants_tenant_status", columnList = "tenant_id, status")
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Applicant extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Column(name = "email", length = 150)
    private String email;

    @Column(name = "target_role", nullable = false, length = 100)
    private String targetRole;

    @Column(name = "cover_letter_text", nullable = false, columnDefinition = "TEXT")
    private String coverLetterText;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private EvaluationStatus status;

    @Column(name = "final_score")
    private Integer finalScore;

    @Column(name = "pass_recommendation")
    private Boolean passRecommendation;

    @Column(name = "is_anonymized", nullable = false)
    private boolean anonymized;

    @Builder
    public Applicant(UUID tenantId, String name, String email, String targetRole,
                     String coverLetterText, EvaluationStatus status,
                     Integer finalScore, Boolean passRecommendation, Boolean anonymized) {
        this.tenantId = tenantId;
        this.name = name;
        this.email = email;
        this.targetRole = targetRole;
        this.coverLetterText = coverLetterText;
        this.status = status != null ? status : EvaluationStatus.PENDING;
        this.finalScore = finalScore;
        this.passRecommendation = passRecommendation;
        this.anonymized = anonymized != null ? anonymized : true;
    }

    public void startEvaluation() {
        this.status = EvaluationStatus.EVALUATING;
    }

    public void completeEvaluation(int score, boolean passRecommendation) {
        this.status = EvaluationStatus.COMPLETED;
        this.finalScore = score;
        this.passRecommendation = passRecommendation;
    }

    public void markFailed() {
        this.status = EvaluationStatus.FAILED;
    }
}

