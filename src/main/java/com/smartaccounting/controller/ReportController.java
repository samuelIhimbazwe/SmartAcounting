package com.smartaccounting.controller;

import com.smartaccounting.dto.ZReportRequest;
import com.smartaccounting.service.BoardReportService;
import com.smartaccounting.service.ZReportService;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import com.smartaccounting.security.PermissionExpressions;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/reports")
public class ReportController {
    private final BoardReportService boardReportService;
    private final ZReportService zReportService;

    public ReportController(BoardReportService boardReportService, ZReportService zReportService) {
        this.boardReportService = boardReportService;
        this.zReportService = zReportService;
    }

    @GetMapping("/board/{period}")
    @PreAuthorize(PermissionExpressions.REPORTS_EXPORT)
    public ResponseEntity<byte[]> getBoardReport(
        @PathVariable String period,
        @RequestHeader(value = HttpHeaders.ACCEPT, required = false) String accept) {
        byte[] body = boardReportService.generateBoardReport(period);
        boolean wantsPdf = accept != null && accept.contains(MediaType.APPLICATION_PDF_VALUE);
        MediaType mediaType = wantsPdf
            ? MediaType.APPLICATION_PDF
            : MediaType.parseMediaType("text/plain;charset=UTF-8");
        return ResponseEntity.ok()
            .contentType(mediaType)
            .header(HttpHeaders.CONTENT_DISPOSITION,
                "inline; filename=\"board-report-" + period + (wantsPdf ? ".pdf" : ".txt") + "\"")
            .body(body);
    }

    @GetMapping("/z-report")
    @PreAuthorize(PermissionExpressions.POS_TILL_MANAGE)
    public Map<String, Object> previewZReport(
        @RequestParam UUID tillSessionId,
        @RequestParam(defaultValue = "X") String reportType,
        @RequestParam(required = false) BigDecimal closingCash,
        @RequestParam(required = false) String cashierName
    ) {
        return zReportService.preview(tillSessionId, reportType, closingCash, cashierName);
    }

    @PostMapping("/z-report")
    @PreAuthorize(PermissionExpressions.POS_TILL_MANAGE)
    public Map<String, Object> postZReport(@RequestBody @Valid ZReportRequest request) {
        return zReportService.saveZReport(
            request.tillSessionId(),
            request.reportType(),
            request.closingCash(),
            request.cashierName()
        );
    }
}
