package com.smartaccounting.service;

import com.smartaccounting.dto.CreateHrEmployeeRequest;
import com.smartaccounting.dto.CreateLeaveRequest;
import com.smartaccounting.tenant.TenantContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class HrService {
    private static final Logger log = LoggerFactory.getLogger(HrService.class);

    private final JdbcTemplate jdbcTemplate;

    public HrService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional
    public UUID createEmployee(CreateHrEmployeeRequest request) {
        UUID tenant = requireTenant();
        UUID id = UUID.randomUUID();
        jdbcTemplate.update(
            "insert into hr_employee_profiles (id, tenant_id, full_name, department, title, status, created_at) values (?, ?, ?, ?, ?, 'ACTIVE', now())",
            id, tenant, request.fullName(), request.department(), request.title()
        );
        return id;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> employees(int page, int size) {
        UUID tenant = requireTenant();
        int safePage = Math.max(0, page);
        int safeSize = Math.min(Math.max(1, size), 200);
        return jdbcTemplate.query(
            """
            select id, full_name, department, title, status, created_at
            from hr_employee_profiles
            where tenant_id = ?
            order by created_at desc
            offset ? limit ?
            """,
            (rs, row) -> Map.<String, Object>of(
                "id", UUID.fromString(rs.getString("id")),
                "fullName", rs.getString("full_name"),
                "department", rs.getString("department"),
                "title", rs.getString("title"),
                "status", rs.getString("status"),
                "createdAt", String.valueOf(rs.getTimestamp("created_at").toInstant())
            ),
            tenant, safePage * safeSize, safeSize
        );
    }

    @Transactional(readOnly = true)
    public Map<String, Object> headcount() {
        UUID tenant = requireTenant();
        Integer active = jdbcTemplate.queryForObject(
            "select count(*) from hr_employee_profiles where tenant_id = ? and status = 'ACTIVE'",
            Integer.class,
            tenant
        );
        Integer pendingLeaves = jdbcTemplate.queryForObject(
            "select count(*) from hr_leave_requests where tenant_id = ? and status = 'PENDING'",
            Integer.class,
            tenant
        );
        return Map.of(
            "activeHeadcount", active == null ? 0 : active,
            "pendingLeaveRequests", pendingLeaves == null ? 0 : pendingLeaves
        );
    }

    @Transactional
    public UUID createLeave(CreateLeaveRequest request) {
        UUID tenant = requireTenant();
        UUID id = UUID.randomUUID();
        jdbcTemplate.update(
            """
            insert into hr_leave_requests (id, tenant_id, employee_id, leave_type, start_date, end_date, status, created_at)
            values (?, ?, ?, ?, ?, ?, 'PENDING', now())
            """,
            id, tenant, request.employeeId(), request.leaveType(), request.startDate(), request.endDate()
        );
        return id;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> leaveRequests(int page, int size) {
        UUID tenant = requireTenant();
        int safePage = Math.max(0, page);
        int safeSize = Math.min(Math.max(1, size), 200);
        return jdbcTemplate.query(
            """
            select id, employee_id, leave_type, start_date, end_date, status, created_at
            from hr_leave_requests
            where tenant_id = ?
            order by created_at desc
            offset ? limit ?
            """,
            (rs, row) -> Map.<String, Object>of(
                "id", UUID.fromString(rs.getString("id")),
                "employeeId", UUID.fromString(rs.getString("employee_id")),
                "leaveType", rs.getString("leave_type"),
                "startDate", String.valueOf(rs.getDate("start_date").toLocalDate()),
                "endDate", String.valueOf(rs.getDate("end_date").toLocalDate()),
                "status", rs.getString("status"),
                "createdAt", String.valueOf(rs.getTimestamp("created_at").toInstant())
            ),
            tenant, safePage * safeSize, safeSize
        );
    }

    @Transactional(readOnly = true)
    public long getHeadcount(UUID tenantId) {
        if (tenantId == null) {
            return 0L;
        }
        try {
            Integer active = jdbcTemplate.queryForObject(
                "select count(*) from hr_employee_profiles where tenant_id = ? and upper(status) = 'ACTIVE'",
                Integer.class,
                tenantId
            );
            if (active != null && active > 0) {
                return active.longValue();
            }
            Integer total = jdbcTemplate.queryForObject(
                "select count(*) from hr_employee_profiles where tenant_id = ?",
                Integer.class,
                tenantId
            );
            return total == null ? 0L : total.longValue();
        } catch (Exception ex) {
            return 0L;
        }
    }

    @Transactional(readOnly = true)
    public long getOpenLeaveCount(UUID tenantId) {
        if (tenantId == null) {
            return 0L;
        }
        try {
            Integer n = jdbcTemplate.queryForObject(
                "select count(*) from hr_leave_requests where tenant_id = ? and upper(status) = 'PENDING'",
                Integer.class,
                tenantId
            );
            return n == null ? 0L : n.longValue();
        } catch (Exception ex) {
            return 0L;
        }
    }

    /**
     * Days until next payroll run — not yet derived from payroll calendar.
     */
    public int getPayrollDueInDays(UUID tenantId) {
        if (tenantId == null) {
            return 99;
        }
        try {
            Integer d = jdbcTemplate.query(
                """
                select (payload::jsonb->>'payrollDueDays')::int from hr_workforce_snapshot
                where tenant_id = ?::uuid and snapshot_date = current_date
                """,
                rs -> rs.next() ? (Integer) rs.getObject(1) : null,
                tenantId.toString());
            if (d != null) {
                return d;
            }
        } catch (Exception ignored) {
        }
        int dayOfMonth = java.time.LocalDate.now().getDayOfMonth();
        return Math.max(0, 25 - dayOfMonth);
    }

    @Transactional(readOnly = true)
    public long countActiveByTenantId(UUID tenantId) {
        return getHeadcount(tenantId);
    }

    private UUID requireTenant() {
        if (TenantContext.tenantId() == null) throw new IllegalStateException("Tenant context is required");
        return TenantContext.tenantId();
    }
}
