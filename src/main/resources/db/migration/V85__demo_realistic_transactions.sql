-- Requested as V82; V82__migrate_existing_user_roles.sql exists — applied as V85.
-- Demo tenant 11111111-1111-4111-8111-111111111111: realistic Kigali supermarket data.

SELECT set_config('app.tenant_id', '11111111-1111-4111-8111-111111111111', true);

-- ---------------------------------------------------------------------
-- 1. Product names (barcodes unchanged)
-- ---------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'name') THEN
        UPDATE products SET name = CASE barcode
            WHEN '5901234123457' THEN 'Inyange Water 500ml'
            WHEN '5901234123458' THEN 'Minimex Maize Flour 2kg'
            WHEN '5901234123460' THEN 'Cooking Oil 1L (Soya)'
            WHEN '5901234123461' THEN 'Inyange Rice 5kg'
            WHEN '5901234123462' THEN 'Inyange Sugar 1kg'
            WHEN '5901234123463' THEN 'Lux Soap Bar'
            WHEN '5901234123464' THEN 'Nyabihu Tea 250g'
            WHEN '5901234123465' THEN 'Boulangerie Bread Loaf'
            WHEN '5901234123466' THEN 'Inyange Fresh Milk 1L'
            WHEN '5901234123467' THEN 'Eggs Tray (30 pcs)'
            WHEN '5901234123468' THEN 'Coca-Cola 500ml'
            WHEN '5901234123469' THEN 'Exercise Book A5'
            ELSE name
        END
        WHERE tenant_id = '11111111-1111-4111-8111-111111111111'::uuid
          AND barcode IN (
              '5901234123457', '5901234123458', '5901234123460', '5901234123461',
              '5901234123462', '5901234123463', '5901234123464', '5901234123465',
              '5901234123466', '5901234123467', '5901234123468', '5901234123469'
          );
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'pos_catalog_items' AND column_name = 'display_name') THEN
        UPDATE pos_catalog_items SET display_name = CASE barcode
            WHEN '5901234123457' THEN 'Inyange Water 500ml'
            WHEN '5901234123458' THEN 'Minimex Maize Flour 2kg'
            WHEN '5901234123460' THEN 'Cooking Oil 1L (Soya)'
            WHEN '5901234123461' THEN 'Inyange Rice 5kg'
            WHEN '5901234123462' THEN 'Inyange Sugar 1kg'
            WHEN '5901234123463' THEN 'Lux Soap Bar'
            WHEN '5901234123464' THEN 'Nyabihu Tea 250g'
            WHEN '5901234123465' THEN 'Boulangerie Bread Loaf'
            WHEN '5901234123466' THEN 'Inyange Fresh Milk 1L'
            WHEN '5901234123467' THEN 'Eggs Tray (30 pcs)'
            WHEN '5901234123468' THEN 'Coca-Cola 500ml'
            WHEN '5901234123469' THEN 'Exercise Book A5'
            ELSE display_name
        END
        WHERE tenant_id = '11111111-1111-4111-8111-111111111111'::uuid
          AND barcode IN (
              '5901234123457', '5901234123458', '5901234123460', '5901234123461',
              '5901234123462', '5901234123463', '5901234123464', '5901234123465',
              '5901234123466', '5901234123467', '5901234123468', '5901234123469'
          );
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'pos_sale_lines' AND column_name = 'product_name_snapshot') THEN
        UPDATE pos_sale_lines SET product_name_snapshot = CASE barcode_snapshot
            WHEN '5901234123457' THEN 'Inyange Water 500ml'
            WHEN '5901234123458' THEN 'Minimex Maize Flour 2kg'
            WHEN '5901234123460' THEN 'Cooking Oil 1L (Soya)'
            WHEN '5901234123461' THEN 'Inyange Rice 5kg'
            WHEN '5901234123462' THEN 'Inyange Sugar 1kg'
            WHEN '5901234123463' THEN 'Lux Soap Bar'
            WHEN '5901234123464' THEN 'Nyabihu Tea 250g'
            WHEN '5901234123465' THEN 'Boulangerie Bread Loaf'
            WHEN '5901234123466' THEN 'Inyange Fresh Milk 1L'
            WHEN '5901234123467' THEN 'Eggs Tray (30 pcs)'
            WHEN '5901234123468' THEN 'Coca-Cola 500ml'
            WHEN '5901234123469' THEN 'Exercise Book A5'
            ELSE product_name_snapshot
        END
        WHERE tenant_id = '11111111-1111-4111-8111-111111111111'::uuid
          AND barcode_snapshot IN (
              '5901234123457', '5901234123458', '5901234123460', '5901234123461',
              '5901234123462', '5901234123463', '5901234123464', '5901234123465',
              '5901234123466', '5901234123467', '5901234123468', '5901234123469'
          );
    END IF;
