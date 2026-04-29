package com.smartchain.service;

import com.smartchain.dto.CreateAssetRequest;
import com.smartchain.tenant.TenantContext;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class AssetService {
    private final JdbcTemplate jdbcTemplate;

    public AssetService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional
    public UUID create(CreateAssetRequest request) {
        UUID tenant = requireTenant();
        UUID id = UUID.randomUUID();
        jdbcTemplate.update(
            """
            insert into fixed_assets
            (id, tenant_id, asset_name, category, acquisition_cost, acquisition_date, useful_life_months, residual_value, status, created_at)
            values (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', now())
            """,
            id, tenant, request.assetName(), request.category(), request.acquisitionCost(), request.acquisitionDate(),
            request.usefulLifeMonths(), request.residualValue() == null ? BigDecimal.ZERO : request.residualValue()
        );
        return id;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> list(int page, int size) {
        UUID tenant = requireTenant();
        int safePage = Math.max(0, page);
        int safeSize = Math.min(Math.max(1, size), 200);
        return jdbcTemplate.query(
            """
            select id, asset_name, category, acquisition_cost, acquisition_date, useful_life_months, residual_value, status, created_at
            from fixed_assets where tenant_id = ? order by created_at desc offset ? limit ?
            """,
            (rs, row) -> Map.<String, Object>of(
                "id", UUID.fromString(rs.getString("id")),
                "assetName", rs.getString("asset_name"),
                "category", rs.getString("category"),
                "acquisitionCost", rs.getBigDecimal("acquisition_cost"),
                "acquisitionDate", String.valueOf(rs.getDate("acquisition_date").toLocalDate()),
                "usefulLifeMonths", rs.getInt("useful_life_months"),
                "residualValue", rs.getBigDecimal("residual_value"),
                "status", rs.getString("status")
            ),
            tenant, safePage * safeSize, safeSize
        );
    }

    @Transactional(readOnly = true)
    public Map<String, Object> depreciationSchedule(UUID assetId) {
        UUID tenant = requireTenant();
        Map<String, Object> row = jdbcTemplate.queryForMap(
            """
            select acquisition_cost, residual_value, acquisition_date, useful_life_months
            from fixed_assets where tenant_id = ? and id = ?
            """,
            tenant, assetId
        );
        BigDecimal acquisitionCost = (BigDecimal) row.get("acquisition_cost");
        BigDecimal residualValue = (BigDecimal) row.get("residual_value");
        LocalDate acquisitionDate = ((java.sql.Date) row.get("acquisition_date")).toLocalDate();
        int lifeMonths = ((Number) row.get("useful_life_months")).intValue();

        BigDecimal depreciableBase = acquisitionCost.subtract(residualValue);
        BigDecimal monthly = lifeMonths <= 0
            ? BigDecimal.ZERO
            : depreciableBase.divide(BigDecimal.valueOf(lifeMonths), 2, RoundingMode.HALF_UP);
        long elapsedMonths = Math.max(0, ChronoUnit.MONTHS.between(acquisitionDate, LocalDate.now()));
        BigDecimal accumulated = monthly.multiply(BigDecimal.valueOf(Math.min(elapsedMonths, lifeMonths)));
        BigDecimal bookValue = acquisitionCost.subtract(accumulated).max(residualValue);
        return Map.of(
            "assetId", assetId,
            "monthlyDepreciation", monthly,
            "accumulatedDepreciation", accumulated,
            "bookValue", bookValue,
            "remainingMonths", Math.max(0, lifeMonths - (int) elapsedMonths)
        );
    }

    private UUID requireTenant() {
        if (TenantContext.tenantId() == null) throw new IllegalStateException("Tenant context is required");
        return TenantContext.tenantId();
    }
}
