-- This script explicitly drops the admin-related functions
-- to prepare for their re-creation with the correct logic and signatures.
-- Running this first will resolve the "cannot change return type" error.

DROP FUNCTION IF EXISTS public.get_admin_dashboard_stats();
DROP FUNCTION IF EXISTS public.admin_withdraw_revenue();
DROP FUNCTION IF EXISTS public.update_transaction_details(uuid, text, numeric);
