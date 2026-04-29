package com.smartchain.config;

import com.smartchain.tenant.TenantContext;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.UUID;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TenantDbSessionAspectTest {

    @Mock
    private EntityManager entityManager;
    @Mock
    private Query query;

    @AfterEach
    void tearDown() {
        TenantContext.clear();
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.clearSynchronization();
        }
    }

    @Test
    void setsTenantConfigWhenTransactionAndTenantExist() {
        TenantDbSessionAspect aspect = new TenantDbSessionAspect(entityManager);
        TenantContext.set(UUID.randomUUID(), UUID.randomUUID());
        TransactionSynchronizationManager.initSynchronization();

        when(entityManager.createNativeQuery(anyString())).thenReturn(query);
        when(query.setParameter(anyString(), anyString())).thenReturn(query);
        when(query.getSingleResult()).thenReturn("ok");

        aspect.setTenantContextForTransaction();

        verify(entityManager).createNativeQuery("select set_config('app.tenant_id', :tenantId, true)");
        verify(query).setParameter(anyString(), anyString());
        verify(query).getSingleResult();
    }

    @Test
    void skipsWhenNoTransaction() {
        TenantDbSessionAspect aspect = new TenantDbSessionAspect(entityManager);
        TenantContext.set(UUID.randomUUID(), UUID.randomUUID());

        aspect.setTenantContextForTransaction();

        verify(entityManager, never()).createNativeQuery(anyString());
    }
}
