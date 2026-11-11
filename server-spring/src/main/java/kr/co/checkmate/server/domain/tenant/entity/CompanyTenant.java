package kr.co.checkmate.server.domain.tenant.entity;

import jakarta.persistence.*;
import kr.co.checkmate.server.common.domain.BaseTimeEntity;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Entity
@Table(
        name = "company_tenants",
        indexes = {
                @Index(name = "idx_company_tenants_slug", columnList = "slug", unique = true)
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CompanyTenant extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "slug", nullable = false, unique = true, length = 50)
    private String slug;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "tier", nullable = false, length = 20)
    private TenantTier tier;

    @Column(name = "is_active", nullable = false)
    private boolean active;

    @Column(name = "description", length = 500)
    private String description;

    @Builder
    public CompanyTenant(String slug, String name, TenantTier tier, Boolean active, String description) {
        this.slug = slug;
        this.name = name;
        this.tier = tier != null ? tier : TenantTier.FREE;
        this.active = active != null ? active : true;
        this.description = description;
    }

    public void updateInfo(String name, String description) {
        this.name = name;
        this.description = description;
    }

    public void changeTier(TenantTier newTier) {
        this.tier = newTier;
    }

    public void deactivate() {
        this.active = false;
    }

    public void activate() {
        this.active = true;
    }
}
