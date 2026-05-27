package com.smartaccounting.controller;

import com.smartaccounting.dto.OAuth2ProviderDto;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Lists enabled OAuth2 providers and returns authorize paths for browser redirect login/link flows.
 */
@RestController
@RequestMapping("/api/v1/auth/oauth2")
public class OAuth2AuthController {

    private final ClientRegistrationRepository clientRegistrationRepository;

    public OAuth2AuthController(ClientRegistrationRepository clientRegistrationRepository) {
        this.clientRegistrationRepository = clientRegistrationRepository;
    }

    @GetMapping("/providers")
    public List<OAuth2ProviderDto> listProviders(HttpServletRequest request) {
        try {
            List<OAuth2ProviderDto> providers = new ArrayList<>();
            for (ClientRegistration registration : iterableRegistrations()) {
                String id = registration.getRegistrationId();
                providers.add(OAuth2ProviderDto.builder()
                    .provider(id)
                    .displayName(registration.getClientName())
                    .loginUrl(authorizeUrl(request, id))
                    .iconUrl(iconUrl(id))
                    .build());
            }
            return providers;
        } catch (RuntimeException ex) {
            return List.of();
        }
    }

    @GetMapping("/authorize/{provider}")
    public ResponseEntity<Map<String, String>> authorizePath(
        @PathVariable String provider,
        HttpServletRequest request
    ) {
        String registrationId = provider.toLowerCase(Locale.ROOT);
        ClientRegistration registration = clientRegistrationRepository.findByRegistrationId(registrationId);
        if (registration == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(Map.of(
            "provider", registrationId,
            "authorizePath", authorizeUrl(request, registrationId)
        ));
    }

    private Iterable<ClientRegistration> iterableRegistrations() {
        if (clientRegistrationRepository instanceof Iterable<?> iterable) {
            @SuppressWarnings("unchecked")
            Iterable<ClientRegistration> registrations = (Iterable<ClientRegistration>) iterable;
            return registrations;
        }
        List<ClientRegistration> list = new ArrayList<>();
        for (String id : List.of("google", "microsoft")) {
            ClientRegistration reg = clientRegistrationRepository.findByRegistrationId(id);
            if (reg != null) {
                list.add(reg);
            }
        }
        return list;
    }

    private static String authorizeUrl(HttpServletRequest request, String registrationId) {
        return ServletUriComponentsBuilder.fromContextPath(request)
            .path("/oauth2/authorization/{registrationId}")
            .buildAndExpand(registrationId)
            .toUriString();
    }

    private static String iconUrl(String provider) {
        if (!StringUtils.hasText(provider)) {
            return "";
        }
        return switch (provider.toLowerCase(Locale.ROOT)) {
            case "google" -> "https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg";
            case "microsoft" -> "https://learn.microsoft.com/en-us/media/logos/logo-ms-social.png";
            default -> "";
        };
    }
}
