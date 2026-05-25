package com.smartaccounting.controller;

import com.smartaccounting.dto.ShiftAssignmentRequest;
import com.smartaccounting.dto.ShiftRequest;
import com.smartaccounting.entity.Shift;
import com.smartaccounting.entity.ShiftAssignment;
import com.smartaccounting.service.ShiftService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import com.smartaccounting.security.PermissionExpressions;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/hr/shifts")
public class ShiftController {
    private final ShiftService shiftService;

    public ShiftController(ShiftService shiftService) {
        this.shiftService = shiftService;
    }

    @GetMapping
    @PreAuthorize(PermissionExpressions.HR_READ)
    public ResponseEntity<List<Shift>> listShifts() {
        return ResponseEntity.ok(shiftService.listShifts());
    }

    @PostMapping
    @PreAuthorize(PermissionExpressions.HR_WRITE)
    public ResponseEntity<Shift> createShift(@RequestBody @Valid ShiftRequest request) {
        return ResponseEntity.ok(shiftService.createShift(request));
    }

    @PostMapping("/assignments")
    @PreAuthorize(PermissionExpressions.HR_WRITE)
    public ResponseEntity<ShiftAssignment> assignShift(@RequestBody @Valid ShiftAssignmentRequest request) {
        return ResponseEntity.ok(shiftService.assignShift(request));
    }

    @GetMapping("/roster")
    @PreAuthorize(PermissionExpressions.HR_READ)
    public ResponseEntity<List<ShiftAssignment>> getRoster(
        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(shiftService.getRoster(date));
    }
}
