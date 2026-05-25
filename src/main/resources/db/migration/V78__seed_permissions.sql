INSERT INTO permissions (code, label, description, category, is_dangerous) VALUES

-- POINT OF SALE
('POS_ACCESS',          'Sell products at the till',      'Process sales, view catalog, accept payment',        'POS',       false),
('POS_TILL_MANAGE',     'Open and close the till',        'Manage till sessions, print Z-reports',              'POS',       false),
('POS_RETURNS',         'Give refunds to customers',      'Process returns and refunds',                        'POS',       false),
('POS_DISCOUNT',        'Apply discounts',                'Apply line and basket discounts',                    'POS',       false),

-- FISCAL
('EBM_SUBMIT',          'Issue RRA fiscal receipts',      'Submit EFD receipts to RRA EBM',                    'FISCAL',    false),
('EBM_AUDIT',           'View fiscal audit reports',      'View EBM audit log and fiscal reports',             'FISCAL',    false),
('EBM_CONFIG',          'Configure EBM device',           'Set EBM device credentials and settings',           'FISCAL',    true),

-- INVENTORY
('INVENTORY_READ',      'See stock levels',               'View inventory balances and batches',                'INVENTORY', false),
('INVENTORY_WRITE',     'Receive and move stock',         'Receive deliveries, move and adjust stock',         'INVENTORY', false),
('INVENTORY_SHRINKAGE', 'Record stock losses',            'Record and view shrinkage',                         'INVENTORY', false),
('PROCUREMENT_READ',    'View purchase orders',           'View POs and supplier orders',                      'INVENTORY', false),
('PROCUREMENT_WRITE',   'Create purchase orders',         'Create and approve purchase orders',                'INVENTORY', false),

-- FINANCE
('FINANCE_READ',        'View financial reports',         'View AR/AP, ledger, reconciliation',                'FINANCE',   false),
('FINANCE_WRITE',       'Record payments and journals',   'Create payments and post journals',                 'FINANCE',   true),
('FINANCE_CLOSE',       'Run period close',               'Execute accounting period close workflow',          'FINANCE',   true),
('PAYROLL_READ',        'View payroll and payslips',      'View payroll runs and payslips',                    'FINANCE',   false),
('PAYROLL_WRITE',       'Run and approve payroll',        'Create and approve payroll runs',                   'FINANCE',   true),
('ASSETS_MANAGE',       'Manage fixed assets',            'Create, depreciate and dispose fixed assets',       'FINANCE',   false),

-- PEOPLE
('HR_READ',             'View staff and schedules',       'View staff records, shifts, attendance',            'PEOPLE',    false),
('HR_WRITE',            'Manage staff and shifts',        'Create and edit staff, assign shifts',              'PEOPLE',    false),
('STAFF_INVITE',        'Invite new staff members',       'Send invitations to join the tenant',               'PEOPLE',    false),

-- REPORTS
('ANALYTICS_OWN',       'View own dashboard',             'View role-scoped dashboard and KPIs',               'REPORTS',   false),
('ANALYTICS_ALL',       'View all dashboards',            'View dashboards across all roles',                  'REPORTS',   false),
('REPORTS_EXPORT',      'Export reports',                 'Export reports, Z-reports, and data',               'REPORTS',   false),
('AI_COPILOT',          'Use AI assistant',               'Use copilot, briefings, and what-if',               'REPORTS',   false),

-- ADMIN
('ROLE_MANAGE',         'Create and edit roles',          'Create, modify and delete tenant roles',            'ADMIN',     true),
('USER_MANAGE',         'Assign roles to users',          'Assign and revoke roles for tenant users',          'ADMIN',     true);
