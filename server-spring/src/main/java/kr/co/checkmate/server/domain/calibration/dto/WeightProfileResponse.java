package kr.co.checkmate.server.domain.calibration.dto;

import kr.co.checkmate.server.domain.calibration.entity.TenantWeightProfile;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Builder
public class WeightProfileResponse {

    private UUID id;
    private UUID tenantId;
    private String jobRole;
    private Integer cultureFitWeight;
    private Integer jobCompetencyWeight;
    private Integer problemSolvingWeight;
    private Integer collaborationWeight;
    private Integer totalWeight;
    private String description;
    private LocalDateTime updatedAt;

    public static WeightProfileResponse from(TenantWeightProfile profile) {
        int total = profile.getCultureFitWeight()
                + profile.getJobCompetencyWeight()
                + profile.getProblemSolvingWeight()
                + profile.getCollaborationWeight();

        return WeightProfileResponse.builder()
                .id(profile.getId())
                .tenantId(profile.getTenantId())
                .jobRole(profile.getJobRole())
                .cultureFitWeight(profile.getCultureFitWeight())
                .jobCompetencyWeight(profile.getJobCompetencyWeight())
                .problemSolvingWeight(profile.getProblemSolvingWeight())
                .collaborationWeight(profile.getCollaborationWeight())
                .totalWeight(total)
                .description(profile.getDescription())
                .updatedAt(profile.getUpdatedAt())
                .build();
    }
}
