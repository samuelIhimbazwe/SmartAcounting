-- service_account_api_keys.scopes_csv already stores scopes; enforce in ApiKeyScopeAuthorizationFilter.
COMMENT ON COLUMN service_account_api_keys.scopes_csv IS 'Comma-separated scopes: POS, FINANCE, HR, INVENTORY, ADMIN, READONLY';
