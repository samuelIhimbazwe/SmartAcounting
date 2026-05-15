package com.smartaccounting.service;

import com.smartaccounting.entity.PayrollLine;
import com.smartaccounting.entity.PayrollRun;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;

@Component
public class PayslipPdfGenerator {

    public byte[] generate(PayrollRun run, PayrollLine line) {
        String text = """
            PAYSLIP
            Period: %s
            Employee: %s
            Department: %s
            Gross: %s
            RSSB (employee): %s
            Maternity: %s
            CBHI: %s
            PAYE: %s
            Net pay: %s
            """.formatted(
            run.getPeriod(),
            line.getEmployeeName(),
            line.getDepartment(),
            line.getGrossSalary(),
            line.getRssbEmployee(),
            line.getMaternityInsurance(),
            line.getCbhi(),
            line.getPaye(),
            line.getNetPay()
        );
        return text.getBytes(StandardCharsets.UTF_8);
    }
}
