package kr.co.checkmate.server.security;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * JWT 설정 (application.yml 의 checkmate.jwt.*)
 *
 * @param secret            HS256 서명 키. 환경변수 JWT_SECRET 으로 주입 (최소 32바이트)
 * @param expirationSeconds 액세스 토큰 유효시간(초). 기본 3600
 * @param issuer            토큰 발급자(iss) 클레임
 */
@ConfigurationProperties(prefix = "checkmate.jwt")
public record JwtProperties(String secret, Long expirationSeconds, String issuer) {

    public JwtProperties {
        if (expirationSeconds == null || expirationSeconds <= 0) {
            expirationSeconds = 3600L;
        }
        if (issuer == null || issuer.isBlank()) {
            issuer = "checkmate-core";
        }
    }
}
