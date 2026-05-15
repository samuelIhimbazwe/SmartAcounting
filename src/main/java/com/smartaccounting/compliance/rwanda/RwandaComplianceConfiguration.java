package com.smartaccounting.compliance.rwanda;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.netty.http.client.HttpClient;

import java.time.Duration;

@Configuration
@EnableConfigurationProperties(RwandaComplianceProperties.class)
public class RwandaComplianceConfiguration {

    @Bean
    public WebClient rraWebClient(RwandaComplianceProperties props) {
        HttpClient httpClient = HttpClient.create()
            .responseTimeout(Duration.ofMillis(props.getReadTimeoutMs()));
        return WebClient.builder()
            .clientConnector(new ReactorClientHttpConnector(httpClient))
            .build();
    }
}
