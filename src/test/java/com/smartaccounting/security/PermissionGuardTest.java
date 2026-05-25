package com.smartaccounting.security;



import ch.qos.logback.classic.Level;

import ch.qos.logback.classic.Logger;

import ch.qos.logback.classic.spi.ILoggingEvent;

import ch.qos.logback.core.read.ListAppender;

import com.smartaccounting.entity.User;

import com.smartaccounting.repository.UserRepository;

import com.smartaccounting.repository.UserRoleRepository;

import com.smartaccounting.service.PermissionCatalogService;

import com.smartaccounting.service.PermissionExpansionService;

import com.smartaccounting.service.TenantPermissionCacheService;

import com.smartaccounting.tenant.TenantContext;

import org.junit.jupiter.api.AfterEach;

import org.junit.jupiter.api.BeforeEach;

import org.junit.jupiter.api.Test;

import org.junit.jupiter.api.extension.ExtendWith;

import org.mockito.InjectMocks;

import org.mockito.Mock;

import org.mockito.junit.jupiter.MockitoExtension;

import org.slf4j.LoggerFactory;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

import org.springframework.security.core.authority.SimpleGrantedAuthority;



import java.util.List;

import java.util.Optional;

import java.util.Set;

import java.util.UUID;



import static org.assertj.core.api.Assertions.assertThat;

import static org.mockito.ArgumentMatchers.any;

import static org.mockito.ArgumentMatchers.anyString;

import static org.mockito.ArgumentMatchers.eq;

import static org.mockito.Mockito.lenient;

import static org.mockito.Mockito.never;

import static org.mockito.Mockito.verify;

import static org.mockito.Mockito.when;



@ExtendWith(MockitoExtension.class)

class PermissionGuardTest {

    private static final UUID TENANT_ID = UUID.fromString("11111111-1111-4111-8111-111111111111");

    private static final UUID USER_ID = UUID.fromString("33333333-3333-4333-8333-333333333301");



    @Mock

    private UserRoleRepository userRoleRepository;

    @Mock

    private UserRepository userRepository;

    @Mock

    private TenantPermissionCacheService cacheService;

    @Mock

    private PermissionCatalogService permissionCatalogService;

    @Mock

    private PermissionExpansionService permissionExpansionService;



    @InjectMocks

    private PermissionGuard permissionGuard;



    @BeforeEach

    void setTenantContext() {

        TenantContext.set(TENANT_ID, USER_ID);

        lenient().when(permissionCatalogService.exists(anyString())).thenReturn(true);

        lenient().when(permissionCatalogService.existsForTenant(anyString(), eq(TENANT_ID))).thenReturn(true);

        lenient().when(permissionExpansionService.tenantHasCode(eq(TENANT_ID), anyString())).thenReturn(true);

        lenient().when(permissionExpansionService.expandForTenant(eq(TENANT_ID), any()))
            .thenAnswer(invocation -> new java.util.LinkedHashSet<>(invocation.getArgument(1)));

    }



    @AfterEach

    void clearTenantContext() {

        TenantContext.clear();

    }



    @Test

    void hasLoadsPermissionsFromDbOnCacheMiss() {

        when(cacheService.getPermissions(TENANT_ID, USER_ID)).thenReturn(null);

        when(userRoleRepository.findPermissionCodesByUserId(USER_ID))

            .thenReturn(List.of("FINANCE_READ", "ROLE_MANAGE"));



        UsernamePasswordAuthenticationToken auth =

            new UsernamePasswordAuthenticationToken("ceo", null, List.of(new SimpleGrantedAuthority("ROLE_CEO")));



        assertThat(permissionGuard.has(auth, "FINANCE_READ")).isTrue();



        verify(cacheService).putPermissions(TENANT_ID, USER_ID, Set.of("FINANCE_READ", "ROLE_MANAGE"));

        verify(userRoleRepository).findPermissionCodesByUserId(USER_ID);

    }



    @Test

