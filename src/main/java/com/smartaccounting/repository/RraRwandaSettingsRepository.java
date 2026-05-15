package com.smartaccounting.repository;

import com.smartaccounting.entity.RraRwandaSettings;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface RraRwandaSettingsRepository extends JpaRepository<RraRwandaSettings, UUID> {
}
