package com.smartaccounting.compliance;

import com.smartaccounting.dto.PayeFilingLogItem;
import com.smartaccounting.entity.PayrollLine;
import com.smartaccounting.entity.PayrollRun;
import com.smartaccounting.entity.PayeFilingLog;
import com.smartaccounting.repository.PayeFilingLogRepository;
import com.smartaccounting.repository.PayrollRunRepository;
import com.smartaccounting.service.PayrollService;
import com.smartaccounting.tenant.TenantContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
public class PayrollFilingService {

    private final PayrollService payrollService;
    private final PayeFilingLogRepository payeFilingLogRepository;
    private final PayrollRunRepository payrollRunRepository;

    public PayrollFilingService(PayrollService payrollService,
                                PayeFilingLogRepository payeFilingLogRepository,
                                PayrollRunRepository payrollRunRepository) {
        this.payrollService = payrollService;
        this.payeFilingLogRepository = payeFilingLogRepository;
        this.payrollRunRepository = payrollRunRepository;
    }

    @Transactional(readOnly = true)
    public List<PayeFilingLogItem> listFilingLogs() {
        UUID tenantId = requireTenant();
        List<PayeFilingLog> logs = payeFilingLogRepository.findByTenantIdOrderByCreatedAtDesc(tenantId);
        List<PayrollRun> runs = payrollRunRepository.findByTenantIdOrderByPeriodDesc(tenantId);
        return logs.stream()
            .map(log -> {
                String period = runs.stream()
                    .filter(r -> r.getId().equals(log.getPayrollRunId()))
                    .map(PayrollRun::getPeriod)
                    .findFirst()
                    .orElse("");
                return new PayeFilingLogItem(
                    log.getId(),
                    log.getPayrollRunId(),
                    period,
                    log.getFileFormat(),
                    log.getStatus(),
                    log.getRowCount(),
                    log.getSubmittedAt(),
                    log.getReferenceNumber(),
                    log.getErrorMessage(),
                    log.getCreatedAt()
                );
            })
            .toList();
    }

    @Transactional
    public byte[] exportPayeCsv(UUID runId) {
        return exportPayeCsv(runId, null);
    }

    @Transactional
    public byte[] exportPayeCsv(UUID runId, String period) {
        UUID resolvedRunId = resolveRunId(runId, period);
        UUID tenantId = requireTenant();
        PayrollRun run = payrollService.getRun(resolvedRunId).run();
        if (!"POSTED".equalsIgnoreCase(run.getStatus()) && !"APPROVED".equalsIgnoreCase(run.getStatus())) {
            throw new IllegalStateException("Payroll run must be approved or posted before PAYE export");
        }
        List<PayrollLine> lines = payrollService.getRunLines(resolvedRunId);
        // RRA e-tax may expect: EmployeeName,TIN,GrossSalary,PAYE,... — confirm in sandbox before go-live.
        StringBuilder csv = new StringBuilder("employee_tin,gross,paye,rssb_employee,rssb_employer,rama,net\n");
        for (PayrollLine line : lines) {
            csv.append(csvField(line.getEmployeeId()))
                .append(',')
                .append(line.getGrossSalary())
                .append(',')
                .append(line.getPaye())
                .append(',')
                .append(line.getRssbEmployee())
                .append(',')
                .append(line.getRssbEmployer())
                .append(',')
                .append(line.getMaternityInsurance())
                .append(',')
                .append(line.getNetPay())
                .append('\n');
        }
        PayeFilingLog log = new PayeFilingLog();
        log.setId(UUID.randomUUID());
        log.setTenantId(tenantId);
        log.setPayrollRunId(resolvedRunId);
        log.setFileFormat("RRA_CSV");
        log.setStatus("GENERATED");
        log.setRowCount(lines.size());
        log.setCreatedAt(Instant.now());
        payeFilingLogRepository.save(log);
        return csv.toString().getBytes(StandardCharsets.UTF_8);
    }

    private static String csvField(Object value) {
        if (value == null) return "";
        String s = value.toString();
        if (s.contains(",") || s.contains("\"")) {
            return "\"" + s.replace("\"", "\"\"") + "\"";
        }
        return s;
    }

    private UUID resolveRunId(UUID runId, String period) {
        if (runId != null) {
            return runId;
        }
        if (period == null || period.isBlank()) {
            throw new IllegalArgumentException("runId or period is required");
        }
        UUID tenantId = requireTenant();
        return payrollRunRepository.findByTenantIdOrderByPeriodDesc(tenantId).stream()
            .filter(r -> period.equals(r.getPeriod()))
            .filter(r -> "POSTED".equalsIgnoreCase(r.getStatus()) || "APPROVED".equalsIgnoreCase(r.getStatus()))
            .max(Comparator.comparing(PayrollRun::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder())))
            .map(PayrollRun::getId)
            .orElseThrow(() -> new IllegalStateException(
                "No approved or posted payroll run for period " + period));
    }

    private UUID requireTenant() {
        if (TenantContext.tenantId() == null) {
            throw new IllegalStateException("Tenant context is required");
        }
        return TenantContext.tenantId();
    }
}
