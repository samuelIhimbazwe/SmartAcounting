package com.smartchain.config;

import com.smartchain.tenant.TenantContext;
import jakarta.persistence.EntityManager;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.UUID;

@Aspect
@Component
public class TenantDbSessionAspect {
    private final EntityManager entityManager;

    public TenantDbSessionAspect(EntityManager entityManager) {
        this.entityManager = entityManager;
    }

    @Before("@annotation(org.springframework.transaction.annotation.Transactional)")
    public void setTenantContextForTransaction() {
        if (!TransactionSynchronizationManager.isActualTransactionActive()) {
            return;
        }
        UUID tenantId = TenantContext.tenantId();
        if (tenantId == null) {
            return;
        }
        // Use transaction-local scope so tenant context is bound to the current DB transaction only.
        entityManager.createNativeQuery("select set_config('app.tenant_id', :tenantId, true)")
            .setParameter("tenantId", tenantId.toString())
            .getSingleResult();
    }
}
