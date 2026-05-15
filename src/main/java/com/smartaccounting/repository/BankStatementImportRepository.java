package com.smartaccounting.repository;

import com.smartaccounting.entity.BankStatementImport;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface BankStatementImportRepository extends JpaRepository<BankStatementImport, UUID> {
    List<BankStatementImport> findByTenantIdAndBankAccountIdOrderByImportedAtDesc(UUID tenantId, UUID bankAccountId);
}
