package com.smartaccounting.controller;

import com.smartaccounting.service.BoardReportService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/reports")
public class ReportController {
    private final BoardReportService boardReportService;

    public ReportController(BoardReportService boardReportService) {
        this.boardReportService = boardReportService;
    }

    @GetMapping("/board/{period}")
    @PreAuthorize("hasAnyRole('CEO', 'CFO')")
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
}
