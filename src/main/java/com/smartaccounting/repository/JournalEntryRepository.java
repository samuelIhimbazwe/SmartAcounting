package com.smartaccounting.repository;

import com.smartaccounting.entity.JournalEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface JournalEntryRepository extends JpaRepository<JournalEntry, UUID> {
    Optional<JournalEntry> findByIdAndDeletedAtIsNull(UUID id);

    @Query("""
        select j from JournalEntry j
        where j.tenantId = :tenantId and j.deletedAt is null
          and j.amount = :amount
          and j.entryDate between :fromDate and :toDate
          and (:reference is null or :reference = '' or lower(j.description) like lower(concat('%', :reference, '%')))
        order by j.entryDate desc
        """)
    List<JournalEntry> findCandidatesForBankMatch(
        @Param("tenantId") UUID tenantId,
        @Param("reference") String reference,
        @Param("amount") BigDecimal amount,
        @Param("fromDate") LocalDate fromDate,
        @Param("toDate") LocalDate toDate);

    @Query("""
        select j from JournalEntry j
        where j.tenantId = :tenantId and j.deletedAt is null
          and j.amount = :amount
          and j.entryDate between :fromDate and :toDate
        order by j.entryDate desc
        """)
    List<JournalEntry> findByTenantIdAndAmountAndEntryDateBetween(
        @Param("tenantId") UUID tenantId,
        @Param("amount") BigDecimal amount,
        @Param("fromDate") LocalDate fromDate,
        @Param("toDate") LocalDate toDate);
}
