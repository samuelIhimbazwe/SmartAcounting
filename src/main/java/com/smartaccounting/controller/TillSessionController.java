package com.smartaccounting.controller;

import com.smartaccounting.dto.CloseTillSessionRequest;
import com.smartaccounting.dto.OpenTillSessionRequest;
import com.smartaccounting.dto.TillSessionDto;
import com.smartaccounting.service.TillSessionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import com.smartaccounting.security.PermissionExpressions;
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
    @PreAuthorize(PermissionExpressions.POS_TILL_MANAGE)
    public ResponseEntity<TillSessionDto> openSession(@Valid @RequestBody OpenTillSessionRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(tillSessionService.openSession(req));
    }

    @GetMapping("/current")
    @PreAuthorize(PermissionExpressions.POS_TILL_MANAGE)
    public TillSessionDto getCurrentSession() {
        return tillSessionService.getCurrentSessionForUser();
    }

    @GetMapping("/floor")
    @PreAuthorize(PermissionExpressions.POS_TILL_MANAGE)
    public java.util.List<TillSessionDto> floorView() {
        return tillSessionService.listOpenSessionsAtLocation();
    }

    @PatchMapping("/{id}/close")
    @PreAuthorize(PermissionExpressions.POS_TILL_MANAGE)
    public TillSessionDto closeSession(
        @PathVariable UUID id,
        @Valid @RequestBody CloseTillSessionRequest req
    ) {
        return tillSessionService.closeSession(id, req);
    }

    @PatchMapping("/{id}/suspend")
    @PreAuthorize(PermissionExpressions.FINANCE_READ)
    public TillSessionDto suspendSession(@PathVariable UUID id) {
        return tillSessionService.suspendSession(id);
    }
}