END $$;

-- ---------------------------------------------------------------------
-- 2. Customer names (Rwandan retail shoppers)
-- ---------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'finance_customers' AND column_name = 'customer_name') THEN
        UPDATE finance_customers SET customer_name = CASE id
            WHEN 'c1111111-1111-4111-8111-111111111101'::uuid THEN 'Habimana Bernard'
            WHEN 'c1111111-1111-4111-8111-111111111102'::uuid THEN 'Mukamana Solange'
            WHEN 'c1111111-1111-4111-8111-111111111103'::uuid THEN 'Niyonzima Jean'
            WHEN 'c1111111-1111-4111-8111-111111111104'::uuid THEN 'Uwamariya Immaculee'
            WHEN 'c1111111-1111-4111-8111-111111111105'::uuid THEN 'Uwimana Claudette'
            WHEN 'c1111111-1111-4111-8111-111111111106'::uuid THEN 'Bizimana Pierre'
            WHEN 'c1111111-1111-4111-8111-111111111107'::uuid THEN 'Nsengimana Alice'
            ELSE customer_name
        END
        WHERE tenant_id = '11111111-1111-4111-8111-111111111111'::uuid;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'sales_orders' AND column_name = 'customer_name') THEN
        UPDATE sales_orders SET customer_name = 'Uwimana Claudette'
        WHERE tenant_id = '11111111-1111-4111-8111-111111111111'::uuid
          AND customer_name IN ('Walk-in Customer', 'Test Customer', 'Demo Customer', 'Customer 1');

        UPDATE sales_orders SET customer_name = CASE id
            WHEN '50000000-0000-4000-8000-000000000001'::uuid THEN 'Uwimana Claudette'
            WHEN '50000000-0000-4000-8000-000000000002'::uuid THEN 'Habimana Bernard'
            WHEN '50000000-0000-4000-8000-000000000003'::uuid THEN 'Mukamana Solange'
            WHEN '50000000-0000-4000-8000-000000000004'::uuid THEN 'Niyonzima Jean'
            WHEN '50000000-0000-4000-8000-000000000005'::uuid THEN 'Uwamariya Immaculee'
            WHEN '50000000-0000-4000-8000-000000000006'::uuid THEN 'Bizimana Pierre'
            WHEN 'd6010004-0001-4000-8000-000000000001'::uuid THEN 'Nsengimana Alice'
            WHEN 'd6010004-0001-4000-8000-000000000002'::uuid THEN 'Uwimana Claudette'
            WHEN 'd6010004-0001-4000-8000-000000000003'::uuid THEN 'Habimana Bernard'
            ELSE customer_name
        END
        WHERE tenant_id = '11111111-1111-4111-8111-111111111111'::uuid
          AND sales_channel = 'POS'
          AND id IN (
              '50000000-0000-4000-8000-000000000001'::uuid,
              '50000000-0000-4000-8000-000000000002'::uuid,
              '50000000-0000-4000-8000-000000000003'::uuid,
              '50000000-0000-4000-8000-000000000004'::uuid,
              '50000000-0000-4000-8000-000000000005'::uuid,
              '50000000-0000-4000-8000-000000000006'::uuid,
              'd6010004-0001-4000-8000-000000000001'::uuid,
              'd6010004-0001-4000-8000-000000000002'::uuid,
              'd6010004-0001-4000-8000-000000000003'::uuid
          );
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'customer_name') THEN
        UPDATE invoices SET customer_name = 'Uwimana Claudette'
        WHERE tenant_id = '11111111-1111-4111-8111-111111111111'::uuid
          AND customer_name IN ('Walk-in Customer', 'Test Customer', 'Demo Customer', 'Customer 1');

        UPDATE invoices SET customer_name = CASE customer_id
            WHEN 'c1111111-1111-4111-8111-111111111101'::uuid THEN 'Habimana Bernard'
            WHEN 'c1111111-1111-4111-8111-111111111102'::uuid THEN 'Mukamana Solange'
            WHEN 'c1111111-1111-4111-8111-111111111103'::uuid THEN 'Niyonzima Jean'
            WHEN 'c1111111-1111-4111-8111-111111111104'::uuid THEN 'Uwamariya Immaculee'
            WHEN 'c1111111-1111-4111-8111-111111111105'::uuid THEN 'Uwimana Claudette'
            WHEN 'c1111111-1111-4111-8111-111111111106'::uuid THEN 'Bizimana Pierre'
            WHEN 'c1111111-1111-4111-8111-111111111107'::uuid THEN 'Nsengimana Alice'
            ELSE customer_name
        END
        WHERE tenant_id = '11111111-1111-4111-8111-111111111111'::uuid;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'counterparty') THEN
        UPDATE payments SET counterparty = CASE id
            WHEN 'd6010003-0001-4000-8000-000000000001'::uuid THEN 'Habimana Bernard'
            WHEN 'd6010003-0001-4000-8000-000000000002'::uuid THEN 'Uwamariya Immaculee'
            WHEN 'd6010003-0001-4000-8000-000000000003'::uuid THEN 'Nsengimana Alice'
            WHEN 'd6010003-0001-4000-8000-000000000004'::uuid THEN 'Mukamana Solange'
            ELSE counterparty
        END
        WHERE tenant_id = '11111111-1111-4111-8111-111111111111'::uuid
          AND id IN (
              'd6010003-0001-4000-8000-000000000001'::uuid,
              'd6010003-0001-4000-8000-000000000002'::uuid,
              'd6010003-0001-4000-8000-000000000003'::uuid,
              'd6010003-0001-4000-8000-000000000004'::uuid
          );
    END IF;
