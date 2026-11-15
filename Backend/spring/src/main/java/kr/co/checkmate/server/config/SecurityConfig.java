package kr.co.checkmate.server.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import kr.co.checkmate.server.security.JwtConfig;
import kr.co.checkmate.server.security.JwtTokenService;
import kr.co.checkmate.server.security.SecurityErrorWriter;
import kr.co.checkmate.server.security.TenantIsolationFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.annotation.web.configurers.HeadersConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.oauth2.server.resource.web.authentication.BearerTokenAuthenticationFilter;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

/**
 * JWT 기반 인증 + 테넌트 격리 + 역할(RBAC) 설정 (Issue #23, 명세 #21).
 *
 * <pre>
 * 공개      : /api/v1/health, /api/v1/public/**, POST /api/v1/auth/login, /actuator/health, /actuator/info
 * 조회(GET) : ADMIN, RECRUITER, INTERVIEWER
 * 면접 스코어카드 제출 : ADMIN, RECRUITER, INTERVIEWER
 * 지원자 등록/삭제/상태, 평가 저장/승인(HITL), 피드백·공유링크, 가중치, 보정 기록 : ADMIN, RECRUITER
 * 그 밖의 /api/v1/tenants/** 쓰기 : ADMIN (기본 거부)
 * </pre>
 * 테넌트 일치 검사는 {@link TenantIsolationFilter} 가 RBAC 보다 먼저 수행합니다 (불일치 시 404).
 */
@Configuration
@EnableWebSecurity
@Import(JwtConfig.class)
public class SecurityConfig {

    private static final String ADMIN = "ADMIN";
    private static final String RECRUITER = "RECRUITER";
    private static final String INTERVIEWER = "INTERVIEWER";

    private final ObjectMapper objectMapper;

    public SecurityConfig(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .headers(headers -> headers.frameOptions(HeadersConfigurer.FrameOptionsConfig::sameOrigin))
                .httpBasic(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable)
                .oauth2ResourceServer(oauth2 -> oauth2
                        .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter()))
                        .authenticationEntryPoint(authenticationEntryPoint())
                        .accessDeniedHandler(accessDeniedHandler()))
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint(authenticationEntryPoint())
                        .accessDeniedHandler(accessDeniedHandler()))
                .addFilterAfter(new TenantIsolationFilter(objectMapper), BearerTokenAuthenticationFilter.class)
                .authorizeHttpRequests(auth -> auth
                        // 공개 엔드포인트
                        .requestMatchers("/api/v1/health").permitAll()
                        .requestMatchers("/api/v1/public/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v1/auth/login").permitAll()
                        .requestMatchers("/actuator/health", "/actuator/health/**", "/actuator/info").permitAll()
                        .requestMatchers("/h2-console/**").permitAll() // local 프로필에서만 콘솔이 활성화됨
                        .requestMatchers("/error").permitAll()
                        .requestMatchers("/actuator/**").hasRole(ADMIN)

                        // 테넌트 리소스 조회: 모든 역할
                        .requestMatchers(HttpMethod.GET, "/api/v1/tenants/**").hasAnyRole(ADMIN, RECRUITER, INTERVIEWER)

                        // 면접 스코어카드 제출: 면접관 포함
                        .requestMatchers(HttpMethod.POST, "/api/v1/tenants/*/applicants/*/interviews")
                        .hasAnyRole(ADMIN, RECRUITER, INTERVIEWER)

                        // 지원자 등록/삭제/상태 변경
                        .requestMatchers(HttpMethod.POST, "/api/v1/tenants/*/applicants").hasAnyRole(ADMIN, RECRUITER)
                        .requestMatchers(HttpMethod.DELETE, "/api/v1/tenants/*/applicants/*").hasAnyRole(ADMIN, RECRUITER)
                        .requestMatchers(HttpMethod.PATCH, "/api/v1/tenants/*/applicants/*/status").hasAnyRole(ADMIN, RECRUITER)

                        // 평가 저장 / HITL 승인
                        .requestMatchers("/api/v1/tenants/*/applicants/*/evaluation",
                                "/api/v1/tenants/*/applicants/*/evaluation/**").hasAnyRole(ADMIN, RECRUITER)

                        // 피드백 리포트 + 공개 공유링크 발급/발송
                        .requestMatchers("/api/v1/tenants/*/applicants/*/feedback",
                                "/api/v1/tenants/*/applicants/*/feedback/**").hasAnyRole(ADMIN, RECRUITER)

                        // 직무 가중치 수정 / HITL 보정 기록
                        .requestMatchers(HttpMethod.PUT, "/api/v1/tenants/*/weights").hasAnyRole(ADMIN, RECRUITER)
                        .requestMatchers(HttpMethod.POST, "/api/v1/tenants/*/calibrations").hasAnyRole(ADMIN, RECRUITER)

                        // 명시되지 않은 테넌트 쓰기 요청은 ADMIN 만 (기본 거부)
                        .requestMatchers("/api/v1/tenants/**").hasRole(ADMIN)

                        // 그 외 (/api/v1/auth/me 등) 로그인 필요
                        .anyRequest().authenticated()
                );

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    /** JWT 의 role 클레임(ADMIN 등)을 ROLE_ADMIN 권한으로 매핑 */
    private JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtGrantedAuthoritiesConverter authorities = new JwtGrantedAuthoritiesConverter();
        authorities.setAuthoritiesClaimName(JwtTokenService.CLAIM_ROLE);
        authorities.setAuthorityPrefix("ROLE_");

        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(authorities);
        return converter;
    }

    private AuthenticationEntryPoint authenticationEntryPoint() {
        return (request, response, ex) -> SecurityErrorWriter.write(objectMapper, response,
                HttpStatus.UNAUTHORIZED.value(), "UNAUTHORIZED", "인증이 필요합니다. 로그인 후 다시 시도하세요.");
    }

    private AccessDeniedHandler accessDeniedHandler() {
        return (request, response, ex) -> SecurityErrorWriter.write(objectMapper, response,
                HttpStatus.FORBIDDEN.value(), "FORBIDDEN", "이 작업을 수행할 권한이 없습니다.");
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(List.of("http://localhost:*", "http://127.0.0.1:*"));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
