package com.smartaccounting.repository;

import com.smartaccounting.entity.PayeFilingLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface PayeFilingLogRepository extends JpaRepository<PayeFilingLog, UUID> {
}
