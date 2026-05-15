package com.smartaccounting.service;

import com.smartaccounting.compliance.rwanda.RwandaPayrollTaxService;
import com.smartaccounting.dto.CreateJournalEntryRequest;
import com.smartaccounting.dto.HrEmployeePayrollRow;
import com.smartaccounting.dto.PayrollDeductions;
import com.smartaccounting.dto.PayrollRunDetail;
import com.smartaccounting.entity.PayrollLine;
import com.smartaccounting.entity.PayrollRun;
import com.smartaccounting.exception.BusinessException;
import com.smartaccounting.repository.PayrollLineRepository;
import com.smartaccounting.repository.PayrollRunRepository;
import com.smartaccounting.repository.AttendanceRecordRepository;
import com.smartaccounting.tenant.TenantContext;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class PayrollService {
    private final PayrollRunRepository payrollRunRepository;
    private final PayrollLineRepository payrollLineRepository;
    private final AttendanceRecordRepository attendanceRecordRepository;
    private final RwandaPayrollTaxService rwandaPayrollTaxService;
    private final FinanceService financeService;
    private final PayslipPdfGenerator payslipPdfGenerator;
    private final JdbcTemplate jdbcTemplate;

    public PayrollService(PayrollRunRepository payrollRunRepository,
                          PayrollLineRepository payrollLineRepository,
                          AttendanceRecordRepository attendanceRecordRepository,
                          RwandaPayrollTaxService rwandaPayrollTaxService,
                          FinanceService financeService,
                          PayslipPdfGenerator payslipPdfGenerator,
                          JdbcTemplate jdbcTemplate) {
        this.payrollRunRepository = payrollRunRepository;
        this.payrollLineRepository = payrollLineRepository;
        this.attendanceRecordRepository = attendanceRecordRepository;
        this.rwandaPayrollTaxService = rwandaPayrollTaxService;
        this.financeService = financeService;
        this.payslipPdfGenerator = payslipPdfGenerator;
        this.jdbcTemplate = jdbcTemplate;
    }

    public PayrollRun preparePayrollRun(String period, UUID preparedBy) {
        UUID tid = requireTenant();
        YearMonth ym = YearMonth.parse(period);
        if (payrollRunRepository.existsByTenantIdAndPeriod(tid, period)) {
            throw new BusinessException("Payroll run already exists for " + period);
        }

        List<HrEmployeePayrollRow> employees = loadActiveEmployees(tid);
        PayrollRun run = new PayrollRun();
        run.setId(UUID.randomUUID());
        run.setTenantId(tid);
        run.setPeriod(period);
        run.setStatus("DRAFT");
        run.setEmployeeCount(employees.size());
        run.setPreparedBy(preparedBy);
        run.setCreatedAt(Instant.now());
        run = payrollRunRepository.save(run);

        BigDecimal totalGross = BigDecimal.ZERO;
        BigDecimal totalNet = BigDecimal.ZERO;
        BigDecimal totalRssbEmployee = BigDecimal.ZERO;
        BigDecimal totalRssbEmployer = BigDecimal.ZERO;
        BigDecimal totalPaye = BigDecimal.ZERO;
        BigDecimal totalCbhi = BigDecimal.ZERO;
        BigDecimal totalMaternity = BigDecimal.ZERO;

        int workingDays = getWorkingDays(ym);
        for (HrEmployeePayrollRow employee : employees) {
            int presentDays = attendanceRecordRepository.countByEmployeeIdAndMonthAndStatus(
                employee.id(), ym, "PRESENT");
            int absentDays = Math.max(0, workingDays - presentDays);

            BigDecimal adjustedSalary = employee.baseSalary();
            if (absentDays > 0 && employee.deductAbsences() && workingDays > 0) {
                BigDecimal dailyRate = employee.baseSalary()
                    .divide(new BigDecimal(workingDays), 4, RoundingMode.HALF_UP);
                adjustedSalary = adjustedSalary.subtract(dailyRate.multiply(new BigDecimal(absentDays)));
            }

            PayrollDeductions deductions = rwandaPayrollTaxService.calculateDeductions(adjustedSalary);
            PayrollLine line = new PayrollLine();
            line.setId(UUID.randomUUID());
            line.setTenantId(tid);
            line.setPayrollRunId(run.getId());
            line.setEmployeeId(employee.id());
            line.setEmployeeName(employee.fullName());
            line.setDepartment(employee.department());
            line.setGrossSalary(adjustedSalary);
            line.setRssbEmployee(deductions.rssbEmployee());
            line.setRssbEmployer(deductions.rssbEmployer());
            line.setMaternityInsurance(deductions.maternityInsurance());
            line.setCbhi(deductions.cbhi());
            line.setTaxableIncome(deductions.taxableIncome());
            line.setPaye(deductions.paye());
            line.setNetPay(deductions.netPay());
            line.setWorkingDays(workingDays);
            line.setAbsentDays(absentDays);
            line.setCreatedAt(Instant.now());
            payrollLineRepository.save(line);

            totalGross = totalGross.add(adjustedSalary);
            totalNet = totalNet.add(deductions.netPay());
            totalRssbEmployee = totalRssbEmployee.add(deductions.rssbEmployee());
            totalRssbEmployer = totalRssbEmployer.add(deductions.rssbEmployer());
            totalPaye = totalPaye.add(deductions.paye());
            totalCbhi = totalCbhi.add(deductions.cbhi());
            totalMaternity = totalMaternity.add(deductions.maternityInsurance());
        }

        run.setTotalGross(totalGross);
        run.setTotalNet(totalNet);
        run.setTotalRssbEmployee(totalRssbEmployee);
        run.setTotalRssbEmployer(totalRssbEmployer);
        run.setTotalPaye(totalPaye);
        run.setTotalCbhi(totalCbhi);
        run.setTotalMaternity(totalMaternity);
        return payrollRunRepository.save(run);
    }

    public PayrollRun approvePayrollRun(UUID runId, UUID approvedBy) {
        PayrollRun run = loadRun(runId);
        if (!"DRAFT".equals(run.getStatus()) && !"REVIEW".equals(run.getStatus())) {
            throw new BusinessException("Payroll run cannot be approved in status: " + run.getStatus());
        }
        run.setStatus("APPROVED");
        run.setApprovedBy(approvedBy);
        run.setApprovedAt(Instant.now());
        return payrollRunRepository.save(run);
    }

    public PayrollRun postPayrollRun(UUID runId) {
        PayrollRun run = loadRun(runId);
        if (!"APPROVED".equals(run.getStatus())) {
            throw new BusinessException("Payroll run must be approved before posting");
        }
        LocalDate entryDate = YearMonth.parse(run.getPeriod()).atEndOfMonth();
        financeService.createJournalEntry(new CreateJournalEntryRequest(
            entryDate, "Payroll gross " + run.getPeriod(), "SALARIES_EXPENSE", "NET_SALARIES_PAYABLE",
            run.getTotalGross(), "RWF"));
        financeService.createJournalEntry(new CreateJournalEntryRequest(
            entryDate, "RSSB employer " + run.getPeriod(), "RSSB_EMPLOYER_EXPENSE", "RSSB_PAYABLE",
            run.getTotalRssbEmployer(), "RWF"));
        BigDecimal rssbPayable = run.getTotalRssbEmployee().add(run.getTotalRssbEmployer());
        if (rssbPayable.signum() > 0) {
            financeService.createJournalEntry(new CreateJournalEntryRequest(
                entryDate, "RSSB employee " + run.getPeriod(), "RSSB_PAYABLE", "NET_SALARIES_PAYABLE",
                run.getTotalRssbEmployee(), "RWF"));
        }
        if (run.getTotalPaye().signum() > 0) {
            financeService.createJournalEntry(new CreateJournalEntryRequest(
                entryDate, "PAYE " + run.getPeriod(), "PAYE_PAYABLE", "NET_SALARIES_PAYABLE",
                run.getTotalPaye(), "RWF"));
        }
        run.setStatus("POSTED");
        run.setPostedAt(Instant.now());
        return payrollRunRepository.save(run);
    }

    @Transactional(readOnly = true)
    public List<PayrollRun> listRuns() {
        return payrollRunRepository.findByTenantIdOrderByPeriodDesc(requireTenant());
    }

    @Transactional(readOnly = true)
    public PayrollRunDetail getRun(UUID runId) {
        PayrollRun run = loadRun(runId);
        return new PayrollRunDetail(run, payrollLineRepository.findByPayrollRunId(runId));
    }

    @Transactional(readOnly = true)
    public List<PayrollLine> getRunLines(UUID runId) {
        loadRun(runId);
        return payrollLineRepository.findByPayrollRunId(runId);
    }

    @Transactional(readOnly = true)
    public byte[] generatePayslip(UUID runId, UUID employeeId) {
        PayrollLine line = payrollLineRepository.findByPayrollRunIdAndEmployeeId(runId, employeeId)
            .orElseThrow(() -> new IllegalArgumentException("Payroll line not found"));
        PayrollRun run = loadRun(runId);
        return payslipPdfGenerator.generate(run, line);
    }

    private PayrollRun loadRun(UUID runId) {
        return payrollRunRepository.findByIdAndTenantId(runId, requireTenant())
            .orElseThrow(() -> new IllegalArgumentException("Payroll run not found"));
    }

    private List<HrEmployeePayrollRow> loadActiveEmployees(UUID tenantId) {
        return jdbcTemplate.query(
            """
            select id, full_name, department, status,
                   coalesce(base_salary, 0) as base_salary,
                   coalesce(deduct_absences, true) as deduct_absences
            from hr_employee_profiles
            where tenant_id = ? and upper(status) = 'ACTIVE'
            """,
            (rs, row) -> new HrEmployeePayrollRow(
                UUID.fromString(rs.getString("id")),
                rs.getString("full_name"),
                rs.getString("department"),
                rs.getString("status"),
                rs.getBigDecimal("base_salary"),
                rs.getBoolean("deduct_absences")
            ),
            tenantId
        );
    }

    private int getWorkingDays(YearMonth ym) {
        int days = 0;
        for (LocalDate d = ym.atDay(1); !d.isAfter(ym.atEndOfMonth()); d = d.plusDays(1)) {
            int dow = d.getDayOfWeek().getValue();
            if (dow <= 5) {
                days++;
            }
        }
        return Math.max(days, 1);
    }

    private UUID requireTenant() {
        if (TenantContext.tenantId() == null) {
            throw new IllegalStateException("Tenant context is required");
        }
        return TenantContext.tenantId();
    }
}
