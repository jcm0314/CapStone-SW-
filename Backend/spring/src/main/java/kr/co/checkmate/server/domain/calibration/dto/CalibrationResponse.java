package kr.co.checkmate.server.domain.calibration.dto;

import kr.co.checkmate.server.domain.calibration.entity.CalibrationCorrection;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Builder
public class CalibrationResponse {

    private UUID id;
    private UUID tenantId;
    private UUID applicantId;
    private UUID evaluationResultId;
    private String correctorEmail;
    private Integer originalScore;
    private Integer correctedScore;
    private Integer scoreDelta;
    private String originalDecision;
    private String correctedDecision;
    private String correctionReason;
    private String fewShotContextText;
    private LocalDateTime createdAt;

    public static CalibrationResponse from(CalibrationCorrection correction) {
        int delta = correction.getCorrectedScore() - correction.getOriginalScore();

        return CalibrationResponse.builder()
                .id(correction.getId())
                .tenantId(correction.getTenantId())
                .applicantId(correction.getApplicantId())
                .evaluationResultId(correction.getEvaluationResultId())
                .correctorEmail(correction.getCorrectorEmail())
                .originalScore(correction.getOriginalScore())
                .correctedScore(correction.getCorrectedScore())
                .scoreDelta(delta)
                .originalDecision(correction.getOriginalDecision())
                .correctedDecision(correction.getCorrectedDecision())
                .correctionReason(correction.getCorrectionReason())
                .fewShotContextText(correction.getFewShotContextText())
                .createdAt(correction.getCreatedAt())
                .build();
    }
}
