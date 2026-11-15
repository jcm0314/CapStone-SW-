package kr.co.checkmate.server.domain.calibration.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class WeightProfileUpsertRequest {

    @NotBlank(message = "직무 구분(jobRole)은 필수입니다.")
    private String jobRole;

    @NotNull(message = "인재상 부합도 가중치는 필수입니다.")
    @Min(value = 0, message = "가중치는 0 이상이어야 합니다.")
    @Max(value = 100, message = "가중치는 100 이하이어야 합니다.")
    private Integer cultureFitWeight;

    @NotNull(message = "직무 역량 가중치는 필수입니다.")
    @Min(value = 0, message = "가중치는 0 이상이어야 합니다.")
    @Max(value = 100, message = "가중치는 100 이하이어야 합니다.")
    private Integer jobCompetencyWeight;

    @NotNull(message = "문제 해결력 가중치는 필수입니다.")
    @Min(value = 0, message = "가중치는 0 이상이어야 합니다.")
    @Max(value = 100, message = "가중치는 100 이하이어야 합니다.")
    private Integer problemSolvingWeight;

    @NotNull(message = "협업 및 소통 역량 가중치는 필수입니다.")
    @Min(value = 0, message = "가중치는 0 이상이어야 합니다.")
    @Max(value = 100, message = "가중치는 100 이하이어야 합니다.")
    private Integer collaborationWeight;

    private String description;

    @Builder
    public WeightProfileUpsertRequest(
            String jobRole,
            Integer cultureFitWeight,
            Integer jobCompetencyWeight,
            Integer problemSolvingWeight,
            Integer collaborationWeight,
            String description
    ) {
        this.jobRole = jobRole;
        this.cultureFitWeight = cultureFitWeight;
        this.jobCompetencyWeight = jobCompetencyWeight;
        this.problemSolvingWeight = problemSolvingWeight;
        this.collaborationWeight = collaborationWeight;
        this.description = description;
    }
}
