package com.smartchain.repository;
import com.smartchain.entity.ScenarioTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;
public interface ScenarioTemplateRepository extends JpaRepository<ScenarioTemplate, UUID> {
    List<ScenarioTemplate> findByRoleOrderByCreatedAtDesc(String role);
}
