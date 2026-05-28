package com.smartaccounting.controller;

import com.smartaccounting.dto.CreateHrEmployeeRequest;
import com.smartaccounting.dto.CreateLeaveRequest;
import com.smartaccounting.dto.UpdateHrEmployeeRequest;
import com.smartaccounting.service.HrService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/hr")
public class HrController {
    private final HrService service;

    public HrController(HrService service) {
        this.service = service;
    }

    @PostMapping("/employees")
    @PreAuthorize("@permissionGuard.has(authentication, 'HR_WRITE')")
    public Map<String, UUID> createEmployee(@RequestBody @Valid CreateHrEmployeeRequest request) {
        return Map.of("employeeId", service.createEmployee(request));
    }

    @GetMapping("/employees")
    @PreAuthorize("@permissionGuard.has(authentication, 'HR_READ')")
    public List<Map<String, Object>> listEmployees(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "50") int size,
        @RequestParam(required = false) String q,
        @RequestParam(required = false) String department,
        @RequestParam(required = false) String status) {
        return service.employees(page, size, q, department, status);
    }

    @GetMapping("/employees/{id}")
    @PreAuthorize("@permissionGuard.has(authentication, 'HR_READ')")
    public Map<String, Object> getEmployee(@PathVariable UUID id) {
        return service.getEmployee(id);
    }

    @PutMapping("/employees/{id}")
    @PreAuthorize("@permissionGuard.has(authentication, 'HR_WRITE')")
    public Map<String, Object> updateEmployee(
        @PathVariable UUID id,
        @RequestBody @Valid UpdateHrEmployeeRequest request) {
        return service.updateEmployee(id, request);
    }

    @GetMapping("/employees/{id}/attendance-summary/{period}")
    @PreAuthorize("@permissionGuard.has(authentication, 'HR_READ')")
    public Map<String, Object> employeeAttendanceSummary(
        @PathVariable UUID id,
        @PathVariable String period) {
        return service.employeeAttendanceSummary(id, period);
    }

    @GetMapping("/employees/{id}/payslips")
    @PreAuthorize("@permissionGuard.has(authentication, 'HR_READ')")
    public List<Map<String, Object>> employeePayslips(
        @PathVariable UUID id,
        @RequestParam(defaultValue = "6") int limit) {
        return service.employeePayslips(id, limit);
    }

    @GetMapping("/headcount")
    @PreAuthorize("@permissionGuard.has(authentication, 'HR_READ')")
    public Map<String, Object> headcount() {
        return service.headcount();
    }

    @PostMapping("/leave")
    @PreAuthorize("@permissionGuard.has(authentication, 'HR_WRITE')")
    public Map<String, UUID> createLeave(@RequestBody @Valid CreateLeaveRequest request) {
        return Map.of("leaveRequestId", service.createLeave(request));
    }

    @GetMapping("/leave")
    @PreAuthorize("@permissionGuard.has(authentication, 'HR_READ')")
    public List<Map<String, Object>> listLeave(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "50") int size,
        @RequestParam(required = false) UUID employeeId,
        @RequestParam(required = false) String leaveType,
        @RequestParam(required = false) String status) {
        return service.leaveRequests(page, size, employeeId, leaveType, status);
    }

    @PostMapping("/leave/{id}/approve")
    @PreAuthorize("@permissionGuard.has(authentication, 'HR_WRITE')")
    public Map<String, Object> approveLeave(@PathVariable UUID id) {
        return service.approveLeave(id);
    }

    @PostMapping("/leave/{id}/reject")
    @PreAuthorize("@permissionGuard.has(authentication, 'HR_WRITE')")
    public Map<String, Object> rejectLeave(@PathVariable UUID id) {
        return service.rejectLeave(id);
    }
}
