package com.smartaccounting.security;

import com.smartaccounting.exception.RateLimitExceededException;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthRateLimitFilterTest {

    @Mock
    private StringRedisTemplate redisTemplate;

    @Mock
    private ValueOperations<String, String> valueOperations;

    @Mock
    private FilterChain filterChain;

    private AuthRateLimitFilter filter;

    @BeforeEach
    void setUp() {
        filter = new AuthRateLimitFilter(redisTemplate);
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
    }

    @Test
    void fallsBackToInMemoryCounterWhenRedisIsUnavailable() throws Exception {
        when(valueOperations.increment(anyString()))
            .thenThrow(new RedisConnectionFailureException("redis down"));
        MockHttpServletRequest request = request("/api/v1/auth/login");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilterInternal(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
    }

    @Test
    void inMemoryFallbackStillRateLimitsExcessiveAttempts() throws Exception {
        when(valueOperations.increment(anyString()))
            .thenThrow(new RedisConnectionFailureException("redis down"));
        MockHttpServletRequest request = request("/api/v1/auth/login");
        MockHttpServletResponse response = new MockHttpServletResponse();
        for (int i = 0; i < 5; i++) {
            filter.doFilterInternal(request, response, filterChain);
        }

        assertThatThrownBy(() -> filter.doFilterInternal(request, response, filterChain))
            .isInstanceOf(RateLimitExceededException.class)
            .hasMessageContaining("Too many auth attempts");
        assertThat(response.getHeader("Retry-After")).isEqualTo("900");
    }

    private MockHttpServletRequest request(String uri) {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", uri);
        request.addHeader(TenantContextFilter.TENANT_HEADER, "00000000-0000-0000-0000-000000000001");
        request.setRemoteAddr("127.0.0.1");
        return request;
    }
}
