package com.smartchain.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;
import java.util.concurrent.*;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class ConcurrentRefreshIT {
    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;

    @Test
    void onlyOneParallelRefreshSucceeds() throws Exception {
        String refresh = loginRefreshToken("cfo", "password");
        ExecutorService executor = Executors.newFixedThreadPool(2);
        Callable<Integer> call = () -> mockMvc.perform(post("/api/v1/auth/refresh")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"refreshToken\":\"" + refresh + "\"}"))
            .andReturn().getResponse().getStatus();
        Future<Integer> f1 = executor.submit(call);
        Future<Integer> f2 = executor.submit(call);
        int s1 = f1.get(10, TimeUnit.SECONDS);
        int s2 = f2.get(10, TimeUnit.SECONDS);
        executor.shutdownNow();
        int ok = (s1 == 200 ? 1 : 0) + (s2 == 200 ? 1 : 0);
        int unauth = (s1 == 401 ? 1 : 0) + (s2 == 401 ? 1 : 0);
        assertEquals(1, ok);
        assertEquals(1, unauth);
    }

    private String loginRefreshToken(String username, String password) throws Exception {
        String body = mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"username":"%s","password":"%s","tenantId":"%s","userId":"%s"}
                    """.formatted(username, password, UUID.randomUUID(), UUID.randomUUID())))
            .andExpect(status().isOk())
            .andReturn().getResponse().getContentAsString();
        JsonNode node = objectMapper.readTree(body);
        return node.get("refreshToken").asText();
    }
}
