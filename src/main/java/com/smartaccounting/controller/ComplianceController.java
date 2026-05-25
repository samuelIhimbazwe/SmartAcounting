package com.smartaccounting.controller;

import com.smartaccounting.compliance.EbmAuditService;
import com.smartaccounting.compliance.VatFilingCalendarService;
import com.smartaccounting.entity.EbmAuditLog;
import org.springframework.data.domain.Page;
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
        Page<EbmAuditLog> page = ebmAuditService.list(pageable);
        return Map.of(
            "items", page.getContent(),
            "total", page.getTotalElements(),
            "page", page.getNumber(),
            "size", page.getSize()
        );
    }

    @GetMapping("/vat/calendar")
    @PreAuthorize(PermissionExpressions.FINANCE_READ)
    public List<Map<String, Object>> vatCalendar() {
        return vatFilingCalendarService.nextPeriods(4);
    }

}
