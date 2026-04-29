package com.smartchain.repository;
import com.smartchain.entity.PaymentApplication;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;
public interface PaymentApplicationRepository extends JpaRepository<PaymentApplication, UUID> {
    List<PaymentApplication> findByTargetTypeAndTargetId(String targetType, UUID targetId);
    List<PaymentApplication> findByPaymentId(UUID paymentId);
}
