package com.smartchain.repository;
import com.smartchain.entity.AnomalyCase;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;
public interface AnomalyCaseRepository extends JpaRepository<AnomalyCase, UUID> {
    List<AnomalyCase> findTop20ByAffectedRoleAndStatusOrderByCreatedAtDesc(String affectedRole, String status);
    List<AnomalyCase> findByAffectedRoleAndStatusOrderByCreatedAtDesc(String affectedRole, String status, Pageable pageable);
}
