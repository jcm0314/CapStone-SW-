package kr.co.checkmate.server.domain.auth.dto;

import kr.co.checkmate.server.domain.user.entity.User;
import kr.co.checkmate.server.domain.user.entity.UserRole;
import lombok.Builder;
import lombok.Getter;

import java.util.UUID;

/** 명세 #21 의 user 객체: { id, name, email, role, tenantId, tenantName } */
@Getter
@Builder
public class AuthUserResponse {

    private final UUID id;
    private final String name;
    private final String email;
    private final UserRole role;
    private final UUID tenantId;
    private final String tenantName;

    public static AuthUserResponse of(User user, String tenantName) {
        return AuthUserResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole())
                .tenantId(user.getTenantId())
                .tenantName(tenantName)
                .build();
    }
}
