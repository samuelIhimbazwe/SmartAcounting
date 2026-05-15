package com.smartaccounting.repository;

import com.smartaccounting.entity.BankAccount;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BankAccountRepository extends JpaRepository<BankAccount, UUID> {
    List<BankAccount> findByTenantIdAndDeletedAtIsNullOrderByAccountNameAsc(UUID tenantId);
    Optional<BankAccount> findByIdAndTenantIdAndDeletedAtIsNull(UUID id, UUID tenantId);
}
