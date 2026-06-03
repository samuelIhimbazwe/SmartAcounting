package com.smartaccounting.repository;

import com.smartaccounting.entity.BankStatementLine;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BankStatementLineRepository extends JpaRepository<BankStatementLine, UUID> {
    Optional<BankStatementLine> findByIdAndTenantId(UUID id, UUID tenantId);
    Page<BankStatementLine> findByTenantIdAndBankAccountIdAndStatusIn(
        UUID tenantId, UUID bankAccountId, Collection<String> statuses, Pageable pageable);
    long countByTenantIdAndBankAccountId(UUID tenantId, UUID bankAccountId);
    long countByTenantIdAndBankAccountIdAndStatus(UUID tenantId, UUID bankAccountId, String status);
    long countByTenantIdAndStatus(UUID tenantId, String status);
    List<BankStatementLine> findByImportBatchId(UUID importBatchId);
    List<BankStatementLine> findByTenantIdAndBankAccountIdAndStatusIn(
        UUID tenantId, UUID bankAccountId, Collection<String> statuses);
    boolean existsByTenantIdAndMatchedJournalIdAndStatus(UUID tenantId, UUID matchedJournalId, String status);
}
