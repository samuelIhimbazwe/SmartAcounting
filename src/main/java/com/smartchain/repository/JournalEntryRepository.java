package com.smartchain.repository;

import com.smartchain.entity.JournalEntry;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface JournalEntryRepository extends JpaRepository<JournalEntry, UUID> {
    Optional<JournalEntry> findByIdAndDeletedAtIsNull(UUID id);
}
