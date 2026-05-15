package com.smartaccounting.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "smartaccounting.pos")
public class PosProperties {
    /** Location code where retail on-hand stock is held (deducted on sale). */
    private String defaultInventoryLocation = "SHOP";
    /** Logical sink for units sold (paired row in inventory_balances for audit). */
    private String saleSinkLocation = "SOLD";
    /** When false, checkout fails if on-hand quantity is below the sale quantity. */
    private boolean allowNegativeStock = false;
    /** IANA zone id for POS business-day boundaries (till close). */
    private String businessTimeZone = "Africa/Kigali";

    public String getDefaultInventoryLocation() {
        return defaultInventoryLocation;
    }

    public void setDefaultInventoryLocation(String defaultInventoryLocation) {
        this.defaultInventoryLocation = defaultInventoryLocation;
    }

    public String getSaleSinkLocation() {
        return saleSinkLocation;
    }

    public void setSaleSinkLocation(String saleSinkLocation) {
        this.saleSinkLocation = saleSinkLocation;
    }

    public boolean isAllowNegativeStock() {
        return allowNegativeStock;
    }

    public void setAllowNegativeStock(boolean allowNegativeStock) {
        this.allowNegativeStock = allowNegativeStock;
    }

    public String getBusinessTimeZone() {
        return businessTimeZone;
    }

    public void setBusinessTimeZone(String businessTimeZone) {
        this.businessTimeZone = businessTimeZone;
    }
}
