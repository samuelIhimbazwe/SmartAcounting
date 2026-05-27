-- Ensure the application DB role can execute V90 signup/auth helper functions (Render may use a non-smartchain role).
DO $body$
DECLARE
  grantee text := current_user;
  fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public_signup_email_taken(text)',
    'public_signup_phone_taken(text)',
    'public_signup_oauth_subject_taken(text, text)',
    'lookup_signup_pending_by_phone(text)',
    'lookup_user_for_authentication(text)',
    'lookup_password_reset_user_by_phone(text)',
    'lookup_password_reset_phone_by_email(text)'
  ]
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO %I', fn, grantee);
  END LOOP;
END
$body$;
