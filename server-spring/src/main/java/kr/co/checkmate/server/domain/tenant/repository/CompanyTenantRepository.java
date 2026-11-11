package kr.co.checkmate.server.domain.tenant.repository;

import kr.co.checkmate.server.domain.tenant.entity.CompanyTenant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface CompanyTenantRepository extends JpaRepository<CompanyTenant, UUID> {
    Optional<CompanyTenant> findBySlug(String slug);
    boolean existsBySlug(String slug);
}

