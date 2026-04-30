package com.smartchain.repository;
import com.smartchain.entity.Reconciliation;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;
public interface ReconciliationRepository extends JpaRepository<Reconciliation, UUID> {}
