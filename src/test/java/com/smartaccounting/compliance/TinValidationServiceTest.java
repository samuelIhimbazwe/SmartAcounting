package com.smartaccounting.compliance;

import com.smartaccounting.compliance.rwanda.RraHttpGateway;
import com.smartaccounting.compliance.rwanda.RwandaComplianceProperties;
import com.smartaccounting.dto.TinValidationResponse;
import com.smartaccounting.entity.FinanceCustomer;
import com.smartaccounting.repository.EbmConfigRepository;
import com.smartaccounting.repository.FinanceCustomerRepository;
import com.smartaccounting.repository.RraRwandaSettingsRepository;
import com.smartaccounting.tenant.TenantContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TinValidationServiceTest {
    private static final UUID TENANT_ID = UUID.fromString("11111111-1111-4111-8111-111111111111");

    @Mock
    private FinanceCustomerRepository customerRepository;
    @Mock
    private EbmConfigRepository ebmConfigRepository;
    @Mock
    private RraRwandaSettingsRepository rwandaSettingsRepository;
    @Mock
    private RraHttpGateway rraHttpGateway;
    @Mock
    private RwandaComplianceProperties rwandaProperties;

    @Spy
    @InjectMocks
    private TinValidationService service;

    @BeforeEach
    void setTenant() {
        TenantContext.set(TENANT_ID, UUID.randomUUID());
    }

    @AfterEach
    void clearTenant() {
        TenantContext.clear();
    }

    private void noLocalMatch() {
        when(customerRepository.findFirstByTenantIdAndTinNumberAndDeletedAtIsNull(eq(TENANT_ID), any()))
            .thenReturn(Optional.empty());
        when(ebmConfigRepository.findByTenantId(TENANT_ID)).thenReturn(Optional.empty());
        when(rwandaSettingsRepository.findById(TENANT_ID)).thenReturn(Optional.empty());
    }

    @Test
    void rejectsMalformedTinWithoutLookup() {
        TinValidationResponse out = service.validate("12");

        assertThat(out.valid()).isFalse();
        assertThat(out.registered()).isFalse();
        assertThat(out.error()).isEqualTo("Invalid TIN format");
        verify(customerRepository, never()).findFirstByTenantIdAndTinNumberAndDeletedAtIsNull(any(), any());
    }

    @Test
    void returnsCustomerNameWhenTinFoundLocally() {
        FinanceCustomer customer = new FinanceCustomer();
        customer.setCustomerName("Kigali Retail Ltd");
        when(customerRepository.findFirstByTenantIdAndTinNumberAndDeletedAtIsNull(TENANT_ID, "123456789"))
            .thenReturn(Optional.of(customer));

        TinValidationResponse out = service.validate("123456789");

        assertThat(out.valid()).isTrue();
        assertThat(out.registered()).isTrue();
        assertThat(out.name()).isEqualTo("Kigali Retail Ltd");
        verify(rraHttpGateway, never()).validateTin(any(), any());
    }

    @Test
    void returnsPermissiveOkWhenRraNotLive() {
        noLocalMatch();
        doReturn(false).when(service).rraIntegrationLive();

        TinValidationResponse out = service.validate("987654321");

        assertThat(out.valid()).isTrue();
        assertThat(out.registered()).isTrue();
        verify(rraHttpGateway, never()).validateTin(any(), any());
    }

    @Test
    void returnsInvalidWhenRraReportsNotRegistered() {
        noLocalMatch();
        doReturn(true).when(service).rraIntegrationLive();
        when(rraHttpGateway.validateTin(rwandaProperties, "987654321"))
            .thenReturn(Map.of("valid", false, "error", "Unknown TIN"));

        TinValidationResponse out = service.validate("987654321");

        assertThat(out.valid()).isFalse();
        assertThat(out.registered()).isFalse();
        assertThat(out.error()).isEqualTo("Unknown TIN");
    }

    @Test
    void returnsNameWhenRraReportsValid() {
        noLocalMatch();
        doReturn(true).when(service).rraIntegrationLive();
        when(rraHttpGateway.validateTin(rwandaProperties, "987654321"))
            .thenReturn(Map.of("valid", true, "name", "RRA Taxpayer"));

        TinValidationResponse out = service.validate("987654321");

        assertThat(out.valid()).isTrue();
        assertThat(out.registered()).isTrue();
        assertThat(out.name()).isEqualTo("RRA Taxpayer");
    }
}
