package com.smartaccounting.repository;

import com.smartaccounting.entity.LedgerAccount;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface LedgerAccountRepository extends JpaRepository<LedgerAccount, UUID> {
    List<LedgerAccount> findByTenantIdAndActiveTrueOrderByAccountCodeAsc(UUID tenantId);

    long countByTenantId(UUID tenantId);

    Optional<LedgerAccount> findByTenantIdAndAccountCodeIgnoreCase(UUID tenantId, String accountCode);
}
