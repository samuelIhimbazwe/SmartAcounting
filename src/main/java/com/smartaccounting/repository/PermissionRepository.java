package com.smartaccounting.repository;

import com.smartaccounting.entity.Permission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PermissionRepository extends JpaRepository<Permission, UUID> {
    Optional<Permission> findByCode(String code);

    Optional<Permission> findByTenantIdAndCode(UUID tenantId, String code);

    boolean existsByCode(String code);

    @Query("""
        SELECT CASE WHEN COUNT(p) > 0 THEN true ELSE false END FROM Permission p
        WHERE UPPER(p.code) = UPPER(:code) AND (p.tenantId IS NULL OR p.tenantId = :tenantId)
        """)
    boolean existsForTenant(@Param("code") String code, @Param("tenantId") UUID tenantId);

    List<Permission> findByCategory(String category);

    List<Permission> findAllByCodeIn(List<String> codes);

    @Query("""
        SELECT p FROM Permission p
        WHERE UPPER(p.code) IN :codes
        AND (p.tenantId IS NULL OR p.tenantId = :tenantId)
        """)
    List<Permission> findAllByCodeInForTenant(@Param("codes") List<String> codes, @Param("tenantId") UUID tenantId);

    List<Permission> findAllByTenantIdOrderByLabelAsc(UUID tenantId);
}
