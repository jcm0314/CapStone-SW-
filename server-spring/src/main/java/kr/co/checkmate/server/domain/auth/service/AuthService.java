package kr.co.checkmate.server.domain.auth.service;

import kr.co.checkmate.server.common.exception.UnauthorizedException;
import kr.co.checkmate.server.domain.auth.dto.AuthUserResponse;
import kr.co.checkmate.server.domain.auth.dto.LoginRequest;
import kr.co.checkmate.server.domain.auth.dto.LoginResponse;
import kr.co.checkmate.server.domain.tenant.entity.CompanyTenant;
import kr.co.checkmate.server.domain.tenant.repository.CompanyTenantRepository;
import kr.co.checkmate.server.domain.user.entity.User;
import kr.co.checkmate.server.domain.user.repository.UserRepository;
import kr.co.checkmate.server.security.JwtTokenService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class AuthService {

    /** 이메일 존재 여부와 무관하게 같은 메시지 (#21) */
    static final String LOGIN_FAILED_MESSAGE = "이메일 또는 비밀번호가 올바르지 않습니다.";

    private final UserRepository userRepository;
    private final CompanyTenantRepository tenantRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenService jwtTokenService;
    /** 없는 이메일일 때도 BCrypt 비교를 1회 수행해 응답 시간으로 계정 존재 여부가 드러나지 않게 함 */
    private final String dummyPasswordHash;

    public AuthService(UserRepository userRepository, CompanyTenantRepository tenantRepository,
                       PasswordEncoder passwordEncoder, JwtTokenService jwtTokenService) {
        this.userRepository = userRepository;
        this.tenantRepository = tenantRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenService = jwtTokenService;
        this.dummyPasswordHash = passwordEncoder.encode("timing-equalizer-" + UUID.randomUUID());
    }

    public LoginResponse login(LoginRequest request) {
        Optional<User> found = userRepository.findByEmail(User.normalizeEmail(request.getEmail()));
        if (found.isEmpty()) {
            passwordEncoder.matches(request.getPassword(), dummyPasswordHash);
            throw new UnauthorizedException(LOGIN_FAILED_MESSAGE);
        }

        User user = found.get();
        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash()) || !user.isActive()) {
            throw new UnauthorizedException(LOGIN_FAILED_MESSAGE);
        }

        CompanyTenant tenant = tenantRepository.findById(user.getTenantId())
                .filter(CompanyTenant::isActive)
                .orElseThrow(() -> new UnauthorizedException(LOGIN_FAILED_MESSAGE));

        return LoginResponse.builder()
                .accessToken(jwtTokenService.issueAccessToken(user))
                .tokenType("Bearer")
                .expiresIn(jwtTokenService.getExpirationSeconds())
                .user(AuthUserResponse.of(user, tenant.getName()))
                .build();
    }

    public AuthUserResponse me(UUID tenantId, UUID userId) {
        User user = userRepository.findByTenantIdAndId(tenantId, userId)
                .filter(User::isActive)
                .orElseThrow(() -> new UnauthorizedException("유효하지 않은 사용자입니다. 다시 로그인하세요."));
        String tenantName = tenantRepository.findById(tenantId)
                .map(CompanyTenant::getName)
                .orElse(null);
        return AuthUserResponse.of(user, tenantName);
    }
}
