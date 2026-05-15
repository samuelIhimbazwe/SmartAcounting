package com.smartaccounting.service;

import com.smartaccounting.dto.CashierPerformanceSummary;
import com.smartaccounting.dto.LostSalesByProduct;
import com.smartaccounting.dto.LostSalesSummary;
import com.smartaccounting.entity.CashierPerformance;
import com.smartaccounting.entity.HourlySales;
import com.smartaccounting.entity.LostSale;
import com.smartaccounting.repository.CashierPerformanceRepository;
import com.smartaccounting.repository.HourlySalesRepository;
import com.smartaccounting.repository.LostSaleRepository;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class SalesAnalyticsService {
    private final CashierPerformanceRepository cashierPerformanceRepository;
    private final HourlySalesRepository hourlySalesRepository;
    private final LostSaleRepository lostSaleRepository;

    public SalesAnalyticsService(CashierPerformanceRepository cashierPerformanceRepository,
                                 HourlySalesRepository hourlySalesRepository,
                                 LostSaleRepository lostSaleRepository) {
        this.cashierPerformanceRepository = cashierPerformanceRepository;
        this.hourlySalesRepository = hourlySalesRepository;
        this.lostSaleRepository = lostSaleRepository;
    }

    @Async
    @Transactional
    public void recordSale(String tenantId, String cashierId, String cashierName,
                           String tillCode, BigDecimal amount, String currency,
                           LocalDate date, int hour) {
        UUID tid = UUID.fromString(tenantId);
        String safeTill = tillCode != null ? tillCode : "";

        CashierPerformance perf = cashierPerformanceRepository
            .findByTenantIdAndCashierIdAndShiftDateAndTillCode(tid, cashierId, date, safeTill)
            .orElseGet(() -> {
                CashierPerformance row = new CashierPerformance();
                row.setId(UUID.randomUUID());
                row.setTenantId(tid);
                row.setCashierId(cashierId);
                row.setCashierName(cashierName != null ? cashierName : cashierId);
                row.setShiftDate(date);
                row.setTillCode(safeTill);
                row.setTransactionCount(0);
                row.setTotalSales(BigDecimal.ZERO);
                row.setTotalVoids(0);
                row.setTotalRefunds(0);
                row.setVoidAmount(BigDecimal.ZERO);
                row.setRefundAmount(BigDecimal.ZERO);
                row.setCurrencyCode(currency != null ? currency : "RWF");
                row.setCreatedAt(Instant.now());
                return row;
            });

        int count = perf.getTransactionCount() == null ? 0 : perf.getTransactionCount();
        BigDecimal sales = perf.getTotalSales() == null ? BigDecimal.ZERO : perf.getTotalSales();
        perf.setTransactionCount(count + 1);
        perf.setTotalSales(sales.add(amount));
        perf.setAvgTransactionValue(perf.getTotalSales().divide(
            new BigDecimal(perf.getTransactionCount()), 4, RoundingMode.HALF_UP));
        cashierPerformanceRepository.save(perf);

        HourlySales hourly = hourlySalesRepository
            .findByTenantIdAndSaleDateAndHourOfDay(tid, date, hour)
            .orElseGet(() -> {
                HourlySales row = new HourlySales();
                row.setId(UUID.randomUUID());
                row.setTenantId(tid);
                row.setSaleDate(date);
                row.setHourOfDay(hour);
                row.setTransactionCount(0);
                row.setTotalSales(BigDecimal.ZERO);
                row.setCurrencyCode(currency != null ? currency : "RWF");
                row.setCreatedAt(Instant.now());
                return row;
            });
        int hCount = hourly.getTransactionCount() == null ? 0 : hourly.getTransactionCount();
        BigDecimal hSales = hourly.getTotalSales() == null ? BigDecimal.ZERO : hourly.getTotalSales();
        hourly.setTransactionCount(hCount + 1);
        hourly.setTotalSales(hSales.add(amount));
        hourlySalesRepository.save(hourly);
    }

    @Async
    @Transactional
    public void recordLostSale(String tenantId, UUID productId, String sku,
                               String productName, BigDecimal qty, BigDecimal unitPrice,
                               String cashierId, String tillCode) {
        BigDecimal lostRevenue = unitPrice != null
            ? unitPrice.multiply(qty) : BigDecimal.ZERO;
        LostSale lost = new LostSale();
        lost.setId(UUID.randomUUID());
        lost.setTenantId(UUID.fromString(tenantId));
        lost.setProductId(productId);
        lost.setSku(sku);
        lost.setProductName(productName);
        lost.setAttemptedAt(Instant.now());
        lost.setAttemptedQuantity(qty);
        lost.setUnitPrice(unitPrice);
        lost.setEstimatedLostRevenue(lostRevenue);
        lost.setCurrencyCode("RWF");
        lost.setCashierId(cashierId);
        lost.setTillCode(tillCode);
        lost.setCreatedAt(Instant.now());
        lostSaleRepository.save(lost);
    }

    @Async
    @Transactional
    public void recordRefund(String tenantId, String cashierId, String cashierName,
                             String tillCode, BigDecimal amount, LocalDate date) {
        UUID tid = UUID.fromString(tenantId);
        String safeTill = tillCode != null ? tillCode : "";
        cashierPerformanceRepository
            .findByTenantIdAndCashierIdAndShiftDateAndTillCode(tid, cashierId, date, safeTill)
            .ifPresent(perf -> {
                perf.setTotalRefunds((perf.getTotalRefunds() == null ? 0 : perf.getTotalRefunds()) + 1);
                perf.setRefundAmount((perf.getRefundAmount() == null ? BigDecimal.ZERO : perf.getRefundAmount()).add(amount));
                cashierPerformanceRepository.save(perf);
            });
    }

    @Transactional(readOnly = true)
    public List<CashierPerformanceSummary> getCashierPerformance(String tenantId, LocalDate from, LocalDate to) {
        return cashierPerformanceRepository.findSummaryByTenantIdAndDateBetween(
            UUID.fromString(tenantId), from, to);
    }

    @Transactional(readOnly = true)
    public List<HourlySales> getHourlyHeatmap(String tenantId, LocalDate date) {
        return hourlySalesRepository.findByTenantIdAndSaleDateOrderByHourOfDayAsc(
            UUID.fromString(tenantId), date);
    }

    @Transactional(readOnly = true)
    public LostSalesSummary getLostSalesSummary(String tenantId, LocalDate from, LocalDate to) {
        UUID tid = UUID.fromString(tenantId);
        Instant fromInstant = from.atStartOfDay().toInstant(ZoneOffset.UTC);
        Instant toInstant = to.atTime(23, 59, 59).toInstant(ZoneOffset.UTC);
        List<LostSale> losses = lostSaleRepository.findByTenantIdAndAttemptedAtBetween(tid, fromInstant, toInstant);

        BigDecimal totalLostRevenue = losses.stream()
            .map(l -> l.getEstimatedLostRevenue() != null ? l.getEstimatedLostRevenue() : BigDecimal.ZERO)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        Map<String, List<LostSale>> grouped = losses.stream()
            .collect(Collectors.groupingBy(LostSale::getProductName));

        List<LostSalesByProduct> byProduct = grouped.values().stream()
            .map(list -> {
                LostSale first = list.get(0);
                BigDecimal revenue = list.stream()
                    .map(l -> l.getEstimatedLostRevenue() != null ? l.getEstimatedLostRevenue() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
                return new LostSalesByProduct(first.getProductName(), first.getSku(), list.size(), revenue);
            })
            .sorted(Comparator.comparing(LostSalesByProduct::estimatedLostRevenue).reversed())
            .limit(10)
            .toList();

        return new LostSalesSummary(from, to, totalLostRevenue, losses.size(), new ArrayList<>(byProduct));
    }
}
