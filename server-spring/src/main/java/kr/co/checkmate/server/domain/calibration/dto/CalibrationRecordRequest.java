package kr.co.checkmate.server.domain.calibration.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Getter
@NoArgsConstructor
public class CalibrationRecordRequest {

    @NotNull(message = "지원자 ID(applicantId)는 필수입니다.")
    private UUID applicantId;

    private UUID evaluationResultId;

    @NotBlank(message = "교정자 이메일(correctorEmail)은 필수입니다.")
    @Email(message = "올바른 이메일 형식이어야 합니다.")
    private String correctorEmail;

    @NotNull(message = "원래 AI 점수는 필수입니다.")
    @Min(value = 0, message = "점수는 0점 이상이어야 합니다.")
    @Max(value = 100, message = "점수는 100점 이하이어야 합니다.")
    private Integer originalScore;

    @NotNull(message = "교정 점수는 필수입니다.")
    @Min(value = 0, message = "점수는 0점 이상이어야 합니다.")
    @Max(value = 100, message = "점수는 100점 이하이어야 합니다.")
    private Integer correctedScore;

    private String originalDecision;
    private String correctedDecision;

    @NotBlank(message = "교정 사유(correctionReason)는 필수입니다.")
    private String correctionReason;

    private String fewShotContextText;

    @Builder
    public CalibrationRecordRequest(
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
