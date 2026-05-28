package com.smartaccounting.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartaccounting.dto.CreateHrEmployeeRequest;
import com.smartaccounting.dto.CreateLeaveRequest;
import com.smartaccounting.dto.UpdateHrEmployeeRequest;
import com.smartaccounting.tenant.TenantContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.sql.Date;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Service
public class HrService {
    private static final Logger log = LoggerFactory.getLogger(HrService.class);
    private static final int MAX_PROFILE_BYTES = 32_768;
    private static final java.util.regex.Pattern PERIOD_PATTERN = java.util.regex.Pattern.compile("^\\d{4}-(0[1-9]|1[0-2])$");
    private static final java.util.Set<String> EMPLOYEE_STATUSES = java.util.Set.of("ACTIVE", "INACTIVE", "TERMINATED");

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    public HrService(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public UUID createEmployee(CreateHrEmployeeRequest request) {
        UUID tenant = requireTenant();
        String fullName = requireText(request.fullName(), "Employee name");
        String department = requireText(request.department(), "Department");
        String title = requireText(request.title(), "Job title");
        UUID id = UUID.randomUUID();
        jdbcTemplate.update(
            """
            insert into hr_employee_profiles
            (id, tenant_id, full_name, department, title, status, created_at, updated_at, profile_json)
            values (?, ?, ?, ?, ?, 'ACTIVE', now(), now(), '{}'::jsonb)
            """,
            id, tenant, fullName, department, title
        );
        return id;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> employees(int page, int size, String q, String department, String status) {
        UUID tenant = requireTenant();
        int safePage = Math.max(0, page);
        int safeSize = Math.min(Math.max(1, size), 200);
        StringBuilder sql = new StringBuilder("""
            select id, full_name, department, title, status, phone, email, hire_date, base_salary,
                   created_at, profile_json::text as profile_json
            from hr_employee_profiles
            where tenant_id = ?
            """);
        List<Object> args = new ArrayList<>();
        args.add(tenant);
        if (q != null && !q.isBlank()) {
            sql.append(" and lower(full_name) like lower(?)");
            args.add("%" + q.trim() + "%");
        }
        if (department != null && !department.isBlank()) {
            sql.append(" and lower(department) = lower(?)");
            args.add(department.trim());
        }
        if (status != null && !status.isBlank()) {
            sql.append(" and upper(status) = upper(?)");
            args.add(status.trim());
        }
        sql.append(" order by full_name asc offset ? limit ?");
        args.add(safePage * safeSize);
        args.add(safeSize);
        return jdbcTemplate.query(sql.toString(), (rs, row) -> mapEmployeeRow(rs, false), args.toArray());
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getEmployee(UUID id) {
        UUID tenant = requireTenant();
        List<Map<String, Object>> rows = jdbcTemplate.query(
            """
            select id, full_name, department, title, status, phone, email, hire_date, base_salary,
                   created_at, profile_json::text as profile_json
            from hr_employee_profiles
            where tenant_id = ? and id = ?
            """,
            (rs, row) -> mapEmployeeRow(rs, true),
            tenant, id
        );
        if (rows.isEmpty()) {
            throw new IllegalArgumentException("Employee not found");
        }
        return rows.get(0);
    }

    @Transactional
    public Map<String, Object> updateEmployee(UUID id, UpdateHrEmployeeRequest request) {
        Map<String, Object> existing = getEmployee(id);
        UUID tenant = requireTenant();
        String fullName = request.fullName() != null ? requireText(request.fullName(), "Employee name") : String.valueOf(existing.get("fullName"));
        String department = request.department() != null ? requireText(request.department(), "Department") : String.valueOf(existing.get("department"));
        String title = request.title() != null ? requireText(request.title(), "Job title") : String.valueOf(existing.get("title"));
        String status = request.status() != null ? normalizeEmployeeStatus(request.status()) : String.valueOf(existing.get("status"));
        String phone = request.phone() != null ? trimToNull(request.phone()) : (String) existing.get("phone");
        String email = request.email() != null ? trimToNull(request.email()) : (String) existing.get("email");
        LocalDate hireDate = request.hireDate() != null
            ? request.hireDate()
            : parseLocalDate(existing.get("hireDate"));
        @SuppressWarnings("unchecked")
        Map<String, Object> profile = new LinkedHashMap<>((Map<String, Object>) existing.getOrDefault("profile", Map.of()));
        if (request.profile() != null) {
            profile.putAll(request.profile());
        }
        String profileJson = writeProfile(profile);
        if (profileJson.length() > MAX_PROFILE_BYTES) {
            throw new IllegalArgumentException("Employee profile exceeds maximum allowed size");
        }
        BigDecimal salary = profile.containsKey("salary")
            ? parseNonNegativeAmount(profile.get("salary"), "Salary")
            : toBigDecimal(existing.get("baseSalary"));
        jdbcTemplate.update(
            """
            update hr_employee_profiles
            set full_name = ?, department = ?, title = ?, status = ?, phone = ?, email = ?,
                hire_date = ?, base_salary = ?, profile_json = ?::jsonb, updated_at = now()
            where tenant_id = ? and id = ?
            """,
            fullName, department, title, status, phone, email,
            hireDate != null ? Date.valueOf(hireDate) : null,
            salary,
            profileJson,
            tenant, id
        );
        return getEmployee(id);
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
        requireActiveEmployee(request.employeeId());
        validateLeaveDates(request.startDate(), request.endDate());
        assertNoLeaveOverlap(tenant, request.employeeId(), request.startDate(), request.endDate());
        UUID id = UUID.randomUUID();
        jdbcTemplate.update(
            """
            insert into hr_leave_requests
            (id, tenant_id, employee_id, leave_type, start_date, end_date, status, reason, created_at)
            values (?, ?, ?, ?, ?, ?, 'PENDING', ?, now())
            """,
            id, tenant, request.employeeId(), request.leaveType().trim().toUpperCase(),
            Date.valueOf(request.startDate()), Date.valueOf(request.endDate()), trimToNull(request.reason())
        );
        return id;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> leaveRequests(int page, int size, UUID employeeId, String leaveType, String status) {
        UUID tenant = requireTenant();
        int safePage = Math.max(0, page);
        int safeSize = Math.min(Math.max(1, size), 200);
        StringBuilder sql = new StringBuilder("""
            select l.id, l.employee_id, e.full_name as employee_name, l.leave_type, l.start_date,
                   l.end_date, l.status, l.reason, l.created_at
            from hr_leave_requests l
            join hr_employee_profiles e on e.id = l.employee_id and e.tenant_id = l.tenant_id
            where l.tenant_id = ?
            """);
        List<Object> args = new ArrayList<>();
        args.add(tenant);
        if (employeeId != null) {
            sql.append(" and l.employee_id = ?");
            args.add(employeeId);
        }
        if (leaveType != null && !leaveType.isBlank()) {
            sql.append(" and upper(l.leave_type) = upper(?)");
            args.add(leaveType.trim());
        }
        if (status != null && !status.isBlank()) {
            sql.append(" and upper(l.status) = upper(?)");
            args.add(status.trim());
        }
        sql.append(" order by l.created_at desc offset ? limit ?");
        args.add(safePage * safeSize);
        args.add(safeSize);
        return jdbcTemplate.query(sql.toString(), (rs, row) -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", UUID.fromString(rs.getString("id")));
            m.put("employeeId", UUID.fromString(rs.getString("employee_id")));
            m.put("employeeName", rs.getString("employee_name"));
            m.put("leaveType", rs.getString("leave_type"));
            m.put("startDate", String.valueOf(rs.getDate("start_date").toLocalDate()));
            m.put("endDate", String.valueOf(rs.getDate("end_date").toLocalDate()));
            m.put("status", rs.getString("status"));
            m.put("reason", rs.getString("reason"));
            m.put("days", leaveDays(rs.getDate("start_date").toLocalDate(), rs.getDate("end_date").toLocalDate()));
            m.put("createdAt", timestampToString(rs.getTimestamp("created_at")));
            return m;
        }, args.toArray());
    }

    @Transactional
    public Map<String, Object> approveLeave(UUID leaveId) {
        return updateLeaveStatus(leaveId, "APPROVED");
    }

    @Transactional
    public Map<String, Object> rejectLeave(UUID leaveId) {
        return updateLeaveStatus(leaveId, "REJECTED");
    }

    @Transactional(readOnly = true)
    public Map<String, Object> employeeAttendanceSummary(UUID employeeId, String period) {
        UUID tenant = requireTenant();
        requireEmployee(employeeId);
        YearMonth ym = parsePeriod(period);
        LocalDate start = ym.atDay(1);
        LocalDate end = ym.atEndOfMonth();
        Map<String, Object> stats = jdbcTemplate.queryForMap(
            """
            select
              count(*) filter (where upper(status) = 'PRESENT') as present_days,
              count(*) filter (where upper(status) = 'ABSENT') as absent_days,
              count(*) filter (where coalesce(minutes_late, 0) > 0) as late_days,
              coalesce(sum(coalesce(overtime_minutes, 0)), 0) as overtime_minutes
            from attendance_records
            where tenant_id = ? and employee_id = ? and attendance_date between ? and ?
            """,
            tenant, employeeId, Date.valueOf(start), Date.valueOf(end)
        );
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("period", period);
        out.put("presentDays", toLong(stats.get("present_days")));
        out.put("absentDays", toLong(stats.get("absent_days")));
        out.put("lateArrivals", toLong(stats.get("late_days")));
        out.put("overtimeHours", toLong(stats.get("overtime_minutes")) / 60.0);
        return out;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> employeePayslips(UUID employeeId, int limit) {
        UUID tenant = requireTenant();
        requireEmployee(employeeId);
        int safeLimit = Math.min(Math.max(limit, 1), 12);
        return jdbcTemplate.query(
            """
            select pl.id, pl.payroll_run_id, pr.period, pr.status, pl.net_pay, pl.gross_salary, pl.created_at
            from payroll_lines pl
            join payroll_runs pr on pr.id = pl.payroll_run_id and pr.tenant_id = pl.tenant_id
            where pl.tenant_id = ? and pl.employee_id = ?
            order by pr.period desc
            limit ?
            """,
            (rs, row) -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("lineId", UUID.fromString(rs.getString("id")));
                m.put("payrollRunId", UUID.fromString(rs.getString("payroll_run_id")));
                m.put("period", rs.getString("period"));
                m.put("status", rs.getString("status"));
                m.put("netPay", rs.getBigDecimal("net_pay"));
                m.put("grossSalary", rs.getBigDecimal("gross_salary"));
                m.put("createdAt", timestampToString(rs.getTimestamp("created_at")));
                return m;
            },
            tenant, employeeId, safeLimit
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
        int dayOfMonth = LocalDate.now().getDayOfMonth();
        return Math.max(0, 25 - dayOfMonth);
    }

    @Transactional(readOnly = true)
    public long countActiveByTenantId(UUID tenantId) {
        return getHeadcount(tenantId);
    }

    private Map<String, Object> updateLeaveStatus(UUID leaveId, String status) {
        UUID tenant = requireTenant();
        UUID reviewer = TenantContext.userId();
        int updated = jdbcTemplate.update(
            """
            update hr_leave_requests
            set status = ?, reviewed_at = now(), reviewed_by = ?
            where tenant_id = ? and id = ? and status = 'PENDING'
            """,
            status, reviewer, tenant, leaveId
        );
        if (updated == 0) {
            throw new IllegalArgumentException("Leave request not found or not pending");
        }
        return getLeaveRequest(leaveId);
    }

    private void assertNoLeaveOverlap(UUID tenant, UUID employeeId, LocalDate start, LocalDate end) {
        Integer overlaps = jdbcTemplate.queryForObject(
            """
            select count(*) from hr_leave_requests
            where tenant_id = ? and employee_id = ?
              and upper(status) in ('PENDING', 'APPROVED')
              and start_date <= ? and end_date >= ?
            """,
            Integer.class,
            tenant, employeeId, Date.valueOf(end), Date.valueOf(start)
        );
        if (overlaps != null && overlaps > 0) {
            throw new IllegalArgumentException("Employee already has leave scheduled for overlapping dates");
        }
    }

    private Map<String, Object> getLeaveRequest(UUID leaveId) {
        UUID tenant = requireTenant();
        List<Map<String, Object>> rows = jdbcTemplate.query(
            """
            select l.id, l.employee_id, e.full_name as employee_name, l.leave_type, l.start_date,
                   l.end_date, l.status, l.reason, l.created_at
            from hr_leave_requests l
            join hr_employee_profiles e on e.id = l.employee_id and e.tenant_id = l.tenant_id
            where l.tenant_id = ? and l.id = ?
            """,
            (rs, row) -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", UUID.fromString(rs.getString("id")));
                m.put("employeeId", UUID.fromString(rs.getString("employee_id")));
                m.put("employeeName", rs.getString("employee_name"));
                m.put("leaveType", rs.getString("leave_type"));
                m.put("startDate", String.valueOf(rs.getDate("start_date").toLocalDate()));
                m.put("endDate", String.valueOf(rs.getDate("end_date").toLocalDate()));
                m.put("status", rs.getString("status"));
                m.put("reason", rs.getString("reason"));
                m.put("days", leaveDays(rs.getDate("start_date").toLocalDate(), rs.getDate("end_date").toLocalDate()));
                m.put("createdAt", timestampToString(rs.getTimestamp("created_at")));
                return m;
            },
            tenant, leaveId
        );
        if (rows.isEmpty()) {
            throw new IllegalArgumentException("Leave request not found");
        }
        return rows.get(0);
    }

    private void requireActiveEmployee(UUID employeeId) {
        Integer count = jdbcTemplate.queryForObject(
            """
            select count(*) from hr_employee_profiles
            where tenant_id = ? and id = ? and upper(status) = 'ACTIVE'
            """,
            Integer.class,
            requireTenant(), employeeId
        );
        if (count == null || count == 0) {
            throw new IllegalArgumentException("Active employee not found");
        }
    }

    private static void validateLeaveDates(LocalDate start, LocalDate end) {
        if (end.isBefore(start)) {
            throw new IllegalArgumentException("Leave end date must be on or after start date");
        }
        long days = ChronoUnit.DAYS.between(start, end) + 1;
        if (days > 366) {
            throw new IllegalArgumentException("Leave request exceeds maximum duration");
        }
    }

    private static YearMonth parsePeriod(String period) {
        if (period == null || !PERIOD_PATTERN.matcher(period).matches()) {
            throw new IllegalArgumentException("Period must use YYYY-MM format");
        }
        return YearMonth.parse(period);
    }

    private static String normalizeEmployeeStatus(String status) {
        String normalized = status.trim().toUpperCase(Locale.ROOT);
        if (!EMPLOYEE_STATUSES.contains(normalized)) {
            throw new IllegalArgumentException("Invalid employee status");
        }
        return normalized;
    }

    private static String requireText(String value, String field) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(field + " is required");
        }
        return value.trim();
    }

    private static String trimToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private static BigDecimal parseNonNegativeAmount(Object value, String field) {
        BigDecimal amount = toBigDecimal(value);
        if (amount.signum() < 0) {
            throw new IllegalArgumentException(field + " cannot be negative");
        }
        return amount;
    }

    private void requireEmployee(UUID employeeId) {
        Integer n = jdbcTemplate.queryForObject(
            "select count(*) from hr_employee_profiles where tenant_id = ? and id = ?",
            Integer.class,
            requireTenant(), employeeId
        );
        if (n == null || n == 0) {
            throw new IllegalArgumentException("Employee not found");
        }
    }

    private Map<String, Object> mapEmployeeRow(ResultSet rs, boolean includeProfile) throws SQLException {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", UUID.fromString(rs.getString("id")));
        m.put("fullName", rs.getString("full_name"));
        m.put("department", rs.getString("department"));
        m.put("title", rs.getString("title"));
        m.put("status", rs.getString("status"));
        m.put("phone", rs.getString("phone"));
        m.put("email", rs.getString("email"));
        Date hireDate = rs.getDate("hire_date");
        m.put("hireDate", hireDate != null ? hireDate.toLocalDate().toString() : null);
        m.put("baseSalary", rs.getBigDecimal("base_salary"));
        m.put("createdAt", timestampToString(rs.getTimestamp("created_at")));
        if (includeProfile) {
            m.put("profile", readProfile(rs.getString("profile_json")));
        }
        return m;
    }

    private Map<String, Object> readProfile(String json) {
        if (json == null || json.isBlank()) {
            return new LinkedHashMap<>();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<Map<String, Object>>() {});
        } catch (Exception ex) {
            log.warn("Failed to parse employee profile JSON", ex);
            return new LinkedHashMap<>();
        }
    }

    private String writeProfile(Map<String, Object> profile) {
        try {
            return objectMapper.writeValueAsString(profile != null ? profile : Map.of());
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to serialize employee profile", ex);
        }
    }

    private static long leaveDays(LocalDate start, LocalDate end) {
        return ChronoUnit.DAYS.between(start, end) + 1;
    }

    private static String timestampToString(Timestamp ts) {
        return ts == null ? null : String.valueOf(ts.toInstant());
    }

    private static LocalDate parseLocalDate(Object value) {
        if (value == null) {
            return null;
        }
        return LocalDate.parse(String.valueOf(value));
    }

    private static BigDecimal toBigDecimal(Object value) {
        if (value == null) {
            return BigDecimal.ZERO;
        }
        if (value instanceof BigDecimal bd) {
            return bd;
        }
        return new BigDecimal(String.valueOf(value));
    }

    private static long toLong(Object value) {
        if (value == null) {
            return 0L;
        }
        if (value instanceof Number n) {
            return n.longValue();
        }
        return Long.parseLong(String.valueOf(value));
    }

    private UUID requireTenant() {
        if (TenantContext.tenantId() == null) {
            throw new IllegalStateException("Tenant context is required");
        }
        return TenantContext.tenantId();
    }
}
