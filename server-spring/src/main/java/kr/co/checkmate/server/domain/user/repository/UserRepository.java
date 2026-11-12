package kr.co.checkmate.server.domain.user.repository;

import kr.co.checkmate.server.domain.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByEmail(String email);

    Optional<User> findByTenantIdAndId(UUID tenantId, UUID id);

    boolean existsByEmail(String email);
}
