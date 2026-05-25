package com.smartaccounting.controller;

import com.smartaccounting.exception.GlobalExceptionHandler;
import com.smartaccounting.exception.RoleConflictException;
import com.smartaccounting.exception.RoleModificationException;
import com.smartaccounting.service.RoleDesignAssistantService;
import com.smartaccounting.service.TenantOnboardingService;
import com.smartaccounting.service.TenantCustomPermissionService;
import com.smartaccounting.service.TenantRoleService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class TenantRoleControllerTest {
    private static final UUID ROLE_ID = UUID.fromString("22222222-2222-4222-8222-222222222222");

    @Mock
    private TenantRoleService tenantRoleService;

    @Mock
    private TenantOnboardingService tenantOnboardingService;

    @Mock
    private RoleDesignAssistantService roleDesignAssistantService;

    @Mock
    private TenantCustomPermissionService tenantCustomPermissionService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        TenantRoleController controller = new TenantRoleController(
            tenantRoleService,
            tenantOnboardingService,
            roleDesignAssistantService,
            tenantCustomPermissionService
        );
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
            .setControllerAdvice(new GlobalExceptionHandler())
            .build();
    }

    @Test
    void deleteRoleWithUsersReturns409() throws Exception {
        doThrow(new RoleConflictException(
            "Role is assigned to 2 user(s). Reassign those users before deleting this role."
        )).when(tenantRoleService).deleteRole(ROLE_ID);

        mockMvc.perform(delete("/api/v1/tenant/roles/{roleId}", ROLE_ID))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.error").value(
                "Role is assigned to 2 user(s). Reassign those users before deleting this role."
            ));
    }

    @Test
    void updateOwnerRoleReturns400() throws Exception {
        doThrow(new RoleModificationException("Cannot modify owner role name"))
            .when(tenantRoleService).updateRole(eq(ROLE_ID), any());

        mockMvc.perform(put("/api/v1/tenant/roles/{roleId}", ROLE_ID)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "name": "Renamed Owner",
                      "description": "Owner",
                      "emoji": "👑",
                      "colour": "#6366f1",
                      "permissionCodes": ["POS_ACCESS"]
                    }
                    """))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error").value("Cannot modify owner role name"));
    }
}
