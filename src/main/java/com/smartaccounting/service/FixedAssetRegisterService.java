package com.smartaccounting.service;

import com.smartaccounting.dto.CreateJournalEntryRequest;
import com.smartaccounting.dto.DepreciationScheduleLine;
import com.smartaccounting.dto.DisposeAssetRequest;
import com.smartaccounting.dto.FixedAssetRequest;
import com.smartaccounting.entity.FixedAssetRegister;
import com.smartaccounting.repository.FixedAssetRegisterRepository;
import com.smartaccounting.tenant.TenantContext;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class FixedAssetRegisterService {
    private final FixedAssetRegisterRepository fixedAssetRegisterRepository;
    private final FinanceService financeService;
    private final TenantService tenantService;

    public FixedAssetRegisterService(FixedAssetRegisterRepository fixedAssetRegisterRepository,
                                     FinanceService financeService,
                                     TenantService tenantService) {
        this.fixedAssetRegisterRepository = fixedAssetRegisterRepository;
        this.financeService = financeService;
        this.tenantService = tenantService;
    }

    public FixedAssetRegister create(FixedAssetRequest request) {
        UUID tenantId = requireTenant();
        FixedAssetRegister asset = new FixedAssetRegister();
        UUID id = UUID.randomUUID();
        asset.setId(id);
        asset.setTenantId(tenantId);
        asset.setAssetCode(request.assetCode() != null && !request.assetCode().isBlank()
            ? request.assetCode()
            : "FA-" + id.toString().replace("-", ""));
        asset.setAssetName(request.assetName());
        asset.setCategory(request.category());
        asset.setLocation(request.location());
        asset.setPurchaseDate(request.purchaseDate());
        asset.setPurchaseCost(request.purchaseCost());
        asset.setAcquisitionDate(request.purchaseDate());
        asset.setAcquisitionCost(request.purchaseCost());
        asset.setUsefulLifeMonths(request.usefulLifeMonths());
        BigDecimal salvage = request.salvageValue() != null ? request.salvageValue() : BigDecimal.ZERO;
        asset.setSalvageValue(salvage);
        asset.setResidualValue(salvage);
        asset.setDepreciationMethod(
            request.depreciationMethod() != null ? request.depreciationMethod() : "STRAIGHT_LINE");
        asset.setAccumulatedDepreciation(BigDecimal.ZERO);
        asset.setNetBookValue(request.purchaseCost());
        asset.setStatus("ACTIVE");
        asset.setCurrencyCode(request.currencyCode() != null ? request.currencyCode() : "RWF");
        asset.setCreatedAt(Instant.now());
        return fixedAssetRegisterRepository.save(asset);
    }

    @Transactional(readOnly = true)
    public Page<FixedAssetRegister> list(String status, Pageable pageable) {
        UUID tenantId = requireTenant();
        if (status != null && !status.isBlank()) {
            return fixedAssetRegisterRepository.findByTenantIdAndStatus(tenantId, status.toUpperCase(), pageable);
        }
        return fixedAssetRegisterRepository.findByTenantIdOrderByCreatedAtDesc(tenantId, pageable);
    }

    @Transactional(readOnly = true)
    public List<DepreciationScheduleLine> depreciationSchedule(UUID assetId) {
        FixedAssetRegister asset = getAsset(assetId);
        BigDecimal cost = effectiveCost(asset);
        BigDecimal salvage = effectiveSalvage(asset);
        int lifeMonths = asset.getUsefulLifeMonths() != null ? asset.getUsefulLifeMonths() : 0;
        LocalDate start = effectivePurchaseDate(asset);
        BigDecimal depreciable = cost.subtract(salvage);
        BigDecimal monthly = lifeMonths <= 0
            ? BigDecimal.ZERO
            : depreciable.divide(BigDecimal.valueOf(lifeMonths), 4, RoundingMode.HALF_UP);

        List<DepreciationScheduleLine> lines = new ArrayList<>();
        BigDecimal accumulated = BigDecimal.ZERO;
        for (int i = 1; i <= lifeMonths; i++) {
            accumulated = accumulated.add(monthly);
            BigDecimal nbv = cost.subtract(accumulated).max(salvage);
            lines.add(new DepreciationScheduleLine(
                i,
                start.plusMonths(i - 1L),
                monthly,
                accumulated,
                nbv
            ));
        }
        return lines;
    }

    public FixedAssetRegister dispose(UUID assetId, DisposeAssetRequest request) {
        FixedAssetRegister asset = getAsset(assetId);
        BigDecimal nbv = asset.getNetBookValue() != null
            ? asset.getNetBookValue()
            : effectiveCost(asset).subtract(nullToZero(asset.getAccumulatedDepreciation()));
        BigDecimal gainLoss = request.disposalProceeds().subtract(nbv);
        String noteSuffix = request.notes() != null && !request.notes().isBlank()
            ? " — " + request.notes().trim() : "";

        financeService.createJournalEntry(new CreateJournalEntryRequest(
            request.disposedDate(),
            "Asset disposal: " + asset.getAssetName() + noteSuffix,
            gainLoss.signum() >= 0 ? "CASH" : "LOSS_ON_DISPOSAL",
            gainLoss.signum() >= 0 ? "GAIN_ON_DISPOSAL" : "FIXED_ASSET",
            request.disposalProceeds().abs().max(nbv),
            asset.getCurrencyCode()
        ));

        asset.setDisposedDate(request.disposedDate());
        asset.setDisposalProceeds(request.disposalProceeds());
        asset.setDisposalGainLoss(gainLoss);
        asset.setStatus("DISPOSED");
        asset.setNetBookValue(BigDecimal.ZERO);
        return fixedAssetRegisterRepository.save(asset);
    }

    public FixedAssetRegister depreciateAsset(UUID assetId) {
        FixedAssetRegister asset = getAsset(assetId);
        if (!"ACTIVE".equals(asset.getStatus())) {
            throw new IllegalArgumentException("Only active assets can be depreciated");
        }
        BigDecimal monthly = calculateMonthlyDepreciation(asset);
        if (monthly.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("No depreciation due for this asset");
        }
        financeService.createJournalEntry(new CreateJournalEntryRequest(
            LocalDate.now(),
            "Depreciation: " + asset.getAssetName(),
            "DEPRECIATION_EXPENSE",
            "ACCUMULATED_DEPRECIATION",
            monthly,
            asset.getCurrencyCode()
        ));
        BigDecimal accumulated = nullToZero(asset.getAccumulatedDepreciation()).add(monthly);
        asset.setAccumulatedDepreciation(accumulated);
        BigDecimal nbv = effectiveCost(asset).subtract(accumulated);
        asset.setNetBookValue(nbv);
        if (nbv.compareTo(effectiveSalvage(asset)) <= 0) {
            asset.setStatus("FULLY_DEPRECIATED");
            asset.setNetBookValue(effectiveSalvage(asset));
        }
        return fixedAssetRegisterRepository.save(asset);
    }

    @Scheduled(cron = "0 0 22 L * ?", zone = "Africa/Kigali")
    public void postMonthlyDepreciation() {
        for (String tenantId : tenantService.findAllActiveTenantIds()) {
            try {
                TenantContext.set(UUID.fromString(tenantId), null);
                postDepreciationForTenant(UUID.fromString(tenantId));
            } catch (Exception ex) {
                // continue other tenants
            } finally {
                TenantContext.clear();
            }
        }
    }

    public void postDepreciationForTenant(UUID tenantId) {
        List<FixedAssetRegister> activeAssets = fixedAssetRegisterRepository
            .findByTenantIdAndStatus(tenantId, "ACTIVE");
        for (FixedAssetRegister asset : activeAssets) {
            BigDecimal monthly = calculateMonthlyDepreciation(asset);
            if (monthly.compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }
            financeService.createJournalEntry(new CreateJournalEntryRequest(
                LocalDate.now(),
                "Depreciation: " + asset.getAssetName(),
                "DEPRECIATION_EXPENSE",
                "ACCUMULATED_DEPRECIATION",
                monthly,
                asset.getCurrencyCode()
            ));

            BigDecimal accumulated = nullToZero(asset.getAccumulatedDepreciation()).add(monthly);
            asset.setAccumulatedDepreciation(accumulated);
            BigDecimal nbv = effectiveCost(asset).subtract(accumulated);
            asset.setNetBookValue(nbv);

            if (nbv.compareTo(effectiveSalvage(asset)) <= 0) {
                asset.setStatus("FULLY_DEPRECIATED");
                asset.setNetBookValue(effectiveSalvage(asset));
            }
            fixedAssetRegisterRepository.save(asset);
        }
    }

    private BigDecimal calculateMonthlyDepreciation(FixedAssetRegister asset) {
        BigDecimal depreciableAmount = effectiveCost(asset)
            .subtract(effectiveSalvage(asset))
            .subtract(nullToZero(asset.getAccumulatedDepreciation()));
        if (depreciableAmount.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }
        int remainingMonths = asset.getUsefulLifeMonths() - getMonthsDepreciated(asset);
        if (remainingMonths <= 0) {
            return BigDecimal.ZERO;
        }
        return depreciableAmount.divide(BigDecimal.valueOf(remainingMonths), 4, RoundingMode.HALF_UP);
    }

    private int getMonthsDepreciated(FixedAssetRegister asset) {
        LocalDate start = effectivePurchaseDate(asset);
        if (start == null) {
            return 0;
        }
        return (int) Math.min(
            ChronoUnit.MONTHS.between(start, LocalDate.now()),
            asset.getUsefulLifeMonths() != null ? asset.getUsefulLifeMonths() : 0
        );
    }

    private FixedAssetRegister getAsset(UUID assetId) {
        return fixedAssetRegisterRepository.findByIdAndTenantId(assetId, requireTenant())
            .orElseThrow(() -> new IllegalArgumentException("Asset not found"));
    }

    private BigDecimal effectiveCost(FixedAssetRegister asset) {
        if (asset.getPurchaseCost() != null) {
            return asset.getPurchaseCost();
        }
        return asset.getAcquisitionCost() != null ? asset.getAcquisitionCost() : BigDecimal.ZERO;
    }

    private LocalDate effectivePurchaseDate(FixedAssetRegister asset) {
        if (asset.getPurchaseDate() != null) {
            return asset.getPurchaseDate();
        }
        return asset.getAcquisitionDate();
    }

    private BigDecimal effectiveSalvage(FixedAssetRegister asset) {
        if (asset.getSalvageValue() != null) {
            return asset.getSalvageValue();
        }
        return asset.getResidualValue() != null ? asset.getResidualValue() : BigDecimal.ZERO;
    }

    private BigDecimal nullToZero(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    private UUID requireTenant() {
        if (TenantContext.tenantId() == null) {
            throw new IllegalStateException("Tenant context is required");
        }
        return TenantContext.tenantId();
    }
}
