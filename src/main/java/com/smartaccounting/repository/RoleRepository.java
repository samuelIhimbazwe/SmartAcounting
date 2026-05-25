package com.smartaccounting.repository;

import com.smartaccounting.entity.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RoleRepository extends JpaRepository<Role, UUID> {
    List<Role> findAllByTenantId(UUID tenantId);

    Optional<Role> findByTenantIdAndName(UUID tenantId, String name);

    Optional<Role> findByTenantIdAndIsOwnerTrue(UUID tenantId);

    Optional<Role> findByIdAndTenantId(UUID id, UUID tenantId);

    long countByTenantId(UUID tenantId);

    List<Role> findByTenantIdAndIsSystemTrue(UUID tenantId);

    @Query("""
        SELECT r FROM Role r
        WHERE r.tenantId = :tenantId AND r.isSystem = true
        AND r.id NOT IN (SELECT ur.id.roleId FROM UserRole ur)
        """)
    List<Role> findSystemRolesWithNoUsers(@Param("tenantId") UUID tenantId);
}
