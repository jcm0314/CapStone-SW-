package kr.co.checkmate.server.domain.tenant;

import kr.co.checkmate.server.config.JpaConfig;
import kr.co.checkmate.server.domain.tenant.entity.CompanyTenant;
import kr.co.checkmate.server.domain.tenant.entity.TenantTier;
import kr.co.checkmate.server.domain.tenant.repository.CompanyTenantRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DataJpaTest
@Import(JpaConfig.class)
class CompanyTenantRepositoryTest {

    @Autowired
    private CompanyTenantRepository tenantRepository;

    @Test
    @DisplayName("기업 테넌트를 정상 저장하고 slug로 조회할 수 있다")
    void saveAndFindTenantBySlug() {
        // given
        CompanyTenant tenant = CompanyTenant.builder()
                .slug("toss-core")
                .name("비바리퍼블리카")
                .tier(TenantTier.ENTERPRISE)
                .description("토스 금융/결제 도메인 테넌트")
                .build();

        // when
        CompanyTenant saved = tenantRepository.save(tenant);

        // then
        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getCreatedAt()).isNotNull();
        assertThat(saved.getUpdatedAt()).isNotNull();

        Optional<CompanyTenant> found = tenantRepository.findBySlug("toss-core");
        assertThat(found).isPresent();
        assertThat(found.get().getName()).isEqualTo("비바리퍼블리카");
        assertThat(found.get().getTier()).isEqualTo(TenantTier.ENTERPRISE);
        assertThat(found.get().isActive()).isTrue();
    }

    @Test
    @DisplayName("동일한 slug의 테넌트 중복 생성 시 유니크 제약조건 위반 예외가 발생한다")
    void duplicateSlugThrowsException() {
        // given
        CompanyTenant tenant1 = CompanyTenant.builder()
                .slug("duplicate-slug")
                .name("기업1")
                .build();
        tenantRepository.saveAndFlush(tenant1);

        CompanyTenant tenant2 = CompanyTenant.builder()
                .slug("duplicate-slug")
                .name("기업2")
                .build();

        // when & then
        assertThatThrownBy(() -> tenantRepository.saveAndFlush(tenant2))
                .isInstanceOf(DataIntegrityViolationException.class);
    }
}
