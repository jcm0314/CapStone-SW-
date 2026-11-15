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
        name = "tenant_weight_profiles",
        indexes = {
                @Index(name = "idx_weight_tenant_role", columnList = "tenant_id, job_role", unique = true)
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class TenantWeightProfile extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "job_role", nullable = false, length = 50)
    private String jobRole;

    @Column(name = "culture_fit_weight", nullable = false)
    private Integer cultureFitWeight;

    @Column(name = "job_competency_weight", nullable = false)
    private Integer jobCompetencyWeight;

    @Column(name = "problem_solving_weight", nullable = false)
    private Integer problemSolvingWeight;

    @Column(name = "collaboration_weight", nullable = false)
    private Integer collaborationWeight;

    @Column(name = "description", length = 500)
    private String description;

    @Builder
    public TenantWeightProfile(
            UUID tenantId,
            String jobRole,
            Integer cultureFitWeight,
            Integer jobCompetencyWeight,
            Integer problemSolvingWeight,
            Integer collaborationWeight,
            String description
    ) {
        this.tenantId = tenantId;
        this.jobRole = (jobRole != null && !jobRole.isBlank()) ? jobRole.toUpperCase().trim() : "DEFAULT";
        this.cultureFitWeight = cultureFitWeight != null ? cultureFitWeight : 25;
        this.jobCompetencyWeight = jobCompetencyWeight != null ? jobCompetencyWeight : 35;
        this.problemSolvingWeight = problemSolvingWeight != null ? problemSolvingWeight : 25;
        this.collaborationWeight = collaborationWeight != null ? collaborationWeight : 15;
        this.description = description;
    }

    public void update(
            Integer cultureFitWeight,
            Integer jobCompetencyWeight,
            Integer problemSolvingWeight,
            Integer collaborationWeight,
            String description
    ) {
        if (cultureFitWeight != null) this.cultureFitWeight = cultureFitWeight;
        if (jobCompetencyWeight != null) this.jobCompetencyWeight = jobCompetencyWeight;
        if (problemSolvingWeight != null) this.problemSolvingWeight = problemSolvingWeight;
        if (collaborationWeight != null) this.collaborationWeight = collaborationWeight;
        if (description != null) this.description = description;
    }
}
