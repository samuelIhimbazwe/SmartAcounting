package com.smartaccounting.repository;
import com.smartaccounting.entity.TenantPlugin;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;
public interface TenantPluginRepository extends JpaRepository<TenantPlugin, UUID> {}
