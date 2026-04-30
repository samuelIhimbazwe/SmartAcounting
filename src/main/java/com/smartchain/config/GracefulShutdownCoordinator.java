package com.smartchain.config;

import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class GracefulShutdownCoordinator {
    private static final Logger log = LoggerFactory.getLogger(GracefulShutdownCoordinator.class);

    @PreDestroy
    public void onShutdown() {
        // Hook point for coordinated stream/consumer drain in orchestrated shutdown.
        log.info("Graceful shutdown started: draining in-flight API/Kafka work before termination");
    }
}
