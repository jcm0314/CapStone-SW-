package kr.co.checkmate.server.security;

import kr.co.checkmate.server.domain.user.entity.User;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;

import java.time.Instant;

/**
 * 액세스 토큰 발급기.
 * 클레임: sub(userId), tenantId, role — 테넌트는 오직 이 토큰 안의 값만 신뢰합니다 (#21).
 */
public class JwtTokenService {

    public static final String CLAIM_TENANT_ID = "tenantId";
    public static final String CLAIM_ROLE = "role";

    private final JwtEncoder jwtEncoder;
    private final JwtProperties properties;

    public JwtTokenService(JwtEncoder jwtEncoder, JwtProperties properties) {
        this.jwtEncoder = jwtEncoder;
        this.properties = properties;
    }

    public String issueAccessToken(User user) {
        Instant now = Instant.now();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(properties.issuer())
                .subject(user.getId().toString())
                .issuedAt(now)
                .expiresAt(now.plusSeconds(properties.expirationSeconds()))
                .claim(CLAIM_TENANT_ID, user.getTenantId().toString())
                .claim(CLAIM_ROLE, user.getRole().name())
                .build();
        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
        return jwtEncoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
    }

    public long getExpirationSeconds() {
        return properties.expirationSeconds();
    }
}
