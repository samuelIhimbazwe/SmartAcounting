package com.smartchain.repository;
import com.smartchain.entity.TenantPlugin;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;
public interface TenantPluginRepository extends JpaRepository<TenantPlugin, UUID> {}
