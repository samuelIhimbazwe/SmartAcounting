package com.smartaccounting.repository;
import com.smartaccounting.entity.Reconciliation;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;
public interface ReconciliationRepository extends JpaRepository<Reconciliation, UUID> {}
