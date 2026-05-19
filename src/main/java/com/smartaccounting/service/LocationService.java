package com.smartaccounting.service;

import com.smartaccounting.entity.Location;
import com.smartaccounting.entity.Register;
import com.smartaccounting.entity.UserLocationAccess;
import com.smartaccounting.exception.BusinessException;
import com.smartaccounting.repository.LocationRepository;
import com.smartaccounting.repository.RegisterRepository;
import com.smartaccounting.repository.UserLocationAccessRepository;
import com.smartaccounting.tenant.LocationContext;
import com.smartaccounting.tenant.TenantContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@Transactional
public class LocationService {
    private final LocationRepository locationRepository;
    private final RegisterRepository registerRepository;
    private final UserLocationAccessRepository accessRepository;

    public LocationService(
        LocationRepository locationRepository,
        RegisterRepository registerRepository,
        UserLocationAccessRepository accessRepository
    ) {
        this.locationRepository = locationRepository;
        this.registerRepository = registerRepository;
        this.accessRepository = accessRepository;
    }

    public List<Map<String, Object>> listAccessibleLocations() {
        UUID tenantId = requireTenant();
        UUID userId = requireUser();
        ensureDefaultLocation(tenantId, userId);
        List<UserLocationAccess> access =
            accessRepository.findByTenantIdAndUserId(tenantId, userId);
        if (access.isEmpty()) {
            return locationRepository.findByTenantIdAndActiveTrueOrderByName(tenantId).stream()
                .map(this::toMap)
                .toList();
        }
        return access.stream()
            .map(a -> locationRepository.findByIdAndTenantId(a.getLocationId(), tenantId))
            .flatMap(java.util.Optional::stream)
            .filter(Location::isActive)
            .map(this::toMap)
            .toList();
    }

    public List<Map<String, Object>> listRegisters(UUID locationId) {
        UUID tenantId = requireTenant();
        requireLocationAccess(locationId);
        return registerRepository
            .findByTenantIdAndLocationIdAndActiveTrueOrderByName(tenantId, locationId)
            .stream()
            .map(this::registerToMap)
            .toList();
    }

    public Location requireLocation(UUID locationId) {
        return locationRepository.findByIdAndTenantId(locationId, requireTenant())
            .orElseThrow(() -> new BusinessException("Location not found"));
    }

    public Register requireRegister(UUID registerId) {
        return registerRepository.findByIdAndTenantId(registerId, requireTenant())
            .orElseThrow(() -> new BusinessException("Register not found"));
    }

    public void requireLocationAccess(UUID locationId) {
        UUID tenantId = requireTenant();
        UUID userId = requireUser();
        locationRepository.findByIdAndTenantId(locationId, tenantId)
            .orElseThrow(() -> new BusinessException("Location not found"));
        List<UserLocationAccess> access =
            accessRepository.findByTenantIdAndUserId(tenantId, userId);
        if (access.isEmpty()) {
            return;
        }
        boolean ok = access.stream().anyMatch(a -> a.getLocationId().equals(locationId));
        if (!ok) {
            throw new BusinessException("No access to this location");
        }
    }

    public Location ensureDefaultLocation(UUID tenantId, UUID userId) {
        return locationRepository.findByTenantIdAndLocationCode(tenantId, "SHOP")
            .orElseGet(() -> {
                Location loc = new Location();
                loc.setId(UUID.randomUUID());
                loc.setTenantId(tenantId);
                loc.setName("Main shop");
                loc.setLocationCode("SHOP");
                loc.setCurrencyDefault("FRW");
                loc.setTimezone("Africa/Kigali");
                loc.setActive(true);
                loc.setCreatedAt(Instant.now());
                locationRepository.save(loc);

                Register reg = new Register();
                reg.setId(UUID.randomUUID());
                reg.setTenantId(tenantId);
                reg.setLocationId(loc.getId());
                reg.setName("REG-01");
                reg.setActive(true);
                reg.setCreatedAt(Instant.now());
                registerRepository.save(reg);

                UserLocationAccess a = new UserLocationAccess();
                a.setTenantId(tenantId);
                a.setUserId(userId);
                a.setLocationId(loc.getId());
                accessRepository.save(a);
                return loc;
            });
    }

    public UUID resolveContextLocationId() {
        UUID fromHeader = LocationContext.locationId();
        if (fromHeader != null) {
            requireLocationAccess(fromHeader);
            return fromHeader;
        }
        UUID tenantId = requireTenant();
        UUID userId = requireUser();
        Location def = ensureDefaultLocation(tenantId, userId);
        return def.getId();
    }

    private Map<String, Object> toMap(Location l) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", l.getId());
        m.put("name", l.getName());
        m.put("address", l.getAddress());
        m.put("locationCode", l.getLocationCode());
        m.put("currencyDefault", l.getCurrencyDefault());
        m.put("taxConfigId", l.getTaxConfigId());
        m.put("timezone", l.getTimezone());
        m.put("active", l.isActive());
        return m;
    }

    private Map<String, Object> registerToMap(Register r) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", r.getId());
        m.put("locationId", r.getLocationId());
        m.put("name", r.getName());
        m.put("hardwareId", r.getHardwareId());
        m.put("active", r.isActive());
        return m;
    }

    private UUID requireTenant() {
        if (TenantContext.tenantId() == null) {
            throw new IllegalStateException("Tenant context required");
        }
        return TenantContext.tenantId();
    }

    private UUID requireUser() {
        if (TenantContext.userId() == null) {
            throw new IllegalStateException("User context required");
        }
        return TenantContext.userId();
    }
}
