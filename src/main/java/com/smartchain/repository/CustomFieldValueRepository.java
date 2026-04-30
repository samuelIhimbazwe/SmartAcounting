package com.smartchain.repository;
import com.smartchain.entity.CustomFieldValue;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;
public interface CustomFieldValueRepository extends JpaRepository<CustomFieldValue, UUID> {
    List<CustomFieldValue> findByEntityTypeAndEntityId(String entityType, UUID entityId);
}
