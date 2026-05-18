package com.smartaccounting.repository;

import com.smartaccounting.entity.DevicePushToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DevicePushTokenRepository extends JpaRepository<DevicePushToken, UUID> {

    List<DevicePushToken> findByTenantIdAndUserIdAndIsActive(
        UUID tenantId, UUID userId, boolean isActive);

    Optional<DevicePushToken> findByTenantIdAndUserIdAndPlatform(
        UUID tenantId, UUID userId, String platform);

    @Query(value = """
        SELECT t.* FROM device_push_tokens t
        INNER JOIN users u ON t.user_id = u.id AND t.tenant_id = u.tenant_id
        WHERE t.tenant_id = :tenantId AND upper(u.role) = upper(:dbRole) AND t.is_active = true
        """, nativeQuery = true)
    List<DevicePushToken> findActiveByTenantIdAndUserRole(
        @Param("tenantId") UUID tenantId,
        @Param("dbRole") String dbRole);

    @Modifying
    @Transactional
    @Query("update DevicePushToken t set t.isActive = false, t.updatedAt = CURRENT_TIMESTAMP where t.token = :token")
    int deactivateByToken(@Param("token") String token);
}
