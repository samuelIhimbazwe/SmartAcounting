package com.smartchain.repository;
import com.smartchain.entity.SupplierBill;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
public interface SupplierBillRepository extends JpaRepository<SupplierBill, UUID> {
    List<SupplierBill> findByStatusAndDueDateBeforeAndDeletedAtIsNull(String status, LocalDate dueDate);
    List<SupplierBill> findAllByDeletedAtIsNull();
    java.util.Optional<SupplierBill> findByIdAndDeletedAtIsNull(UUID id);
}
