package com.smartchain.config;

import com.smartchain.tenant.TenantContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class RlsEnforcementTest {

    @AfterEach
    void clean() {
        TenantContext.clear();
    }

    @Test
    void tenantSessionVariableIsSetForConnections() throws Exception {
        DataSource delegate = Mockito.mock(DataSource.class);
        Connection connection = Mockito.mock(Connection.class);
        PreparedStatement ps = Mockito.mock(PreparedStatement.class);
        when(delegate.getConnection()).thenReturn(connection);
        when(connection.prepareStatement(anyString())).thenReturn(ps);

        TenantContext.set(UUID.fromString("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"), UUID.randomUUID());
        TenantAwareDataSource tenantAwareDataSource = new TenantAwareDataSource(delegate);
        tenantAwareDataSource.getConnection();

        verify(connection).prepareStatement("select set_config('app.tenant_id', ?, true)");
        verify(ps).setString(1, "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
        verify(ps).execute();
    }
}
