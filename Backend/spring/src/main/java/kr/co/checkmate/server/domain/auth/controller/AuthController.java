package kr.co.checkmate.server.domain.auth.controller;

import jakarta.validation.Valid;
import kr.co.checkmate.server.common.exception.UnauthorizedException;
import kr.co.checkmate.server.common.response.ApiResponse;
import kr.co.checkmate.server.domain.auth.dto.AuthUserResponse;
import kr.co.checkmate.server.domain.auth.dto.LoginRequest;
import kr.co.checkmate.server.domain.auth.dto.LoginResponse;
import kr.co.checkmate.server.domain.auth.service.AuthService;
import kr.co.checkmate.server.security.JwtTokenService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<LoginResponse>> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(ApiResponse.success(authService.login(request)));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<AuthUserResponse>> me(@AuthenticationPrincipal Jwt jwt) {
        try {
            UUID tenantId = UUID.fromString(jwt.getClaimAsString(JwtTokenService.CLAIM_TENANT_ID));
            UUID userId = UUID.fromString(jwt.getSubject());
            return ResponseEntity.ok(ApiResponse.success(authService.me(tenantId, userId)));
        } catch (IllegalArgumentException | NullPointerException e) {
            throw new UnauthorizedException("유효하지 않은 토큰입니다.");
        }
    }
}
