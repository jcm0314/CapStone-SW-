package kr.co.checkmate.server.common.tenant;

import java.util.UUID;

/**
 * Multi-Tenant Context Holder (ThreadLocal)
 * 각 HTTP 요청 스레드별로 현재 인증된 기업 테넌트 ID를 격리 보관합니다.
 */
public final class TenantContext {

    private static final ThreadLocal<UUID> CURRENT_TENANT = new ThreadLocal<>();

    private TenantContext() {
    }

    public static void setCurrentTenant(UUID tenantId) {
        CURRENT_TENANT.set(tenantId);
    }

    public static UUID getCurrentTenant() {
        return CURRENT_TENANT.get();
    }

    public static void clear() {
        CURRENT_TENANT.remove();
    }
}

