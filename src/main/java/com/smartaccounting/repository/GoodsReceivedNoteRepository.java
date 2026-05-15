package com.smartaccounting.repository;

import com.smartaccounting.entity.GoodsReceivedNote;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface GoodsReceivedNoteRepository extends JpaRepository<GoodsReceivedNote, UUID> {
    Optional<GoodsReceivedNote> findByIdAndTenantId(UUID id, UUID tenantId);
}
