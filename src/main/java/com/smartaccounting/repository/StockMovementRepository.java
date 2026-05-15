package com.smartaccounting.repository;

import com.smartaccounting.entity.StockMovement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public interface StockMovementRepository extends JpaRepository<StockMovement, UUID> {
    @Query("""
        select coalesce(sum(s.quantity), 0) from StockMovement s
        where s.tenantId = :tenantId
          and s.productId = :productId
          and s.movementType = 'MOVE'
          and s.fromLocationCode = :fromLocation
          and s.toLocationCode = :toLocation
          and s.createdAt >= :start
        """)
    BigDecimal sumMovedQuantitySince(@Param("tenantId") UUID tenantId,
                                     @Param("productId") UUID productId,
                                     @Param("fromLocation") String fromLocation,
                                     @Param("toLocation") String toLocation,
                                     @Param("start") Instant start);

    @Query("""
        select max(s.createdAt) from StockMovement s
        where s.tenantId = :tenantId
          and s.productId = :productId
          and s.movementType = 'RECEIVE'
          and s.toLocationCode = :location
        """)
    Instant findLastRestockedAt(@Param("tenantId") UUID tenantId,
                                @Param("productId") UUID productId,
                                @Param("location") String location);
}