    void hasReturnsFalseForMissingPermission() {

        when(cacheService.getPermissions(TENANT_ID, USER_ID)).thenReturn(Set.of("FINANCE_READ"));



        UsernamePasswordAuthenticationToken auth =

            new UsernamePasswordAuthenticationToken("ceo", null, List.of(new SimpleGrantedAuthority("ROLE_CEO")));



        assertThat(permissionGuard.has(auth, "USER_MANAGE")).isFalse();

    }



    @Test

    void hasUsesCacheWhenPresent() {

        when(cacheService.getPermissions(TENANT_ID, USER_ID)).thenReturn(Set.of("USER_MANAGE"));



        UsernamePasswordAuthenticationToken auth =

            new UsernamePasswordAuthenticationToken("ceo", null, List.of(new SimpleGrantedAuthority("ROLE_CEO")));



        assertThat(permissionGuard.has(auth, "USER_MANAGE")).isTrue();

        verify(userRoleRepository, never()).findPermissionCodesByUserId(any());

    }



    @Test

    void serviceAccountUsesPermAuthorities() {

        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(

            "sync-bot",

            null,

            List.of(

                new SimpleGrantedAuthority("ROLE_SERVICE_ACCOUNT"),

                new SimpleGrantedAuthority("PERM_FINANCE_READ")

            )

        );



        assertThat(permissionGuard.has(auth, "FINANCE_READ")).isTrue();

        verify(userRoleRepository, never()).findPermissionCodesByUserId(any());

        verify(permissionCatalogService, never()).exists(anyString());

    }



    @Test

    void isSelfServiceOwnerReadsFromUserRepository() {

        User owner = new User();

        owner.setId(USER_ID);

        owner.setTenantId(TENANT_ID);

        owner.setSelfServiceOwner(true);

        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(owner));



        UsernamePasswordAuthenticationToken auth =

            new UsernamePasswordAuthenticationToken("ceo", null, List.of(new SimpleGrantedAuthority("ROLE_CEO")));



        assertThat(permissionGuard.isSelfServiceOwner(auth)).isTrue();

    }



    @Test

    void invalidateUserPermissionsDelegatesToCacheService() {

        User user = new User();

        user.setId(USER_ID);

        user.setTenantId(TENANT_ID);

        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));



        permissionGuard.invalidateUserPermissions(USER_ID);



        verify(cacheService).invalidateUser(TENANT_ID, USER_ID);

    }



    @Test

    void unknownPermissionCodeAlwaysDenies() {

        lenient().when(permissionCatalogService.existsForTenant("FEATURE_FLAG_WRITE", TENANT_ID)).thenReturn(false);

        lenient().when(permissionExpansionService.tenantHasCode(TENANT_ID, "FEATURE_FLAG_WRITE")).thenReturn(false);



        UsernamePasswordAuthenticationToken auth =

            new UsernamePasswordAuthenticationToken("ceo", null, List.of(new SimpleGrantedAuthority("ROLE_CEO")));



        assertThat(permissionGuard.has(auth, "FEATURE_FLAG_WRITE")).isFalse();

        verify(userRoleRepository, never()).findPermissionCodesByUserId(any());

    }



    @Test

    void permissionDeniedLogsWarnWithContext() {

        Logger logger = (Logger) LoggerFactory.getLogger(PermissionGuard.class);

        ListAppender<ILoggingEvent> appender = new ListAppender<>();

        appender.start();

        logger.addAppender(appender);



        try {

            when(cacheService.getPermissions(TENANT_ID, USER_ID)).thenReturn(Set.of("FINANCE_READ"));



            UsernamePasswordAuthenticationToken auth =

                new UsernamePasswordAuthenticationToken("ceo", null, List.of(new SimpleGrantedAuthority("ROLE_CEO")));



            assertThat(permissionGuard.has(auth, "USER_MANAGE")).isFalse();



            assertThat(appender.list).anyMatch(event ->

                event.getLevel() == Level.WARN

                    && event.getFormattedMessage().contains("RBAC DENY")

                    && event.getFormattedMessage().contains(USER_ID.toString())

                    && event.getFormattedMessage().contains(TENANT_ID.toString())

                    && event.getFormattedMessage().contains("USER_MANAGE")

            );

        } finally {

            logger.detachAppender(appender);

        }

    }

}


