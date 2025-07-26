-- Diagnostic script to verify gift credits requirements
DO $$
BEGIN
    -- Check if required tables exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'session_free_line_credits') THEN
        RAISE NOTICE 'MISSING: session_free_line_credits table';
    ELSE
        RAISE NOTICE 'OK: session_free_line_credits table exists';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'session_free_nuke_credits') THEN
        RAISE NOTICE 'MISSING: session_free_nuke_credits table';
    ELSE
        RAISE NOTICE 'OK: session_free_nuke_credits table exists';
    END IF;

    -- Check if required functions exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_total_free_credits') THEN
        RAISE NOTICE 'MISSING: get_total_free_credits function';
    ELSE
        RAISE NOTICE 'OK: get_total_free_credits function exists';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_session_free_credits') THEN
        RAISE NOTICE 'MISSING: get_session_free_credits function';
    ELSE
        RAISE NOTICE 'OK: get_session_free_credits function exists';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_user_free_credit_sessions') THEN
        RAISE NOTICE 'MISSING: get_user_free_credit_sessions function';
    ELSE
        RAISE NOTICE 'OK: get_user_free_credit_sessions function exists';
    END IF;

    -- Check if gift_credits_to_session function exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'gift_credits_to_session') THEN
        RAISE NOTICE 'MISSING: gift_credits_to_session function';
    ELSE
        RAISE NOTICE 'OK: gift_credits_to_session function exists';
    END IF;

    RAISE NOTICE 'Diagnostic complete. Check output above for any MISSING items.';
END $$;
