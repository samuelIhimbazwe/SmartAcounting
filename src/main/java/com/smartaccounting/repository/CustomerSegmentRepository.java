package com.smartaccounting.repository;

import com.smartaccounting.entity.CustomerSegment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CustomerSegmentRepository extends JpaRepository<CustomerSegment, UUID> {
    Optional<CustomerSegment> findByTenantIdAndCustomerName(UUID tenantId, String customerName);

    List<CustomerSegment> findByTenantIdAndSegment(UUID tenantId, String segment);

    Page<CustomerSegment> findByTenantIdAndSegment(UUID tenantId, String segment, Pageable pageable);

    @Query("""
        select c from CustomerSegment c
        where c.tenantId = :tenantId
          and c.phone is not null
          and trim(c.phone) <> ''
        """)
    List<CustomerSegment> findByTenantIdAndPhoneIsNotNull(@Param("tenantId") UUID tenantId);

    long countByTenantIdAndSegment(UUID tenantId, String segment);
}
