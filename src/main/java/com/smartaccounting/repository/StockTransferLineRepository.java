package com.smartaccounting.repository;

import com.smartaccounting.entity.StockTransferLine;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface StockTransferLineRepository extends JpaRepository<StockTransferLine, UUID> {
    List<StockTransferLine> findByTransferId(UUID transferId);
}
