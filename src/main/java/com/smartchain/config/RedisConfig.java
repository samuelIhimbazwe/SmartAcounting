package com.smartchain.config;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.CacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.data.redis.serializer.StringRedisSerializer;

import java.time.Duration;
import java.util.Map;

@Configuration
public class RedisConfig {
    @Value("${spring.data.redis.host:}")
    private String redisHost;
    @Value("${spring.data.redis.port:0}")
    private int redisPort;

    @PostConstruct
    void validateEnv() {
        if (redisHost == null || redisHost.isBlank() || redisPort <= 0) {
            throw new IllegalStateException("REDIS_HOST and REDIS_PORT must be configured");
        }
    }

    @Bean
    RedisTemplate<String, Object> redisTemplate(RedisConnectionFactory factory) {
        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(factory);
        template.setKeySerializer(new StringRedisSerializer());
        template.setValueSerializer(new GenericJackson2JsonRedisSerializer());
        return template;
    }

    @Bean
    CacheManager cacheManager(RedisConnectionFactory factory) {
        RedisCacheConfiguration defaultConfig = RedisCacheConfiguration.defaultCacheConfig()
            .serializeKeysWith(RedisSerializationContext.SerializationPair.fromSerializer(new StringRedisSerializer()))
            .serializeValuesWith(RedisSerializationContext.SerializationPair.fromSerializer(new GenericJackson2JsonRedisSerializer()))
            .entryTtl(Duration.ofSeconds(60));
        Map<String, RedisCacheConfiguration> perCache = Map.of(
            "dashboardKpis", defaultConfig.entryTtl(Duration.ofSeconds(60)),
            "dashboardCharts", defaultConfig.entryTtl(Duration.ofSeconds(300)),
            "briefings", defaultConfig.entryTtl(Duration.ofHours(4))
        );
        return RedisCacheManager.builder(factory)
            .cacheDefaults(defaultConfig)
            .withInitialCacheConfigurations(perCache)
            .build();
    }
}
