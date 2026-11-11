package kr.co.checkmate.server.domain.calibration.entity;

import jakarta.persistence.*;
import kr.co.checkmate.server.common.domain.BaseTimeEntity;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Entity
@Table(
        name = "calibration_corrections",
        indexes = {
                @Index(name = "idx_calib_tenant_applicant", columnList = "tenant_id, applicant_id"),
                @Index(name = "idx_calib_tenant_created", columnList = "tenant_id, created_at")
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CalibrationCorrection extends BaseTimeEntity {

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

    @Column(name = "corrector_email", nullable = false, length = 150)
    private String correctorEmail;

    @Column(name = "original_score", nullable = false)
    private Integer originalScore;

    @Column(name = "corrected_score", nullable = false)
    private Integer correctedScore;

    @Column(name = "original_decision", length = 30)
    private String originalDecision;

    @Column(name = "corrected_decision", length = 30)
    private String correctedDecision;

    @Column(name = "correction_reason", nullable = false, columnDefinition = "TEXT")
    private String correctionReason;

    @Column(name = "few_shot_context_text", columnDefinition = "TEXT")
    private String fewShotContextText;

    @Builder
    public CalibrationCorrection(
            UUID tenantId,
            UUID applicantId,
            UUID evaluationResultId,
            String correctorEmail,
            Integer originalScore,
            Integer correctedScore,
            String originalDecision,
            String correctedDecision,
            String correctionReason,
            String fewShotContextText
    ) {
        this.tenantId = tenantId;
        this.applicantId = applicantId;
        this.evaluationResultId = evaluationResultId;
        this.correctorEmail = correctorEmail;
        this.originalScore = originalScore;
        this.correctedScore = correctedScore;
        this.originalDecision = originalDecision;
        this.correctedDecision = correctedDecision;
        this.correctionReason = correctionReason;
        this.fewShotContextText = fewShotContextText;
    }
}
