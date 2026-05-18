package com.smartaccounting.compliance;

import com.smartaccounting.entity.PayrollLine;
import com.smartaccounting.entity.PayrollRun;
import com.smartaccounting.entity.PayeFilingLog;
import com.smartaccounting.repository.PayeFilingLogRepository;
import com.smartaccounting.service.PayrollService;
import com.smartaccounting.tenant.TenantContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class PayrollFilingService {

    private final PayrollService payrollService;
    private final PayeFilingLogRepository payeFilingLogRepository;

    public PayrollFilingService(PayrollService payrollService, PayeFilingLogRepository payeFilingLogRepository) {
        this.payrollService = payrollService;
        this.payeFilingLogRepository = payeFilingLogRepository;
    }

    @Transactional
    public byte[] exportPayeCsv(UUID runId) {
        UUID tenantId = requireTenant();
        PayrollRun run = payrollService.getRun(runId).run();
        if (!"POSTED".equalsIgnoreCase(run.getStatus()) && !"APPROVED".equalsIgnoreCase(run.getStatus())) {
            throw new IllegalStateException("Payroll run must be approved or posted before PAYE export");
        }
        List<PayrollLine> lines = payrollService.getRunLines(runId);
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
        log.setPayrollRunId(runId);
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

    private UUID requireTenant() {
        if (TenantContext.tenantId() == null) {
            throw new IllegalStateException("Tenant context is required");
        }
        return TenantContext.tenantId();
    }
}
