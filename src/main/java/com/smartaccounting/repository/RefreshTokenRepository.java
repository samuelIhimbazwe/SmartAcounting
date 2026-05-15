package com.smartaccounting.repository;

import com.smartaccounting.entity.RefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {
    Optional<RefreshToken> findByTokenHash(String tokenHash);
    int deleteByExpiresAtBefore(Instant cutoff);
    @Modifying
    @Query("update RefreshToken t set t.used = true, t.usedAt = :usedAt, t.revoked = true " +
        "where t.tokenHash = :hash and t.used = false and t.revoked = false and t.expiresAt > :now")
    int consumeAtomic(@Param("hash") String hash, @Param("usedAt") Instant usedAt, @Param("now") Instant now);

    @Query("select t from RefreshToken t where t.tokenHash = :hash")
    Optional<RefreshToken> findAnyByTokenHash(@Param("hash") String hash);

    @Modifying
    @Query("delete from RefreshToken t where t.expiresAt < :now or (t.used = true and t.usedAt < :cutoff)")
    int cleanup(@Param("now") Instant now, @Param("cutoff") Instant cutoff);

    @Modifying
    @Query("update RefreshToken t set t.revoked = true, t.used = true, t.usedAt = :now where t.tenantId = :tenantId and t.userId = :userId and t.revoked = false")
    int revokeAllActiveForUser(@Param("tenantId") UUID tenantId, @Param("userId") UUID userId, @Param("now") Instant now);
}
