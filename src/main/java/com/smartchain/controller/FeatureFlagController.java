package com.smartchain.controller;

import com.smartchain.service.FeatureFlagService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/platform/features")
public class FeatureFlagController {
    private final FeatureFlagService featureFlagService;

    public FeatureFlagController(FeatureFlagService featureFlagService) {
        this.featureFlagService = featureFlagService;
    }

    @PostMapping("/{featureKey}")
    @PreAuthorize("@permissionGuard.has(authentication, 'FEATURE_FLAG_WRITE')")
    public Map<String, Object> setFlag(@PathVariable String featureKey,
                                       @RequestParam boolean enabled) {
        return featureFlagService.setFlag(featureKey, enabled);
    }

    @GetMapping
    @PreAuthorize("@permissionGuard.has(authentication, 'FEATURE_FLAG_WRITE')")
    public Map<String, Boolean> listFlags() {
        return featureFlagService.allFlags();
    }
}
