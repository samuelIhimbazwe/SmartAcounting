package com.smartaccounting.repository;

import com.smartaccounting.entity.PosReturnLine;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface PosReturnLineRepository extends JpaRepository<PosReturnLine, UUID> {
    List<PosReturnLine> findByReturnId(UUID returnId);
}
