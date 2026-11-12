package kr.co.checkmate.server.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import kr.co.checkmate.server.common.tenant.TenantContext;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.PathContainer;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.util.pattern.PathPattern;
import org.springframework.web.util.pattern.PathPatternParser;

import java.io.IOException;
import java.util.UUID;

/**
 * 테넌트 격리 필터 (Issue #23).
 *
 * <p>/api/v1/tenants/{tenantId}/** 요청에서 경로의 tenantId 가 JWT 의 tenantId 와 다르면
 * 존재 여부를 노출하지 않도록 403 이 아닌 404 를 반환합니다 (#21 에러 규칙).
 * 일치하면 요청 동안 {@link TenantContext} 에 토큰의 tenantId 를 설정하고, 요청이 끝나면 반드시 비웁니다.
 *
 * <p>BearerTokenAuthenticationFilter 뒤, AuthorizationFilter(RBAC) 앞에서 실행되므로
 * 다른 테넌트 경로는 역할과 무관하게 항상 404 입니다. 토큰이 없으면 그대로 통과시켜 401 처리에 맡깁니다.
 */
public class TenantIsolationFilter extends OncePerRequestFilter {

    private static final PathPattern TENANT_PATH =
            PathPatternParser.defaultInstance.parse("/api/v1/tenants/{tenantId}/**");

    private final ObjectMapper objectMapper;

    public TenantIsolationFilter(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String path = request.getRequestURI().substring(request.getContextPath().length());
        PathPattern.PathMatchInfo match = TENANT_PATH.matchAndExtract(PathContainer.parsePath(path));
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (match == null || !(authentication instanceof JwtAuthenticationToken jwtAuth)) {
            chain.doFilter(request, response);
            return;
        }

        UUID tokenTenantId = parseUuid(jwtAuth.getToken().getClaimAsString(JwtTokenService.CLAIM_TENANT_ID));
        UUID pathTenantId = parseUuid(match.getUriVariables().get("tenantId"));

        if (tokenTenantId == null || !tokenTenantId.equals(pathTenantId)) {
            SecurityErrorWriter.write(objectMapper, response, HttpStatus.NOT_FOUND.value(),
                    "ENTITY_NOT_FOUND", "요청한 리소스를 찾을 수 없습니다.");
            return;
        }

        TenantContext.setCurrentTenant(tokenTenantId);
        try {
            chain.doFilter(request, response);
        } finally {
            TenantContext.clear();
        }
    }

    private static UUID parseUuid(String value) {
        if (value == null) {
            return null;
        }
        try {
            return UUID.fromString(value);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}
