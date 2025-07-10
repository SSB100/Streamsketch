-- Step 1: Create a user record for the platform admin wallet to satisfy the foreign key constraint.
-- This ensures that when we log an admin withdrawal, the user_wallet_address exists in the users table.
-- The wallet address '2z6QBmtAhjGBBzrQZ58RvpQNSkFhBCw9AhzFURsfvspZ' is the hardcoded admin withdrawal destination.
INSERT INTO users (wallet_address, username)
VALUES ('2z6QBmtAhjGBBzrQZ58RvpQNSkFhBCw9AhzFURsfvspZ', 'platform_admin')
ON CONFLICT (wallet_address) DO NOTHING;


-- Step 2: Correct the admin_withdraw_revenue function to use the actual admin wallet address
-- instead of the invalid string 'platform_admin'.
CREATE OR REPLACE FUNCTION admin_withdraw_revenue()
RETURNS TABLE (withdrawal_amount NUMERIC, transaction_id BIGINT) AS $$
DECLARE
   v_total_earnings NUMERIC;
   v_total_withdrawn NUMERIC;
   v_available_to_withdraw NUMERIC;
   v_withdrawal_amount NUMERIC;
   v_transaction_id BIGINT;
BEGIN
   -- Calculate total platform earnings (20% of all paid transactions)
   SELECT COALESCE(SUM(sol_amount) * 0.2, 0)
   INTO v_total_earnings
   FROM transactions
   WHERE transaction_type IN ('purchase_lines', 'nuke_board');

   -- Calculate total amount already withdrawn by admin
   SELECT COALESCE(SUM(sol_amount), 0)
   INTO v_total_withdrawn
   FROM transactions
   WHERE transaction_type = 'admin_withdrawal';

   v_available_to_withdraw := v_total_earnings - v_total_withdrawn;

   -- Can't withdraw if there's nothing available
   IF v_available_to_withdraw <= 0 THEN
       RETURN QUERY SELECT 0.0, NULL::BIGINT;
       RETURN;
   END IF;

   -- Withdraw 80% of the available amount
   v_withdrawal_amount := v_available_to_withdraw * 0.8;

   -- Log the admin withdrawal transaction using the correct admin wallet address
   INSERT INTO transactions (user_wallet_address, transaction_type, sol_amount, notes)
   VALUES ('2z6QBmtAhjGBBzrQZ58RvpQNSkFhBCw9AhzFURsfvspZ', 'admin_withdrawal', v_withdrawal_amount, 'Admin withdrawal of 80% of available earnings.')
   RETURNING id INTO v_transaction_id;

   -- Return the amount to be sent and the transaction ID for later update
   RETURN QUERY SELECT v_withdrawal_amount, v_transaction_id;
END;
$$ LANGUAGE plpgsql;
