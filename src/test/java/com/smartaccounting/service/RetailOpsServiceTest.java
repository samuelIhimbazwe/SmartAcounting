package com.smartaccounting.service;

import com.smartaccounting.audit.AuditService;
import com.smartaccounting.config.LabelProperties;
import com.smartaccounting.config.PosProperties;
import com.smartaccounting.dto.BarcodeLabelBatchItemRequest;
import com.smartaccounting.entity.InventoryBatch;
import com.smartaccounting.entity.PosCatalogItem;
import com.smartaccounting.entity.Product;
import com.smartaccounting.repository.InventoryBatchRepository;
import com.smartaccounting.repository.PosCatalogItemRepository;
import com.smartaccounting.repository.PosPaymentTenderRepository;
import com.smartaccounting.repository.PosTillCloseRepository;
import com.smartaccounting.repository.ProductRepository;
import com.smartaccounting.tenant.TenantContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RetailOpsServiceTest {
    @Mock private ProductRepository productRepository;
    @Mock private PosCatalogItemRepository posCatalogItemRepository;
    @Mock private InventoryBatchRepository inventoryBatchRepository;
    @Mock private PosPaymentTenderRepository posPaymentTenderRepository;
    @Mock private PosTillCloseRepository posTillCloseRepository;
    @Mock private CurrencyService currencyService;
    @Mock private AuditService auditService;
    @Mock private PushNotificationService pushNotificationService;

    private RetailOpsService service;
    private final UUID tenant = UUID.fromString("10000000-0000-0000-0000-000000000111");
    private final UUID user = UUID.fromString("20000000-0000-0000-0000-000000000222");

    @BeforeEach
    void setUp() {
        PosProperties posProperties = new PosProperties();
        posProperties.setBusinessTimeZone("Africa/Kigali");
        LabelProperties labelProperties = new LabelProperties();
        labelProperties.setPrinterType("thermal-label");
        service = new RetailOpsService(
            productRepository,
            posCatalogItemRepository,
            inventoryBatchRepository,
            posPaymentTenderRepository,
            posTillCloseRepository,
            currencyService,
            posProperties,
            labelProperties,
            auditService,
            pushNotificationService
        );
        TenantContext.set(tenant, user);
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    @Test
    void productBarcodeLabelAutoGeneratesBarcodeAndIncludesPriceAndExpiry() {
        UUID productId = UUID.fromString("30000000-0000-0000-0000-000000000333");
        Product p = new Product();
        p.setId(productId);
        p.setTenantId(tenant);
        p.setName("Milk 1L");
        p.setCreatedAt(Instant.now());
        when(productRepository.findByIdAndTenantId(productId, tenant)).thenReturn(Optional.of(p));
        when(productRepository.existsByTenantIdAndBarcode(any(), any())).thenReturn(false);
        when(productRepository.save(any(Product.class))).thenAnswer(i -> i.getArgument(0));

        PosCatalogItem catalog = new PosCatalogItem();
        catalog.setUnitPrice(new BigDecimal("1200"));
        catalog.setCurrencyCode("RWF");
        when(posCatalogItemRepository.findFirstByTenantIdAndProductIdAndActiveTrueOrderByCreatedAtDesc(tenant, productId))
            .thenReturn(Optional.of(catalog));
        InventoryBatch batch = new InventoryBatch();
        batch.setExpiryDate(LocalDate.of(2026, 12, 31));
        when(inventoryBatchRepository.findFirstByTenantIdAndProductIdAndExpiryDateIsNotNullOrderByExpiryDateAscCreatedAtAsc(tenant, productId))
            .thenReturn(Optional.of(batch));

        var out = service.productBarcodeLabel(productId);

        assertThat((String) out.get("barcode")).startsWith("SC");
        assertThat(out.get("priceFrw")).isEqualTo(new BigDecimal("1200.00"));
        assertThat(out.get("expiryDate")).isEqualTo("2026-12-31");
        assertThat((String) out.get("barcodePngBase64")).isNotBlank();
    }

    @Test
    void productBarcodeLabelBatchReturnsRequestedQuantities() {
        UUID productId = UUID.fromString("30000000-0000-0000-0000-000000000334");
        Product p = new Product();
        p.setId(productId);
        p.setTenantId(tenant);
        p.setName("Sugar");
        p.setBarcode("INT-123");
        when(productRepository.findByIdAndTenantId(productId, tenant)).thenReturn(Optional.of(p));
        when(posCatalogItemRepository.findFirstByTenantIdAndProductIdAndActiveTrueOrderByCreatedAtDesc(tenant, productId))
            .thenReturn(Optional.empty());
        when(inventoryBatchRepository.findFirstByTenantIdAndProductIdAndExpiryDateIsNotNullOrderByExpiryDateAscCreatedAtAsc(tenant, productId))
            .thenReturn(Optional.empty());

        var out = service.productBarcodeLabelBatch(List.of(new BarcodeLabelBatchItemRequest(productId, 4)));

        assertThat(out.get("totalLabels")).isEqualTo(4);
        @SuppressWarnings("unchecked")
        List<java.util.Map<String, Object>> jobs = (List<java.util.Map<String, Object>>) out.get("jobs");
        assertThat(jobs).hasSize(1);
        assertThat(jobs.get(0).get("quantity")).isEqualTo(4);
        assertThat(jobs.get(0).get("barcode")).isEqualTo("INT-123");
    }
}
