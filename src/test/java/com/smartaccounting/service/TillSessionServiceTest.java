package com.smartaccounting.service;

import com.smartaccounting.dto.CloseTillSessionRequest;
import com.smartaccounting.dto.OpenTillSessionRequest;
import com.smartaccounting.entity.TillSession;
import com.smartaccounting.exception.BusinessException;
import com.smartaccounting.repository.TillSessionRepository;
import com.smartaccounting.tenant.TenantContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TillSessionServiceTest {
    @Mock TillSessionRepository tillSessionRepository;
    @Mock PushNotificationService pushNotificationService;
    @Mock LocationService locationService;

    TillSessionService tillSessionService;

    private final UUID tenantId = UUID.randomUUID();
    private final UUID userId = UUID.randomUUID();
    private final UUID locationId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        tillSessionService = new TillSessionService(
            tillSessionRepository,
            pushNotificationService,
            locationService,
            new BigDecimal("5000"));
        TenantContext.set(tenantId, userId);
        when(locationService.resolveContextLocationId()).thenReturn(locationId);
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    @Test
    void openSession_createsOpenSession() {
        when(tillSessionRepository.findByTenantIdAndPosRegisterCodeAndStatus(tenantId, "REG-01", "OPEN"))
            .thenReturn(Optional.empty());
        when(tillSessionRepository.save(any(TillSession.class))).thenAnswer(inv -> inv.getArgument(0));

        var dto = tillSessionService.openSession(
            new OpenTillSessionRequest("REG-01", new BigDecimal("50000"), null, null, null));

        assertThat(dto.posRegisterCode()).isEqualTo("REG-01");
        assertThat(dto.status()).isEqualTo("OPEN");
        verify(tillSessionRepository).save(any(TillSession.class));
        verify(locationService).requireLocationAccess(locationId);
    }

    @Test
    void openSession_rejectsDuplicateOpenRegister() {
        TillSession existing = new TillSession();
        existing.setStatus("OPEN");
        when(tillSessionRepository.findByTenantIdAndPosRegisterCodeAndStatus(tenantId, "REG-01", "OPEN"))
            .thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> tillSessionService.openSession(
            new OpenTillSessionRequest("REG-01", new BigDecimal("1000"), null, null, null)))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("already has an open session");
    }

    @Test
    void closeSession_setsVarianceAndClosedStatus() {
        UUID sessionId = UUID.randomUUID();
        TillSession session = new TillSession();
        session.setId(sessionId);
        session.setTenantId(tenantId);
        session.setPosRegisterCode("REG-01");
        session.setOpeningFloat(new BigDecimal("10000"));
        session.setStatus("OPEN");

        when(tillSessionRepository.findByIdAndTenantId(sessionId, tenantId))
            .thenReturn(Optional.of(session));
        when(tillSessionRepository.save(any(TillSession.class))).thenAnswer(inv -> inv.getArgument(0));

        var dto = tillSessionService.closeSession(
            sessionId,
            new CloseTillSessionRequest(new BigDecimal("9500"), "end of shift"));

        assertThat(dto.status()).isEqualTo("CLOSED");
        assertThat(dto.variance()).isEqualByComparingTo("-500");
    }
}
