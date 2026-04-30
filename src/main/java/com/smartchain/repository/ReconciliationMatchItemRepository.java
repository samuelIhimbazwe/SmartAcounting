package com.smartchain.repository;
import com.smartchain.entity.ReconciliationMatchItem;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;
public interface ReconciliationMatchItemRepository extends JpaRepository<ReconciliationMatchItem, UUID> {
    List<ReconciliationMatchItem> findTop100ByMatchedFalseOrderByCreatedAtAsc();
    List<ReconciliationMatchItem> findByMatchedFalseOrderByCreatedAtAsc(Pageable pageable);
}
