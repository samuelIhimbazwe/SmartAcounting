package com.smartchain.repository;

import com.smartchain.entity.WorkflowRule;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface WorkflowRuleRepository extends JpaRepository<WorkflowRule, UUID> {
}
