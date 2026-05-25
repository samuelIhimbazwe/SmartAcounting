package com.smartaccounting.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartaccounting.config.SmsProperties;
import com.smartaccounting.repository.NotificationSmsDeliveryLogRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SmsDispatchServiceTest {

    @Mock
    private NotificationSmsDeliveryLogRepository smsDeliveryLogRepository;

    @Test
    void dryRunLogsCarrierForMtnNumber() {
        SmsProperties props = new SmsProperties();
        props.setEnabled(true);
        props.setDryRun(true);
        props.getMtn().setProviderUrl("https://mtn.example/sms");

        SmsDispatchService service = new SmsDispatchService(props, new ObjectMapper(), smsDeliveryLogRepository);
        when(smsDeliveryLogRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        int delivered = service.send(
            UUID.randomUUID(),
            UUID.randomUUID(),
            "SIGNUP_OTP",
            List.of("+250788123456"),
            "code 123456"
        );

        assertThat(delivered).isEqualTo(1);
        ArgumentCaptor<com.smartaccounting.entity.NotificationSmsDeliveryLog> captor =
            ArgumentCaptor.forClass(com.smartaccounting.entity.NotificationSmsDeliveryLog.class);
        verify(smsDeliveryLogRepository).save(captor.capture());
        assertThat(captor.getValue().getEventType()).isEqualTo("SIGNUP_OTP:MTN");
        assertThat(captor.getValue().getStatus()).isEqualTo("DRY_RUN");
    }
}
