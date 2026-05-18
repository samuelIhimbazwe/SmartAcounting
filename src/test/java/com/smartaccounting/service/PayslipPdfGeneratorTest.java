package com.smartaccounting.service;

import com.smartaccounting.entity.PayrollLine;
import com.smartaccounting.entity.PayrollRun;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class PayslipPdfGeneratorTest {
    private final PayslipPdfGenerator generator = new PayslipPdfGenerator();

    @Test
    void generate_returnsPdfMagicBytes() {
        PayrollRun run = new PayrollRun();
        run.setPeriod("2026-05");

        PayrollLine line = new PayrollLine();
        line.setEmployeeName("Jane Doe");
        line.setDepartment("Finance");
        line.setGrossSalary(new BigDecimal("500000"));
        line.setRssbEmployee(new BigDecimal("30000"));
        line.setMaternityInsurance(new BigDecimal("5000"));
        line.setCbhi(new BigDecimal("2000"));
        line.setPaye(new BigDecimal("40000"));
        line.setRssbEmployer(new BigDecimal("35000"));
        line.setNetPay(new BigDecimal("423000"));
        line.setEmployeeId(UUID.randomUUID());

        byte[] pdf = generator.generate(run, line);

        assertThat(pdf.length).isGreaterThan(100);
        assertThat(new String(pdf, 0, 4)).isEqualTo("%PDF");
    }
}
