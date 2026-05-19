package com.smartaccounting.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(WhatsAppProperties.class)
public class IntegrationsConfig {
}
