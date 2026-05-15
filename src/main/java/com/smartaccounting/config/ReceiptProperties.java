package com.smartaccounting.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "smartaccounting.receipt")
public class ReceiptProperties {
    private String storeName = "SMARTCHAIN";
    private String storeAddress = "";
    private String footerText = "Thank you.";
    private String printerType = "thermal";

    public String getStoreName() { return storeName; }
    public void setStoreName(String storeName) { this.storeName = storeName; }
    public String getStoreAddress() { return storeAddress; }
    public void setStoreAddress(String storeAddress) { this.storeAddress = storeAddress; }
    public String getFooterText() { return footerText; }
    public void setFooterText(String footerText) { this.footerText = footerText; }
    public String getPrinterType() { return printerType; }
    public void setPrinterType(String printerType) { this.printerType = printerType; }
}
