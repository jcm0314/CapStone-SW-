package kr.co.checkmate.server.security;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtConfigTest {

    private final JwtConfig jwtConfig = new JwtConfig();

    private static MockEnvironment env(String... profiles) {
        MockEnvironment environment = new MockEnvironment();
        environment.setActiveProfiles(profiles);
        return environment;
    }

    @Test
    @DisplayName("JWT_SECRET 이 비어 있으면 기동을 거부한다")
    void blankSecret_failsFast() {
        assertThatThrownBy(() -> jwtConfig.jwtSecretKey(new JwtProperties("", null, null), env("prod")))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("JWT_SECRET");
        assertThatThrownBy(() -> jwtConfig.jwtSecretKey(new JwtProperties(null, null, null), env("prod")))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    @DisplayName("32바이트 미만 키는 거부한다")
    void shortSecret_failsFast() {
        assertThatThrownBy(() -> jwtConfig.jwtSecretKey(new JwtProperties("too-short", null, null), env("prod")))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("32");
    }

    @Test
    @DisplayName("prod 프로필에서 개발용 기본 키를 쓰면 거부하고, local 에서는 허용한다")
    void localDevSecret_onlyAllowedOutsideProd() {
        String devSecret = JwtConfig.LOCAL_DEV_SECRET_PREFIX + "insecure-jwt-secret-change-me-0123456789";

        assertThatThrownBy(() -> jwtConfig.jwtSecretKey(new JwtProperties(devSecret, null, null), env("prod")))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("prod");
        assertThat(jwtConfig.jwtSecretKey(new JwtProperties(devSecret, null, null), env("local"))).isNotNull();
    }

    @Test
    @DisplayName("충분히 긴 운영 키는 prod 에서 정상 생성된다")
    void strongSecret_ok() {
        String secret = "a-very-long-random-production-secret-value-0123456789";
        assertThat(jwtConfig.jwtSecretKey(new JwtProperties(secret, null, null), env("prod")).getAlgorithm())
                .isEqualTo("HmacSHA256");
    }
}
