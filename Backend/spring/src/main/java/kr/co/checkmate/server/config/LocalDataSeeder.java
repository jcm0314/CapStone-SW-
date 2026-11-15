package kr.co.checkmate.server.config;

import kr.co.checkmate.server.domain.tenant.entity.CompanyTenant;
import kr.co.checkmate.server.domain.tenant.entity.TenantTier;
import kr.co.checkmate.server.domain.tenant.repository.CompanyTenantRepository;
import kr.co.checkmate.server.domain.user.entity.User;
import kr.co.checkmate.server.domain.user.entity.UserRole;
import kr.co.checkmate.server.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * local 프로필 전용 데모 데이터 시드.
 * 테넌트 2개(toss, daangn) × 역할별 사용자 3명(ADMIN / RECRUITER / INTERVIEWER).
 * 계정: {admin|recruiter|interviewer}@{toss|daangn}.test, 비밀번호: checkmate.seed.password (기본 checkmate1234!)
 * 운영(prod)에서는 이 빈이 생성되지 않습니다.
 */
@Slf4j
@Component
@Profile("local")
@RequiredArgsConstructor
public class LocalDataSeeder implements ApplicationRunner {

    private final CompanyTenantRepository tenantRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${checkmate.seed.password:checkmate1234!}")
    private String seedPassword;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        seedTenant("toss", "토스페이먼츠", TenantTier.ENTERPRISE, "toss.test");
        seedTenant("daangn", "당근마켓", TenantTier.PRO, "daangn.test");
    }

    private void seedTenant(String slug, String name, TenantTier tier, String emailDomain) {
        CompanyTenant tenant = tenantRepository.findBySlug(slug).orElseGet(() ->
                tenantRepository.save(CompanyTenant.builder()
                        .slug(slug)
                        .name(name)
                        .tier(tier)
                        .description("local 프로필 데모 테넌트")
                        .build()));

        String hash = passwordEncoder.encode(seedPassword);
        seedUser(tenant, "admin@" + emailDomain, name + " 관리자", UserRole.ADMIN, hash);
        seedUser(tenant, "recruiter@" + emailDomain, name + " 채용담당", UserRole.RECRUITER, hash);
        seedUser(tenant, "interviewer@" + emailDomain, name + " 면접관", UserRole.INTERVIEWER, hash);
        log.info("[local seed] tenant={} ({}) id={} users=admin|recruiter|interviewer@{}",
                name, slug, tenant.getId(), emailDomain);
    }

    private void seedUser(CompanyTenant tenant, String email, String name, UserRole role, String hash) {
        if (userRepository.existsByEmail(email)) {
            return;
        }
        userRepository.save(User.builder()
                .tenantId(tenant.getId())
                .email(email)
                .name(name)
                .role(role)
                .passwordHash(hash)
                .build());
    }
}
