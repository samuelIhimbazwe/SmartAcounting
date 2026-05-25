package com.smartaccounting.controller;

import com.smartaccounting.dto.AssignedRoleSummary;
import com.smartaccounting.dto.AuthSessionProfile;
import com.smartaccounting.dto.rbac.RoleProfileConfig;
import com.smartaccounting.service.AuthSessionService;
import com.smartaccounting.signup.DbUserLoginValidator;
import com.smartaccounting.signup.LoginIdentityService;
import com.smartaccounting.security.JwtRevocationService;
import com.smartaccounting.security.JwtService;
import com.smartaccounting.security.MfaService;
import com.smartaccounting.security.RefreshTokenService;
import com.smartaccounting.service.OidcAuthService;
import com.smartaccounting.tenant.TenantContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;
import java.util.UUID;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class AuthControllerMeTest {
    private static final UUID TENANT = UUID.fromString("11111111-1111-4111-8111-111111111111");
    private static final UUID USER = UUID.fromString("33333333-3333-4333-8333-333333333301");

    @Mock
    private AuthenticationManager authenticationManager;
    @Mock
    private UserDetailsService userDetailsService;
    @Mock
    private JwtService jwtService;
    @Mock
    private RefreshTokenService refreshTokenService;
    @Mock
    private MfaService mfaService;
    @Mock
    private DbUserLoginValidator dbUserLoginValidator;
    @Mock
    private OidcAuthService oidcAuthService;
    @Mock
    private LoginIdentityService loginIdentityService;
    @Mock
    private JwtRevocationService jwtRevocationService;
    @Mock
    private AuthSessionService authSessionService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        AuthController controller = new AuthController(
            authenticationManager,
            userDetailsService,
            jwtService,
            refreshTokenService,
            mfaService,
            dbUserLoginValidator,
            oidcAuthService,
            loginIdentityService,
            jwtRevocationService,
            authSessionService
        );
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
        TenantContext.set(TENANT, USER);
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    @Test
    void meReturnsSessionProfile() throws Exception {
        when(authSessionService.buildSession(TENANT, USER)).thenReturn(
            new AuthSessionProfile(
                "CEO",
                TENANT.toString(),
                USER.toString(),
                List.of("ANALYTICS_ALL", "POS_ACCESS"),
                List.of(new AssignedRoleSummary(UUID.randomUUID(), "Business Owner", true)),
                new RoleProfileConfig(
                    List.of("executive.command"),
                    List.of("CEO"),
                    "/dashboard/ceo",
                    List.of("users-tenants"),
                    List.of("dashboard:CEO"),
                    List.of("tenant-oversight"),
                    "executive",
                    java.util.Map.of("showExecutiveSummary", true),
                    "LEGACY_PRESET"
                ),
                true
            )
        );

        mockMvc.perform(get("/api/v1/auth/me"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.role").value("CEO"))
            .andExpect(jsonPath("$.permissions[0]").value("ANALYTICS_ALL"))
            .andExpect(jsonPath("$.assignedRoles[0].name").value("Business Owner"))
            .andExpect(jsonPath("$.effectiveRoleProfile.landingRoute").value("/dashboard/ceo"))
            .andExpect(jsonPath("$.setupComplete").value(true));
    }
}