END $$;

-- ---------------------------------------------------------------------
-- 3. Supplier names (Rwanda retail supply chain)
-- ---------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'finance_suppliers' AND column_name = 'supplier_name') THEN
        UPDATE finance_suppliers SET supplier_name = CASE id
            WHEN 'b1111111-1111-4111-8111-111111111101'::uuid THEN 'Inyange Industries Ltd'
            WHEN 'b1111111-1111-4111-8111-111111111102'::uuid THEN 'Bralirwa Distributors'
            WHEN 'b1111111-1111-4111-8111-111111111103'::uuid THEN 'Minimex Rwanda'
            WHEN 'b1111111-1111-4111-8111-111111111104'::uuid THEN 'Kigali Fresh Produce Ltd'
            WHEN 'b1111111-1111-4111-8111-111111111105'::uuid THEN 'Sulfo Rwanda Industries'
            ELSE supplier_name
        END
        WHERE tenant_id = '11111111-1111-4111-8111-111111111111'::uuid;

        INSERT INTO finance_suppliers (id, tenant_id, supplier_name, credit_limit, payment_terms_days, created_at, updated_at)
        VALUES (
            'b1111111-1111-4111-8111-111111111106'::uuid,
            '11111111-1111-4111-8111-111111111111'::uuid,
            'CIMERWA Building Supplies',
            800000.00,
            30,
            NOW(),
            NOW()
        )
        ON CONFLICT (id) DO UPDATE SET supplier_name = EXCLUDED.supplier_name;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'supplier_bills' AND column_name = 'supplier_name') THEN
        UPDATE supplier_bills SET supplier_name = CASE supplier_id
            WHEN 'b1111111-1111-4111-8111-111111111101'::uuid THEN 'Inyange Industries Ltd'
            WHEN 'b1111111-1111-4111-8111-111111111102'::uuid THEN 'Bralirwa Distributors'
            WHEN 'b1111111-1111-4111-8111-111111111104'::uuid THEN 'Kigali Fresh Produce Ltd'
            ELSE supplier_name
        END
        WHERE tenant_id = '11111111-1111-4111-8111-111111111111'::uuid;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'purchase_orders' AND column_name = 'supplier_name') THEN
        UPDATE purchase_orders SET supplier_name = CASE supplier_name
            WHEN 'Kigali Wholesale Foods' THEN 'Inyange Industries Ltd'
            WHEN 'Akagera Beverages' THEN 'Bralirwa Distributors'
            WHEN 'Rwanda Office Supplies' THEN 'Minimex Rwanda'
            WHEN 'East-African Dairy Co' THEN 'Kigali Fresh Produce Ltd'
            WHEN 'Local Charcoal Coop' THEN 'Sulfo Rwanda Industries'
            ELSE supplier_name
        END
        WHERE tenant_id = '11111111-1111-4111-8111-111111111111'::uuid;
    END IF;
