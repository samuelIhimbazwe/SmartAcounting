package com.smartaccounting.repository;

import com.smartaccounting.dto.CashierPerformanceSummary;
import com.smartaccounting.entity.CashierPerformance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CashierPerformanceRepository extends JpaRepository<CashierPerformance, UUID> {
    Optional<CashierPerformance> findByTenantIdAndCashierIdAndShiftDateAndTillCode(
        UUID tenantId, String cashierId, LocalDate shiftDate, String tillCode);

    @Query("""
        select new com.smartaccounting.dto.CashierPerformanceSummary(
            cp.cashierId, cp.cashierName,
            sum(cp.transactionCount), sum(cp.totalSales),
            sum(cp.totalRefunds), sum(cp.refundAmount))
        from CashierPerformance cp
        where cp.tenantId = :tenantId
          and cp.shiftDate between :from and :to
        group by cp.cashierId, cp.cashierName
        order by sum(cp.totalSales) desc
        """)
    List<CashierPerformanceSummary> findSummaryByTenantIdAndDateBetween(
        @Param("tenantId") UUID tenantId,
        @Param("from") LocalDate from,
        @Param("to") LocalDate to);
}
