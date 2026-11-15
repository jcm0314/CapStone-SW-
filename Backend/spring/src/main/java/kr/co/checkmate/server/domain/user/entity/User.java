package kr.co.checkmate.server.domain.user.entity;

import jakarta.persistence.*;
import kr.co.checkmate.server.common.domain.BaseTimeEntity;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.UUID;

/**
 * 기업 테넌트 소속 로그인 사용자.
 * 이메일은 전역 유일(로그인 식별자), 비밀번호는 BCrypt 해시만 저장합니다.
 */
@Entity
@Table(
        name = "users",
        indexes = {
                @Index(name = "idx_users_email", columnList = "email", unique = true),
                @Index(name = "idx_users_tenant_id", columnList = "tenant_id")
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class User extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "email", nullable = false, unique = true, length = 150)
    private String email;

    @Column(name = "password_hash", nullable = false, length = 100)
    private String passwordHash;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 20)
    private UserRole role;

    @Column(name = "is_active", nullable = false)
    private boolean active;

    @Builder
    public User(UUID tenantId, String email, String passwordHash, String name, UserRole role, Boolean active) {
        this.tenantId = tenantId;
        this.email = normalizeEmail(email);
        this.passwordHash = passwordHash;
        this.name = name;
        this.role = role;
        this.active = active != null ? active : true;
    }

    public static String normalizeEmail(String email) {
        return email == null ? null : email.trim().toLowerCase();
    }
}