END $$;

-- ---------------------------------------------------------------------
-- 4. HR employees: 7 demo users (V83) + 3 cashiers
-- ---------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'hr_employee_profiles' AND column_name = 'full_name') THEN
        UPDATE hr_employee_profiles SET full_name = 'Amina Uwase',         department = 'Executive',  title = 'Owner & Director'             WHERE id = '81111111-1111-4111-8111-111111111101'::uuid;
        UPDATE hr_employee_profiles SET full_name = 'Jean-Pierre Habimana', department = 'Finance',    title = 'Finance Manager'              WHERE id = '81111111-1111-4111-8111-111111111102'::uuid;
        UPDATE hr_employee_profiles SET full_name = 'Grace Mukamana',       department = 'Operations', title = 'Store Manager'                WHERE id = '81111111-1111-4111-8111-111111111103'::uuid;
        UPDATE hr_employee_profiles SET full_name = 'Patrick Nzabonimpa',   department = 'Logistics',  title = 'Stock & Operations Manager'   WHERE id = '81111111-1111-4111-8111-111111111104'::uuid;
        UPDATE hr_employee_profiles SET full_name = 'Diane Uwineza',        department = 'HR',         title = 'HR & Administration'          WHERE id = '81111111-1111-4111-8111-111111111105'::uuid;
        UPDATE hr_employee_profiles SET full_name = 'Eric Ndayambaje',      department = 'Marketing',  title = 'Marketing Lead'               WHERE id = '81111111-1111-4111-8111-111111111106'::uuid;
        UPDATE hr_employee_profiles SET full_name = 'Solange Iradukunda',   department = 'Finance',    title = 'Accountant'                   WHERE id = '81111111-1111-4111-8111-111111111107'::uuid;
        UPDATE hr_employee_profiles SET full_name = 'Marie Uwase',          department = 'Sales',      title = 'Cashier (REG-01)', status = 'ACTIVE' WHERE id = '81111111-1111-4111-8111-111111111108'::uuid;
        UPDATE hr_employee_profiles SET full_name = 'Joseph Nkurunziza',    department = 'Sales',      title = 'Cashier (REG-02)', status = 'ACTIVE' WHERE id = '81111111-1111-4111-8111-111111111109'::uuid;
        UPDATE hr_employee_profiles SET full_name = 'Vestine Mukamurigo',   department = 'Sales',      title = 'Cashier (REG-01)', status = 'ACTIVE' WHERE id = '81111111-1111-4111-8111-111111111110'::uuid;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payroll_lines' AND column_name = 'employee_name') THEN
        UPDATE payroll_lines pl SET employee_name = ep.full_name
        FROM hr_employee_profiles ep
        WHERE pl.tenant_id = '11111111-1111-4111-8111-111111111111'::uuid
          AND ep.tenant_id = pl.tenant_id
          AND ep.id = pl.employee_id;
    END IF;
END $$;

