ALTER TABLE finance_customers
    ADD COLUMN IF NOT EXISTS bad_debt_risk_score NUMERIC(5,4) NOT NULL DEFAULT 0;

ALTER TABLE finance_customers
    DROP CONSTRAINT IF EXISTS chk_finance_customers_bad_debt_risk_score;

ALTER TABLE finance_customers
    ADD CONSTRAINT chk_finance_customers_bad_debt_risk_score
        CHECK (bad_debt_risk_score >= 0 AND bad_debt_risk_score <= 1);
