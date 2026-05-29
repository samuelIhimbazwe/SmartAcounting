ALTER TABLE ebm_audit_log
    ADD COLUMN IF NOT EXISTS user_id UUID,
    ADD COLUMN IF NOT EXISTS action VARCHAR(64),
    ADD COLUMN IF NOT EXISTS document_ref VARCHAR(128);

UPDATE ebm_audit_log
SET action = 'EBM_RECEIPT_SUBMIT',
    document_ref = COALESCE(document_ref, receipt_id::text)
WHERE action IS NULL;
