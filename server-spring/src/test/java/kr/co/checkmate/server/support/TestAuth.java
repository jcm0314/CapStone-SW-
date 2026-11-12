package kr.co.checkmate.server.support;

import kr.co.checkmate.server.domain.user.entity.UserRole;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import java.util.UUID;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;

/**
 * MockMvc 요청에 JWT 인증(테넌트 + 역할)을 붙이는 테스트 헬퍼.
 * 실제 서명 검증 없이 JwtAuthenticationToken 을 SecurityContext 에 주입합니다.
 */
public final class TestAuth {

    private TestAuth() {
    }

    public static RequestPostProcessor as(UserRole role, UUID tenantId) {
        return jwt()
                .jwt(token -> token
                        .subject(UUID.randomUUID().toString())
                        .claim("tenantId", tenantId.toString())
                        .claim("role", role.name()))
                .authorities(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }

    public static RequestPostProcessor admin(UUID tenantId) {
        return as(UserRole.ADMIN, tenantId);
    }

    public static RequestPostProcessor recruiter(UUID tenantId) {
        return as(UserRole.RECRUITER, tenantId);
    }

    public static RequestPostProcessor interviewer(UUID tenantId) {
        return as(UserRole.INTERVIEWER, tenantId);
    }
}
