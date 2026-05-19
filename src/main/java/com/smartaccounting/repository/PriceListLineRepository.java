package com.smartaccounting.repository;

import com.smartaccounting.entity.PriceListLine;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PriceListLineRepository extends JpaRepository<PriceListLine, UUID> {
    List<PriceListLine> findByPriceListId(UUID priceListId);

    Optional<PriceListLine> findFirstByPriceListIdAndProductIdAndVariantId(
        UUID priceListId, UUID productId, UUID variantId);

    Optional<PriceListLine> findFirstByPriceListIdAndProductIdAndVariantIdIsNull(
        UUID priceListId, UUID productId);
}