-- ---------------------------------------------------------------------
-- 5. Demo location: Kimironko Branch
-- ---------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'locations') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'locations' AND column_name = 'name') THEN
            UPDATE locations SET
                name = 'Kimironko Branch',
                address = 'KG 11 Ave, Kimironko, Kigali'
            WHERE tenant_id = '11111111-1111-4111-8111-111111111111'::uuid
              AND location_code = 'SHOP';
        END IF;

        IF NOT FOUND THEN
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'locations' AND column_name = 'active') THEN
                INSERT INTO locations (id, tenant_id, name, address, location_code, currency_default, timezone, active, created_at)
                VALUES (
                    'f1111111-1111-4111-8111-111111111111'::uuid,
                    '11111111-1111-4111-8111-111111111111'::uuid,
                    'Kimironko Branch',
                    'KG 11 Ave, Kimironko, Kigali',
                    'SHOP',
                    'FRW',
                    'Africa/Kigali',
                    TRUE,
                    NOW()
                )
                ON CONFLICT (tenant_id, location_code) DO UPDATE SET
                    name = EXCLUDED.name,
                    address = EXCLUDED.address;
            ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'locations' AND column_name = 'is_active') THEN
                INSERT INTO locations (id, tenant_id, name, address, location_code, currency_default, timezone, is_active, created_at)
                VALUES (
                    'f1111111-1111-4111-8111-111111111111'::uuid,
                    '11111111-1111-4111-8111-111111111111'::uuid,
                    'Kimironko Branch',
                    'KG 11 Ave, Kimironko, Kigali',
                    'SHOP',
                    'FRW',
                    'Africa/Kigali',
                    TRUE,
                    NOW()
                )
                ON CONFLICT (tenant_id, location_code) DO UPDATE SET
                    name = EXCLUDED.name,
                    address = EXCLUDED.address;
            END IF;
        END IF;
    END IF;
END $$;

