package com.smartchain.repository;
import com.smartchain.entity.TaxProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;
public interface TaxProfileRepository extends JpaRepository<TaxProfile, UUID> {
    Optional<TaxProfile> findFirstByCountryCodeAndTaxCodeAndActiveTrue(String countryCode, String taxCode);
}
