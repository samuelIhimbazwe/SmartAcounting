package com.smartchain.repository;
import com.smartchain.entity.PurchaseOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;
public interface PurchaseOrderRepository extends JpaRepository<PurchaseOrder, UUID> {}
