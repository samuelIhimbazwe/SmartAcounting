package com.smartaccounting.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;

import java.io.Serializable;
import java.util.UUID;

@Entity
@Table(name = "user_location_access")
@IdClass(UserLocationAccess.Pk.class)
public class UserLocationAccess {
    @Id private UUID tenantId;
    @Id private UUID userId;
    @Id private UUID locationId;

    public UUID getTenantId() { return tenantId; }
    public void setTenantId(UUID tenantId) { this.tenantId = tenantId; }
    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }
    public UUID getLocationId() { return locationId; }
    public void setLocationId(UUID locationId) { this.locationId = locationId; }

    public static class Pk implements Serializable {
        public UUID tenantId;
        public UUID userId;
        public UUID locationId;
    }
}
