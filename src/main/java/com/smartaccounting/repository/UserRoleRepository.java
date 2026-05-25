package com.smartaccounting.repository;

import com.smartaccounting.entity.UserRole;
import com.smartaccounting.entity.UserRoleId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface UserRoleRepository extends JpaRepository<UserRole, UserRoleId> {
    @Query(value = """
        SELECT DISTINCT p.code
        FROM user_roles ur
        INNER JOIN role_permissions rp ON rp.role_id = ur.role_id
        INNER JOIN permissions p ON p.id = rp.permission_id
        WHERE ur.user_id = :userId
        """, nativeQuery = true)
    List<String> findPermissionCodesByUserId(@Param("userId") UUID userId);
    List<UserRole> findAllById_UserId(UUID userId);

    List<UserRole> findAllById_RoleId(UUID roleId);

    boolean existsById_UserIdAndId_RoleId(UUID userId, UUID roleId);

    void deleteById_UserIdAndId_RoleId(UUID userId, UUID roleId);

    long countById_RoleId(UUID roleId);

    @Query(value = """
        SELECT ur.user_id
        FROM user_roles ur
        INNER JOIN roles r ON r.id = ur.role_id
        WHERE r.tenant_id = :tenantId AND r.name = :roleName
        """, nativeQuery = true)
    List<UUID> findUserIdsByTenantIdAndRoleName(
        @Param("tenantId") UUID tenantId,
        @Param("roleName") String roleName
    );

    boolean existsById_UserId(UUID userId);
}
