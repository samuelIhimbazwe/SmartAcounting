package com.smartaccounting.compliance;

import com.smartaccounting.dto.TinValidateRequest;
import com.smartaccounting.dto.TinValidationResponse;
import jakarta.validation.Valid;
import com.smartaccounting.security.PermissionExpressions;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/compliance/tin")
public class TinValidationController {
    private final TinValidationService tinValidationService;

    public TinValidationController(TinValidationService tinValidationService) {
        this.tinValidationService = tinValidationService;
    }

    @PostMapping("/validate")
    @PreAuthorize(PermissionExpressions.CUSTOMER_ACCESS)
    public TinValidationResponse validate(@RequestBody @Valid TinValidateRequest request) {
        return tinValidationService.validate(request.tin());
    }
}
