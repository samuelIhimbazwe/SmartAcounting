package com.smartaccounting.repository;

import com.smartaccounting.entity.PromotionProduct;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface PromotionProductRepository extends JpaRepository<PromotionProduct, UUID> {
    List<PromotionProduct> findByPromotionId(UUID promotionId);
}
