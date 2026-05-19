package com.smartaccounting.service;

import com.smartaccounting.dto.CloseTillSessionRequest;
import com.smartaccounting.dto.OpenTillSessionRequest;
import com.smartaccounting.dto.TillSessionDto;
import com.smartaccounting.entity.TillSession;
import com.smartaccounting.exception.BusinessException;
import com.smartaccounting.repository.TillSessionRepository;
import com.smartaccounting.tenant.TenantContext;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Service
@Transactional
public class TillSessionService {
    private final TillSessionRepository tillSessionRepository;
    private final PushNotificationService pushNotificationService;
    private final LocationService locationService;
    private final BigDecimal varianceThreshold;

    public TillSessionService(
        TillSessionRepository tillSessionRepository,
        PushNotificationService pushNotificationService,
        LocationService locationService,
        @Value("${smartaccounting.till.variance-threshold:5000}") BigDecimal varianceThreshold
    ) {
        this.tillSessionRepository = tillSessionRepository;
        this.pushNotificationService = pushNotificationService;
        this.locationService = locationService;
        this.varianceThreshold = varianceThreshold;
    }

    public TillSessionDto openSession(OpenTillSessionRequest req) {
        UUID tenantId = requireTenant();
        UUID cashierId = requireUser();
        UUID locationId = req.locationId() != null
            ? req.locationId()
            : locationService.resolveContextLocationId();
        locationService.requireLocationAccess(locationId);

        String reg = req.posRegisterCode().trim();
        UUID registerId = req.registerId();
        if (registerId != null) {
            var register = locationService.requireRegister(registerId);
            if (!register.getLocationId().equals(locationId)) {
                throw new BusinessException("Register does not belong to this location");
            }
            reg = register.getName();
            tillSessionRepository.findByTenantIdAndRegisterIdAndStatus(tenantId, registerId, "OPEN")
                .ifPresent(s -> {
                    throw new BusinessException("Register already has an open session");
                });
        } else {
            tillSessionRepository.findByTenantIdAndPosRegisterCodeAndStatus(tenantId, reg, "OPEN")
                .ifPresent(s -> {
                    throw new BusinessException("Till " + reg + " already has an open session");
                });
        }
        UUID tillId = tillIdForRegister(tenantId, reg);

        TillSession session = new TillSession();
        session.setId(UUID.randomUUID());
        session.setTenantId(tenantId);
        session.setTillId(tillId);
        session.setLocationId(locationId);
        session.setRegisterId(registerId);
        session.setPosRegisterCode(reg);
        session.setCashierId(cashierId);
        session.setShiftId(req.shiftId());
        session.setOpeningFloat(req.openingFloat().setScale(2, RoundingMode.HALF_UP));
        session.setStatus("OPEN");
        session.setOpenedAt(Instant.now());
        session.setCreatedAt(Instant.now());

        try {
            tillSessionRepository.save(session);
        } catch (DataIntegrityViolationException e) {
            throw new BusinessException("Till " + reg + " already has an open session");
        }
        return toDto(session);
    }

    @Transactional(readOnly = true)
    public java.util.List<TillSessionDto> listOpenSessionsAtLocation() {
        UUID tenantId = requireTenant();
        UUID locationId = locationService.resolveContextLocationId();
        return tillSessionRepository.findByTenantIdAndLocationIdAndStatus(tenantId, locationId, "OPEN")
            .stream()
            .map(this::toDto)
            .toList();
    }

    @Transactional(readOnly = true)
    public TillSessionDto getCurrentSessionForUser() {
        UUID tenantId = requireTenant();
        UUID cashierId = requireUser();
        return tillSessionRepository.findByTenantIdAndCashierIdAndStatus(tenantId, cashierId, "OPEN")
            .map(this::toDto)
            .orElseThrow(() -> new BusinessException("No open till session"));
    }

    public TillSessionDto closeSession(UUID id, CloseTillSessionRequest req) {
        UUID tenantId = requireTenant();
        TillSession session = tillSessionRepository.findByIdAndTenantId(id, tenantId)
            .orElseThrow(() -> new BusinessException("Till session not found"));
        if (!"OPEN".equals(session.getStatus())) {
            throw new BusinessException("Session is not open");
        }

        BigDecimal closing = req.closingCash().setScale(2, RoundingMode.HALF_UP);
        BigDecimal variance = closing.subtract(session.getOpeningFloat());
        session.setClosingCash(closing);
        session.setVariance(variance);
        session.setNotes(req.notes());
        session.setClosedAt(Instant.now());
        session.setStatus("CLOSED");
        tillSessionRepository.save(session);

        if (variance.abs().compareTo(varianceThreshold) > 0) {
            pushNotificationService.sendToRole(
                tenantId.toString(),
                "ACCOUNTING_CONTROLLER",
                "Till Variance",
                "Till " + session.getPosRegisterCode() + " session variance: "
                    + variance.setScale(2, RoundingMode.HALF_UP).toPlainString() + " FRW",
                Map.of("type", "TILL_VARIANCE", "route", "/till")
            );
        }
        return toDto(session);
    }

    public TillSessionDto suspendSession(UUID id) {
        UUID tenantId = requireTenant();
        TillSession session = tillSessionRepository.findByIdAndTenantId(id, tenantId)
            .orElseThrow(() -> new BusinessException("Till session not found"));
        if (!"OPEN".equals(session.getStatus())) {
            throw new BusinessException("Session is not open");
        }
        session.setStatus("SUSPENDED");
        tillSessionRepository.save(session);
        return toDto(session);
    }

    private TillSessionDto toDto(TillSession s) {
        return new TillSessionDto(
            s.getId(),
            s.getTillId(),
            s.getLocationId(),
            s.getRegisterId(),
            s.getPosRegisterCode(),
            s.getCashierId(),
            s.getShiftId(),
            s.getOpenedAt(),
            s.getClosedAt(),
            s.getOpeningFloat(),
            s.getClosingCash(),
            s.getVariance(),
            s.getStatus(),
            s.getNotes()
        );
    }

    private static UUID tillIdForRegister(UUID tenantId, String registerCode) {
        return UUID.nameUUIDFromBytes(
            ("till:" + tenantId + ":" + registerCode).getBytes(StandardCharsets.UTF_8));
    }

    private UUID requireTenant() {
        if (TenantContext.tenantId() == null) {
            throw new IllegalStateException("Tenant context is required");
        }
        return TenantContext.tenantId();
    }

    private UUID requireUser() {
        if (TenantContext.userId() == null) {
            throw new IllegalStateException("User context is required");
        }
        return TenantContext.userId();
    }
}
