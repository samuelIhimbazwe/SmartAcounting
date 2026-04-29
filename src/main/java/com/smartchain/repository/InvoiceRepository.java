package com.smartchain.repository;
import com.smartchain.entity.Invoice;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
public interface InvoiceRepository extends JpaRepository<Invoice, UUID> {
    List<Invoice> findByStatusAndDueDateBeforeAndDeletedAtIsNull(String status, LocalDate dueDate);
    List<Invoice> findAllByDeletedAtIsNull();
    java.util.Optional<Invoice> findByIdAndDeletedAtIsNull(UUID id);
}
