package com.smartaccounting.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class TillService {
    private static final Logger log = LoggerFactory.getLogger(TillService.class);

    private final JdbcTemplate jdbcTemplate;

    public TillService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public long getVarianceCount(UUID tenantId) {
        if (tenantId == null) {
            return 0L;
        }
        try {
            Long n = jdbcTemplate.queryForObject(
                """
                select count(*) from pos_till_closes where tenant_id = ? and business_date = current_date
                and (variance_cash <> 0 or variance_momo <> 0 or variance_airtel <> 0 or variance_card <> 0 or variance_on_account <> 0)
                """,
                Long.class,
                tenantId
            );
            return n == null ? 0L : n;
        } catch (Exception ex) {
            log.debug("getVarianceCount failed for tenant {}: {}", tenantId, ex.getMessage());
            return 0L;
        }
    }
}
