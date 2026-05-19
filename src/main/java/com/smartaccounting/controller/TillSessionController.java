package com.smartaccounting.controller;

import com.smartaccounting.dto.CloseTillSessionRequest;
import com.smartaccounting.dto.OpenTillSessionRequest;
import com.smartaccounting.dto.TillSessionDto;
import com.smartaccounting.service.TillSessionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/pos/till-sessions")
public class TillSessionController {
    private final TillSessionService tillSessionService;

    public TillSessionController(TillSessionService tillSessionService) {
        this.tillSessionService = tillSessionService;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('CEO','SALES_MANAGER','OPS_MANAGER','ACCOUNTING_CONTROLLER')")
    public ResponseEntity<TillSessionDto> openSession(@Valid @RequestBody OpenTillSessionRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(tillSessionService.openSession(req));
    }

    @GetMapping("/current")
    @PreAuthorize("hasAnyRole('CEO','SALES_MANAGER','OPS_MANAGER','ACCOUNTING_CONTROLLER')")
    public TillSessionDto getCurrentSession() {
        return tillSessionService.getCurrentSessionForUser();
    }

    @GetMapping("/floor")
    @PreAuthorize("hasAnyRole('CEO','SALES_MANAGER','OPS_MANAGER','ACCOUNTING_CONTROLLER')")
    public java.util.List<TillSessionDto> floorView() {
        return tillSessionService.listOpenSessionsAtLocation();
    }

    @PatchMapping("/{id}/close")
    @PreAuthorize("hasAnyRole('CEO','SALES_MANAGER','OPS_MANAGER','ACCOUNTING_CONTROLLER')")
    public TillSessionDto closeSession(
        @PathVariable UUID id,
        @Valid @RequestBody CloseTillSessionRequest req
    ) {
        return tillSessionService.closeSession(id, req);
    }

    @PatchMapping("/{id}/suspend")
    @PreAuthorize("hasAnyRole('CEO','CFO','ACCOUNTING_CONTROLLER')")
    public TillSessionDto suspendSession(@PathVariable UUID id) {
        return tillSessionService.suspendSession(id);
    }
}
