package com.smartaccounting.controller;

import com.smartaccounting.service.SyncService;
import com.smartaccounting.service.SmsReminderJobService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminSyncJobsControllerTest {

    @Mock
    private SyncService syncService;

    @Mock
    private SmsReminderJobService smsReminderJobService;

    @InjectMocks
    private AdminSyncJobsController controller;

    @Test
    void runSyncFlushReturnsProcessedCount() {
        when(syncService.flushPending()).thenReturn(7);

        Map<String, Integer> out = controller.runSyncFlush();

        assertThat(out.get("processed")).isEqualTo(7);
        verify(syncService).flushPending();
    }

    @Test
    void runSmsReminderPassesSimulateDate() {
        LocalDate simulated = LocalDate.of(2026, 5, 7);
        when(smsReminderJobService.run(simulated)).thenReturn(Map.of("remindersSent", 2));

        Map<String, Object> out = controller.runSmsReminder(simulated);

        assertThat(out.get("remindersSent")).isEqualTo(2);
        verify(smsReminderJobService).run(simulated);
    }
}
