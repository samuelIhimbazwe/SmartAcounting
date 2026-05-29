package com.smartaccounting.controller;

import com.smartaccounting.compliance.EbmAuditService;
import com.smartaccounting.compliance.VatFilingCalendarService;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import com.smartaccounting.security.PermissionExpressions;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
@RestController
@RequestMapping("/api/v1/compliance")
public class ComplianceController {

    private final EbmAuditService ebmAuditService;
    private final VatFilingCalendarService vatFilingCalendarService;

    public ComplianceController(EbmAuditService ebmAuditService,
                                VatFilingCalendarService vatFilingCalendarService) {
        this.ebmAuditService = ebmAuditService;
        this.vatFilingCalendarService = vatFilingCalendarService;
    }

    @GetMapping("/ebm/audit-log")
    @PreAuthorize(PermissionExpressions.EBM_AUDIT)
    public Map<String, Object> ebmAuditLog(Pageable pageable) {
        return ebmAuditService.auditLogPage(pageable);
    }

    @GetMapping("/vat/calendar")
    @PreAuthorize(PermissionExpressions.EBM_COMPLIANCE_READ)
    public List<Map<String, Object>> vatCalendar() {
        return vatFilingCalendarService.nextPeriods(4);
    }

}
