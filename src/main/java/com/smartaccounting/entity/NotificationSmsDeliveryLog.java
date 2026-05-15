package com.smartaccounting.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "notification_sms_delivery_log")
public class NotificationSmsDeliveryLog {
    @Id private UUID id;
    private UUID tenantId;
    private UUID notificationEventId;
    private String eventType;
    private String recipientPhone;
    private String status;
    private Integer responseCode;
    private String errorMessage;
    private Instant createdAt;
    public UUID getId() { return id; } public void setId(UUID id) { this.id = id; }
    public UUID getTenantId() { return tenantId; } public void setTenantId(UUID tenantId) { this.tenantId = tenantId; }
    public UUID getNotificationEventId() { return notificationEventId; } public void setNotificationEventId(UUID notificationEventId) { this.notificationEventId = notificationEventId; }
    public String getEventType() { return eventType; } public void setEventType(String eventType) { this.eventType = eventType; }
    public String getRecipientPhone() { return recipientPhone; } public void setRecipientPhone(String recipientPhone) { this.recipientPhone = recipientPhone; }
    public String getStatus() { return status; } public void setStatus(String status) { this.status = status; }
    public Integer getResponseCode() { return responseCode; } public void setResponseCode(Integer responseCode) { this.responseCode = responseCode; }
    public String getErrorMessage() { return errorMessage; } public void setErrorMessage(String errorMessage) { this.errorMessage = errorMessage; }
    public Instant getCreatedAt() { return createdAt; } public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
