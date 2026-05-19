package com.smartaccounting.repository;

import com.smartaccounting.entity.UserLocationAccess;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface UserLocationAccessRepository
    extends JpaRepository<UserLocationAccess, UserLocationAccess.Pk> {
    List<UserLocationAccess> findByTenantIdAndUserId(UUID tenantId, UUID userId);
}
