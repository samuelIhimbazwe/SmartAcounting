package com.smartaccounting.controller;

import com.smartaccounting.dto.DepreciationScheduleLine;
import com.smartaccounting.dto.DisposeAssetRequest;
import com.smartaccounting.dto.FixedAssetRequest;
import com.smartaccounting.entity.FixedAssetRegister;
import com.smartaccounting.service.FixedAssetRegisterService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/finance/fixed-assets")
public class FixedAssetController {
    private final FixedAssetRegisterService fixedAssetRegisterService;

    public FixedAssetController(FixedAssetRegisterService fixedAssetRegisterService) {
        this.fixedAssetRegisterService = fixedAssetRegisterService;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('CFO', 'ACCOUNTING_CONTROLLER')")
    public ResponseEntity<FixedAssetRegister> createAsset(@RequestBody @Valid FixedAssetRequest request) {
        return ResponseEntity.ok(fixedAssetRegisterService.create(request));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('CEO', 'CFO', 'ACCOUNTING_CONTROLLER')")
    public ResponseEntity<Page<FixedAssetRegister>> listAssets(
        @RequestParam(required = false) String status,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(fixedAssetRegisterService.list(status, PageRequest.of(page, size)));
    }

    @GetMapping("/{assetId}/depreciation-schedule")
    @PreAuthorize("hasAnyRole('CEO', 'CFO', 'ACCOUNTING_CONTROLLER')")
    public ResponseEntity<List<DepreciationScheduleLine>> getSchedule(@PathVariable UUID assetId) {
        return ResponseEntity.ok(fixedAssetRegisterService.depreciationSchedule(assetId));
    }

    @PostMapping("/{assetId}/dispose")
    @PreAuthorize("hasAnyRole('CFO', 'ACCOUNTING_CONTROLLER')")
    public ResponseEntity<FixedAssetRegister> disposeAsset(
        @PathVariable UUID assetId,
        @RequestBody @Valid DisposeAssetRequest request) {
        return ResponseEntity.ok(fixedAssetRegisterService.dispose(assetId, request));
    }
}
