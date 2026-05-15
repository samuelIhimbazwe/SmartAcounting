package com.smartaccounting.controller;

import com.smartaccounting.dto.AttendanceRequest;
import com.smartaccounting.dto.AttendanceSummary;
import com.smartaccounting.entity.AttendanceRecord;
import com.smartaccounting.service.AttendanceService;
import com.smartaccounting.tenant.TenantContext;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/hr/attendance")
public class AttendanceController {
    private final AttendanceService attendanceService;

    public AttendanceController(AttendanceService attendanceService) {
        this.attendanceService = attendanceService;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('HR_MANAGER', 'ACCOUNTING_CONTROLLER')")
    public ResponseEntity<AttendanceRecord> recordAttendance(@RequestBody @Valid AttendanceRequest request) {
        UUID recordedBy = TenantContext.userId() != null ? TenantContext.userId() : UUID.randomUUID();
        return ResponseEntity.ok(attendanceService.recordAttendance(request, recordedBy));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('CEO', 'CFO', 'HR_MANAGER')")
    public ResponseEntity<List<AttendanceRecord>> getAttendance(
        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
        @RequestParam(required = false) UUID employeeId) {
        return ResponseEntity.ok(attendanceService.getAttendance(date, employeeId));
    }

    @GetMapping("/summary/{period}")
    @PreAuthorize("hasAnyRole('CEO', 'CFO', 'HR_MANAGER')")
    public ResponseEntity<AttendanceSummary> getMonthlySummary(@PathVariable String period) {
        return ResponseEntity.ok(attendanceService.getMonthlySummary(period));
    }
}
