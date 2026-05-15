package com.smartaccounting.compliance.rwanda;

import com.smartaccounting.dto.PayrollDeductions;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Service
public class RwandaPayrollTaxService {

    public PayrollDeductions calculateDeductions(BigDecimal grossSalary) {
        BigDecimal gross = grossSalary == null ? BigDecimal.ZERO : grossSalary.setScale(4, RoundingMode.HALF_UP);
        BigDecimal rssbEmployee = gross.multiply(new BigDecimal("0.03")).setScale(4, RoundingMode.HALF_UP);
        BigDecimal rssbEmployer = gross.multiply(new BigDecimal("0.05")).setScale(4, RoundingMode.HALF_UP);
        BigDecimal maternity = gross.multiply(new BigDecimal("0.003")).setScale(4, RoundingMode.HALF_UP);
        BigDecimal cbhi = gross.multiply(new BigDecimal("0.005")).setScale(4, RoundingMode.HALF_UP);
        BigDecimal taxable = gross.subtract(rssbEmployee).subtract(maternity).subtract(cbhi)
            .max(BigDecimal.ZERO);
        BigDecimal paye = calculatePaye(taxable);
        BigDecimal net = gross.subtract(rssbEmployee).subtract(maternity).subtract(cbhi).subtract(paye)
            .max(BigDecimal.ZERO);
        return new PayrollDeductions(
            rssbEmployee, rssbEmployer, maternity, cbhi, taxable, paye, net);
    }

    private BigDecimal calculatePaye(BigDecimal taxable) {
        if (taxable.compareTo(new BigDecimal("60000")) <= 0) {
            return BigDecimal.ZERO;
        }
        if (taxable.compareTo(new BigDecimal("100000")) <= 0) {
            return taxable.subtract(new BigDecimal("60000"))
                .multiply(new BigDecimal("0.10"))
                .setScale(4, RoundingMode.HALF_UP);
        }
        return taxable.multiply(new BigDecimal("0.30"))
            .subtract(new BigDecimal("20000"))
            .max(BigDecimal.ZERO)
            .setScale(4, RoundingMode.HALF_UP);
    }
}