-- ---------------------------------------------------------------------
-- 6. POS sales: realistic RWF baskets + 90-day Kigali trading pattern
-- ---------------------------------------------------------------------
DO $$
DECLARE
    v_tenant       uuid := '11111111-1111-4111-8111-111111111111'::uuid;
    v_day          date;
    v_dow          int;
    v_n            int;
    v_seq          int := 0;
    v_i            int;
    v_sale_id      uuid;
    v_line_id      uuid;
    v_tender_id    uuid;
    v_amount       numeric(20, 4);
    v_customer     text;
    v_names        text[] := ARRAY[
        'Uwimana Claudette', 'Habimana Bernard', 'Mukamana Solange',
        'Niyonzima Jean', 'Uwamariya Immaculee', 'Bizimana Pierre', 'Nsengimana Alice'];
    v_reg          text;
    v_tender       text;
    v_tenders      text[] := ARRAY['CASH', 'MOMO', 'CARD', 'AIRTEL_MONEY'];
    v_created      timestamptz;
    v_hour         int;
    v_barcodes     text[] := ARRAY[
        '5901234123457', '5901234123465', '5901234123466', '5901234123468',
        '5901234123462', '5901234123461', '5901234123460'];
    v_prod_names   text[] := ARRAY[
        'Inyange Water 500ml', 'Boulangerie Bread Loaf', 'Inyange Fresh Milk 1L', 'Coca-Cola 500ml',
        'Inyange Sugar 1kg', 'Inyange Rice 5kg', 'Cooking Oil 1L (Soya)'];
    v_prices       numeric[] := ARRAY[500, 700, 900, 600, 1500, 8500, 3000];
    v_catalog_ids  uuid[] := ARRAY[
        '44444444-4444-4444-8444-444444444401'::uuid,
        '44444444-4444-4444-8444-444444444409'::uuid,
        '44444444-4444-4444-8444-444444444410'::uuid,
        '44444444-4444-4444-8444-444444444412'::uuid,
        '44444444-4444-4444-8444-444444444406'::uuid,
        '44444444-4444-4444-8444-444444444405'::uuid,
        '44444444-4444-4444-8444-444444444404'::uuid];
    v_idx          int;
    v_qty          int;
    v_unit         numeric(20, 4);
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'sales_orders' AND column_name = 'total_amount') THEN
        RETURN;
    END IF;

    DELETE FROM pos_payment_tenders
    WHERE tenant_id = v_tenant
      AND sales_order_id >= 'cc000001-0001-4000-8000-000000000001'::uuid
      AND sales_order_id <= 'cc000001-0001-4000-8000-00000000ffff'::uuid;

    DELETE FROM pos_sale_lines
    WHERE tenant_id = v_tenant
      AND sales_order_id >= 'cc000001-0001-4000-8000-000000000001'::uuid
      AND sales_order_id <= 'cc000001-0001-4000-8000-00000000ffff'::uuid;

    DELETE FROM sales_orders
    WHERE tenant_id = v_tenant
      AND id >= 'cc000001-0001-4000-8000-000000000001'::uuid
      AND id <= 'cc000001-0001-4000-8000-00000000ffff'::uuid;

    UPDATE sales_orders SET total_amount = 8473.00,
        created_at = date_trunc('week', CURRENT_DATE)::date + INTERVAL '5 days 15 hours 23 minutes',
        customer_name = 'Uwimana Claudette'
    WHERE id = '50000000-0000-4000-8000-000000000001'::uuid;

    UPDATE sales_orders SET total_amount = 5621.00,
        created_at = date_trunc('week', CURRENT_DATE)::date + INTERVAL '5 days 16 hours 41 minutes',
        customer_name = 'Habimana Bernard'
    WHERE id = '50000000-0000-4000-8000-000000000002'::uuid;

    UPDATE sales_orders SET total_amount = 11289.00,
        created_at = date_trunc('week', CURRENT_DATE)::date + INTERVAL '6 days 11 hours 08 minutes',
        customer_name = 'Mukamana Solange'
    WHERE id = '50000000-0000-4000-8000-000000000003'::uuid;

    UPDATE sales_orders SET total_amount = 7346.00,
        created_at = date_trunc('week', CURRENT_DATE)::date + INTERVAL '6 days 14 hours 52 minutes',
        customer_name = 'Niyonzima Jean'
    WHERE id = '50000000-0000-4000-8000-000000000004'::uuid;

    UPDATE sales_orders SET total_amount = 4187.00,
        created_at = date_trunc('week', CURRENT_DATE)::date - INTERVAL '2 days 10 hours 17 minutes',
        customer_name = 'Uwamariya Immaculee'
    WHERE id = '50000000-0000-4000-8000-000000000005'::uuid;

    UPDATE sales_orders SET total_amount = 9634.00,
        created_at = CURRENT_DATE - INTERVAL '6 hours 33 minutes',
        customer_name = 'Bizimana Pierre'
    WHERE id = '50000000-0000-4000-8000-000000000006'::uuid;

    UPDATE sales_orders SET total_amount = 12847.00,
        created_at = CURRENT_DATE - INTERVAL '2 days 15 hours 11 minutes',
        customer_name = 'Nsengimana Alice'
    WHERE id = 'd6010004-0001-4000-8000-000000000001'::uuid;

    UPDATE sales_orders SET total_amount = 6793.00,
        created_at = CURRENT_DATE - INTERVAL '1 day 16 hours 27 minutes',
        customer_name = 'Uwimana Claudette'
    WHERE id = 'd6010004-0001-4000-8000-000000000002'::uuid;

    UPDATE sales_orders SET total_amount = 14526.00,
        created_at = CURRENT_DATE - INTERVAL '4 hours 19 minutes',
        customer_name = 'Habimana Bernard'
    WHERE id = 'd6010004-0001-4000-8000-000000000003'::uuid;

    UPDATE pos_payment_tenders SET amount = so.total_amount
    FROM sales_orders so
    WHERE pos_payment_tenders.sales_order_id = so.id
      AND so.tenant_id = v_tenant
      AND pos_payment_tenders.tenant_id = v_tenant
      AND so.id IN (
          '50000000-0000-4000-8000-000000000001'::uuid,
          '50000000-0000-4000-8000-000000000002'::uuid,
          '50000000-0000-4000-8000-000000000004'::uuid,
          '50000000-0000-4000-8000-000000000005'::uuid,
          '50000000-0000-4000-8000-000000000006'::uuid,
          'd6010004-0001-4000-8000-000000000001'::uuid,
          'd6010004-0001-4000-8000-000000000002'::uuid,
          'd6010004-0001-4000-8000-000000000003'::uuid
      );

    UPDATE pos_payment_tenders SET amount = 7289.00 WHERE id = '7e000000-0000-4000-8000-000000000301'::uuid;
    UPDATE pos_payment_tenders SET amount = 4000.00 WHERE id = '7e000000-0000-4000-8000-000000000302'::uuid;

    FOR v_day IN SELECT gs::date FROM generate_series(CURRENT_DATE - 89, CURRENT_DATE, '1 day'::interval) AS gs
    LOOP
        v_dow := EXTRACT(DOW FROM v_day);
        v_n := CASE v_dow
            WHEN 6 THEN 8
            WHEN 5 THEN 6
            WHEN 0 THEN 2
            WHEN 1 THEN 3
            ELSE 5
        END;

        FOR v_i IN 1..v_n LOOP
            v_seq := v_seq + 1;
            v_sale_id := ('cc000001-0001-4000-8000-' || lpad(to_hex(v_seq), 12, '0'))::uuid;
            v_line_id := ('cc000002-0001-4000-8000-' || lpad(to_hex(v_seq), 12, '0'))::uuid;
            v_tender_id := ('cc000003-0001-4000-8000-' || lpad(to_hex(v_seq), 12, '0'))::uuid;

            v_amount := 2000 + ((v_seq * 7919 + v_dow * 1301 + v_i * 317) % 13001);
            v_customer := v_names[1 + ((v_seq - 1) % array_length(v_names, 1))];
            v_reg := CASE WHEN v_i % 2 = 0 THEN 'REG-02' ELSE 'REG-01' END;
            v_tender := v_tenders[1 + ((v_seq - 1) % array_length(v_tenders, 1))];

            v_hour := CASE
                WHEN v_dow = 0 THEN 8 + (v_i % 3)
                WHEN v_dow = 5 AND v_i > 2 THEN 14 + (v_i % 5)
                WHEN v_dow = 5 THEN 9 + (v_i % 3)
                WHEN v_dow = 6 THEN 9 + ((v_i * 2) % 11)
                WHEN v_dow = 1 THEN 10 + (v_i % 5)
                ELSE 9 + (v_i % 9)
            END;

            v_created := v_day + make_interval(hours => v_hour, mins => (v_i * 13) % 60);

            v_idx := 1 + ((v_seq - 1) % array_length(v_barcodes, 1));
            v_unit := v_prices[v_idx];
            v_qty := GREATEST(1, (v_amount / v_unit)::int);

            INSERT INTO sales_orders (id, tenant_id, customer_name, status, total_amount, currency_code, created_at, sales_channel, pos_register_code)
            VALUES (v_sale_id, v_tenant, v_customer, 'CONFIRMED', v_amount, 'FRW', v_created, 'POS', v_reg)
            ON CONFLICT (id) DO UPDATE SET
                customer_name = EXCLUDED.customer_name,
                total_amount = EXCLUDED.total_amount,
                created_at = EXCLUDED.created_at,
                pos_register_code = EXCLUDED.pos_register_code;

            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pos_sale_lines') THEN
                INSERT INTO pos_sale_lines (
                    id, tenant_id, sales_order_id, catalog_item_id,
                    barcode_snapshot, product_name_snapshot,
                    quantity, unit_price, line_total
                )
                VALUES (
                    v_line_id, v_tenant, v_sale_id, v_catalog_ids[v_idx],
                    v_barcodes[v_idx], v_prod_names[v_idx],
                    v_qty, v_unit, v_qty * v_unit
                )
                ON CONFLICT (id) DO UPDATE SET
                    line_total = EXCLUDED.line_total,
                    product_name_snapshot = EXCLUDED.product_name_snapshot;
            END IF;

            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pos_payment_tenders') THEN
                INSERT INTO pos_payment_tenders (id, tenant_id, sales_order_id, tender_type, amount, created_at)
                VALUES (v_tender_id, v_tenant, v_sale_id, v_tender, v_amount, v_created)
                ON CONFLICT (id) DO UPDATE SET amount = EXCLUDED.amount, created_at = EXCLUDED.created_at;
            END IF;
        END LOOP;
    END LOOP;
END $$;

-- Refresh sales KPI snapshot product label when present
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sales_kpi_snapshot') THEN
        UPDATE sales_kpi_snapshot
        SET payload = jsonb_set(payload, '{topProduct}', '"Inyange Rice 5kg"'::jsonb, true)
        WHERE tenant_id = '11111111-1111-4111-8111-111111111111'::uuid
          AND snapshot_date = CURRENT_DATE
          AND payload ? 'topProduct';
    END IF;
END $$;
