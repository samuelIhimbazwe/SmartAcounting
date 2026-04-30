package com.smartchain.repository;

import com.smartchain.entity.ServiceAccountApiKey;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ServiceAccountApiKeyRepository extends JpaRepository<ServiceAccountApiKey, UUID> {
    List<ServiceAccountApiKey> findByTenantIdOrderByCreatedAtDesc(UUID tenantId);
    List<ServiceAccountApiKey> findByKeyPrefixAndActiveTrue(String keyPrefix);
    Optional<ServiceAccountApiKey> findByIdAndTenantId(UUID id, UUID tenantId);
}
