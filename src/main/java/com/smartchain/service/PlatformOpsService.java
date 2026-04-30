package com.smartchain.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartchain.audit.AuditService;
import com.smartchain.dto.CustomFieldValueRequest;
import com.smartchain.dto.ScenarioTemplateRequest;
import com.smartchain.entity.CustomFieldValue;
import com.smartchain.entity.ScenarioTemplate;
import com.smartchain.repository.CustomFieldValueRepository;
import com.smartchain.repository.ScenarioTemplateRepository;
import com.smartchain.tenant.TenantContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class PlatformOpsService {
    private final CustomFieldValueRepository customFieldValueRepository;
    private final ScenarioTemplateRepository scenarioTemplateRepository;
    private final ObjectMapper objectMapper;
    private final AuditService auditService;

    public PlatformOpsService(CustomFieldValueRepository customFieldValueRepository,
                              ScenarioTemplateRepository scenarioTemplateRepository,
                              ObjectMapper objectMapper,
                              AuditService auditService) {
        this.customFieldValueRepository = customFieldValueRepository;
        this.scenarioTemplateRepository = scenarioTemplateRepository;
        this.objectMapper = objectMapper;
        this.auditService = auditService;
    }

    @Transactional
    public UUID upsertCustomField(CustomFieldValueRequest req) {
        requireTenant();
        CustomFieldValue v = new CustomFieldValue();
        v.setId(UUID.randomUUID());
        v.setTenantId(TenantContext.tenantId());
        v.setEntityType(req.entityType());
        v.setEntityId(req.entityId());
        v.setFieldKey(req.fieldKey());
        try {
            v.setFieldValue(objectMapper.writeValueAsString(req.fieldValue()));
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid custom field value payload");
        }
        v.setCreatedAt(Instant.now());
        customFieldValueRepository.save(v);
        auditService.logAction("CUSTOM_FIELD_VALUE_SET", "CUSTOM_FIELD_VALUE", "{}", "{\"id\":\"" + v.getId() + "\"}");
        return v.getId();
    }

    @Transactional(readOnly = true)
    public List<CustomFieldValue> values(String entityType, UUID entityId) {
        return customFieldValueRepository.findByEntityTypeAndEntityId(entityType, entityId);
    }

    @Transactional
    public UUID createScenario(ScenarioTemplateRequest req) {
        requireTenant();
        ScenarioTemplate t = new ScenarioTemplate();
        t.setId(UUID.randomUUID());
        t.setTenantId(TenantContext.tenantId());
        t.setRole(req.role().toLowerCase());
        t.setName(req.name());
        try {
            t.setAssumptionsJson(objectMapper.writeValueAsString(req.assumptions()));
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid scenario assumptions");
        }
        t.setCreatedAt(Instant.now());
        scenarioTemplateRepository.save(t);
        auditService.logAction("SCENARIO_TEMPLATE_CREATED", "SCENARIO", "{}", "{\"id\":\"" + t.getId() + "\"}");
        return t.getId();
    }

    @Transactional(readOnly = true)
    public List<ScenarioTemplate> scenarios(String role) {
        return scenarioTemplateRepository.findByRoleOrderByCreatedAtDesc(role.toLowerCase());
    }

    private void requireTenant() {
        if (TenantContext.tenantId() == null) throw new IllegalStateException("Tenant context is required");
    }
}
