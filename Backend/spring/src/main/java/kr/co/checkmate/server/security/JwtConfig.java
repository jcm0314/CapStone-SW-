package kr.co.checkmate.server.security;

import com.nimbusds.jose.jwk.source.ImmutableSecret;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;

/**
 * HS256 JWT 인코더/디코더 구성.
 * - JWT_SECRET 이 없거나 32바이트 미만이면 애플리케이션이 기동되지 않습니다.
 * - local 프로필에서만 개발용 기본 키(application-local.yml)가 허용되며, prod 에서 그 키를 쓰면 기동을 거부합니다.
 */
@Configuration
@EnableConfigurationProperties(JwtProperties.class)
public class JwtConfig {

    /** application-local.yml 의 개발용 기본 키 접두어. 운영에서 사용 금지. */
    public static final String LOCAL_DEV_SECRET_PREFIX = "local-dev-only-";

    private static final int MIN_SECRET_BYTES = 32;

    @Bean
    public SecretKey jwtSecretKey(JwtProperties properties, Environment environment) {
        String secret = properties.secret();
        if (secret == null || secret.isBlank()) {
            throw new IllegalStateException(
                    "JWT_SECRET 환경변수가 설정되지 않아 서버를 시작할 수 없습니다. "
                            + "32바이트 이상의 임의 문자열을 JWT_SECRET 으로 설정하세요 (예: openssl rand -base64 48).");
        }
        byte[] keyBytes = secret.getBytes(StandardCharsets.UTF_8);
        if (keyBytes.length < MIN_SECRET_BYTES) {
            throw new IllegalStateException("JWT_SECRET 은 HS256 보안을 위해 최소 " + MIN_SECRET_BYTES + "바이트 이상이어야 합니다.");
        }
        if (secret.startsWith(LOCAL_DEV_SECRET_PREFIX) && environment.acceptsProfiles(Profiles.of("prod"))) {
            throw new IllegalStateException("prod 프로필에서 개발용 기본 JWT 키를 사용할 수 없습니다. JWT_SECRET 을 설정하세요.");
        }
        return new SecretKeySpec(keyBytes, "HmacSHA256");
    }

    @Bean
    public JwtEncoder jwtEncoder(SecretKey jwtSecretKey) {
        return new NimbusJwtEncoder(new ImmutableSecret<>(jwtSecretKey));
    }

    @Bean
    public JwtDecoder jwtDecoder(SecretKey jwtSecretKey, JwtProperties properties) {
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withSecretKey(jwtSecretKey)
                .macAlgorithm(MacAlgorithm.HS256)
                .build();
        // 만료(exp) + 발급자(iss) 검증
        decoder.setJwtValidator(JwtValidators.createDefaultWithIssuer(properties.issuer()));
        return decoder;
    }

    @Bean
    public JwtTokenService jwtTokenService(JwtEncoder jwtEncoder, JwtProperties properties) {
        return new JwtTokenService(jwtEncoder, properties);
    }
}
