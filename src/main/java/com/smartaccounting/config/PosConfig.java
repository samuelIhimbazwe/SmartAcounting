package com.smartaccounting.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties({PosProperties.class, ReceiptProperties.class, LabelProperties.class})
public class PosConfig {
}
