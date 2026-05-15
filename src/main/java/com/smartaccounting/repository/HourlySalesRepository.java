package com.smartaccounting.repository;

import com.smartaccounting.entity.HourlySales;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface HourlySalesRepository extends JpaRepository<HourlySales, UUID> {
    Optional<HourlySales> findByTenantIdAndSaleDateAndHourOfDay(UUID tenantId, LocalDate saleDate, int hourOfDay);
    List<HourlySales> findByTenantIdAndSaleDateOrderByHourOfDayAsc(UUID tenantId, LocalDate saleDate);
}
