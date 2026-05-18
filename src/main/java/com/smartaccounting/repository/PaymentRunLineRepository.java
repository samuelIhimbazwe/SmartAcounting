package com.smartaccounting.repository;

import com.smartaccounting.entity.PaymentRunLine;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface PaymentRunLineRepository extends JpaRepository<PaymentRunLine, UUID> {
    List<PaymentRunLine> findByPaymentRunIdAndStatus(UUID paymentRunId, String status);

    List<PaymentRunLine> findByPaymentRunIdAndTenantId(UUID paymentRunId, UUID tenantId);
}
