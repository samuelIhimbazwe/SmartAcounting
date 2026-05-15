package com.smartaccounting.security;

import com.smartaccounting.signup.SelfServiceUserLookup;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;
import static org.mockito.ArgumentMatchers.any;

@ExtendWith(MockitoExtension.class)
class MfaServiceTest {

    @Mock
    private StringRedisTemplate redisTemplate;

    @Mock
    private ValueOperations<String, String> valueOperations;

    @Mock
    private SelfServiceUserLookup selfServiceUserLookup;

    private MfaService service;

    @BeforeEach
    void setUp() {
        lenient().when(selfServiceUserLookup.isSelfServiceOwner(any())).thenReturn(false);
        service = new MfaService(redisTemplate, selfServiceUserLookup, 300, true);
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
    }

    @Test
    void fallsBackToLocalChallengeStoreWhenRedisUnavailable() {
        doThrow(new RedisConnectionFailureException("redis down"))
            .when(valueOperations).set(anyString(), anyString(), eq(Duration.ofSeconds(300)));
        when(valueOperations.get(anyString()))
            .thenThrow(new RedisConnectionFailureException("redis down"));

        MfaService.Challenge challenge = service.issueChallenge("cfo", "tenant-a", "user-a");
        assertThat(challenge.debugCode()).isNotBlank();
        assertThatCode(() -> service.assertValidOtp(
            "cfo",
            "tenant-a",
            "user-a",
            challenge.challengeId(),
            challenge.debugCode()
        )).doesNotThrowAnyException();
    }

    @Test
    void localFallbackRejectsInvalidOtp() {
        doThrow(new RedisConnectionFailureException("redis down"))
            .when(valueOperations).set(anyString(), anyString(), eq(Duration.ofSeconds(300)));
        when(valueOperations.get(anyString()))
            .thenThrow(new RedisConnectionFailureException("redis down"));

        MfaService.Challenge challenge = service.issueChallenge("ceo", "tenant-b", "user-b");

        assertThatThrownBy(() -> service.assertValidOtp(
            "ceo",
            "tenant-b",
            "user-b",
            challenge.challengeId(),
            "000000"
        )).isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Invalid OTP code");
    }
}
