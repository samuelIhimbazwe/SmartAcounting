package com.smartaccounting.repository;

import com.smartaccounting.entity.ApprovalRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface ApprovalRequestRepository extends JpaRepository<ApprovalRequest, UUID> {
}
