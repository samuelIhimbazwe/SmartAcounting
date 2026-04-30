package com.smartchain.controller;

import com.smartchain.dto.CreateDocumentRequest;
import com.smartchain.service.DocumentService;
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
@RequestMapping("/api/v1/documents")
public class DocumentController {
    private final DocumentService service;

    public DocumentController(DocumentService service) {
        this.service = service;
    }

    @PostMapping("/upload-requests")
    @PreAuthorize("@permissionGuard.has(authentication, 'DOCUMENT_WRITE')")
    public Map<String, Object> createUpload(@RequestBody @Valid CreateDocumentRequest request) {
        return service.createUploadRequest(request);
    }

    @GetMapping
    @PreAuthorize("@permissionGuard.has(authentication, 'DOCUMENT_READ')")
    public List<Map<String, Object>> list(@RequestParam String entityType,
                                          @RequestParam UUID entityId,
                                          @RequestParam(defaultValue = "0") int page,
                                          @RequestParam(defaultValue = "50") int size) {
        return service.list(entityType, entityId, page, size);
    }
}
