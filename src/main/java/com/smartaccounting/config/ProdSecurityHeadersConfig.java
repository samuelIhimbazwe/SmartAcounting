package com.smartaccounting.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
@Configuration
@Profile("prod")
public class ProdSecurityHeadersConfig {

    public static void applyProdHeaders(HttpSecurity http) throws Exception {
        http.headers(h -> h
            .frameOptions(f -> f.deny())
            .contentTypeOptions(Customizer.withDefaults())
            .httpStrictTransportSecurity(hsts -> hsts
                .maxAgeInSeconds(63072000)
                .includeSubDomains(true))
        );
    }
}
