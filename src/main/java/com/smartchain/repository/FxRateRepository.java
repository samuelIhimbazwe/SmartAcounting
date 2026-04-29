package com.smartchain.repository;
import com.smartchain.entity.FxRate;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;
public interface FxRateRepository extends JpaRepository<FxRate, UUID> {}
