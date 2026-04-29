package com.smartchain.alerts;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class AlertFanoutService {
    private static final Logger log = LoggerFactory.getLogger(AlertFanoutService.class);

    public void fanoutRoleAlert(String role, String title, String severity) {
        // Placeholder fanout: can be replaced by SSE hub + email/sms adapters.
        log.info("Alert fanout role={}, severity={}, title={}", role, severity, title);
    }
}
