package com.smartaccounting.config;

import com.smartaccounting.tenant.TenantContext;
import org.springframework.jdbc.datasource.AbstractDataSource;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.util.UUID;

public class TenantAwareDataSource extends AbstractDataSource {
    private final DataSource delegate;

    public TenantAwareDataSource(DataSource delegate) {
        this.delegate = delegate;
    }

    @Override
    public Connection getConnection() throws SQLException {
        Connection connection = delegate.getConnection();
        applyTenantContext(connection);
        return connection;
    }

    @Override
    public Connection getConnection(String username, String password) throws SQLException {
        Connection connection = delegate.getConnection(username, password);
        applyTenantContext(connection);
        return connection;
    }

    private void applyTenantContext(Connection connection) throws SQLException {
        UUID tenantId = TenantContext.tenantId();
        if (tenantId == null) {
            return;
        }
        if (!isPostgres(connection)) {
            return;
        }
        try (PreparedStatement ps = connection.prepareStatement("select set_config('app.tenant_id', ?, true)")) {
            ps.setString(1, tenantId.toString());
            ps.execute();
        }
    }

    private boolean isPostgres(Connection connection) {
        try {
            DatabaseMetaData metaData = connection.getMetaData();
            if (metaData == null) {
                return false;
            }
            String product = metaData.getDatabaseProductName();
            return product != null && product.toLowerCase().contains("postgres");
        } catch (Exception ex) {
            return false;
        }
    }
}
