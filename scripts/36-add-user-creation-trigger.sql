-- This migration makes user creation atomic by adding a database trigger.
-- Now, whenever a new user is inserted, their revenue entry is created automatically.

-- Step 1: Create the trigger function
-- This function will be called automatically whenever a new user is created.
CREATE OR REPLACE FUNCTION public.create_revenue_entry_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert a corresponding row into the revenue table for the new user.
    -- The ON CONFLICT clause handles cases where a revenue entry might already exist,
    -- preventing errors and ensuring idempotency.
    INSERT INTO public.revenue (streamer_wallet_address, unclaimed_sol, total_claimed_sol)
    VALUES (NEW.wallet_address, 0, 0)
    ON CONFLICT (streamer_wallet_address) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Create the trigger on the users table
-- This trigger will fire AFTER a new row is inserted into the 'users' table.
-- We drop it first to ensure the script can be run multiple times safely.
DROP TRIGGER IF EXISTS on_new_user_created ON public.users;
CREATE TRIGGER on_new_user_created
    AFTER INSERT ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.create_revenue_entry_for_new_user();
