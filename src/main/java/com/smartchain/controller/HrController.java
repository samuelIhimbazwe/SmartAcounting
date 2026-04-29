package com.smartchain.controller;

import com.smartchain.dto.CreateHrEmployeeRequest;
import com.smartchain.dto.CreateLeaveRequest;
import com.smartchain.service.HrService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
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
    public List<Map<String, Object>> listEmployees(@RequestParam(defaultValue = "0") int page,
                                                   @RequestParam(defaultValue = "50") int size) {
        return service.employees(page, size);
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
    public List<Map<String, Object>> listLeave(@RequestParam(defaultValue = "0") int page,
                                               @RequestParam(defaultValue = "50") int size) {
        return service.leaveRequests(page, size);
    }
}
