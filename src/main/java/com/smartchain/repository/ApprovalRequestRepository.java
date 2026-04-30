package com.smartchain.repository;

import com.smartchain.entity.ApprovalRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface ApprovalRequestRepository extends JpaRepository<ApprovalRequest, UUID> {
}
