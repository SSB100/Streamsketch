-- This function atomically spends a single line credit and inserts ONE ROW for the entire stroke.
create or replace function spend_credit_and_draw_stroke(
    p_drawer_wallet_address text,
    p_session_id uuid,
    p_stroke_data jsonb -- A single JSONB object representing the entire stroke
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_standard_credits int;
    v_discounted_credits int;
    v_session_free_lines int;
    v_streamer_wallet_address text;
begin
    -- Check if user exists
    if not exists (select 1 from users where wallet_address = p_drawer_wallet_address) then
        raise exception 'User not found for wallet address %', p_drawer_wallet_address;
    end if;

    -- Get session-specific free line credits
    select amount into v_session_free_lines
    from session_free_line_credits
    where user_wallet_address = p_drawer_wallet_address and session_id = p_session_id;

    if v_session_free_lines is null then
        v_session_free_lines := 0;
    end if;

    -- Use a free session credit if available
    if v_session_free_lines > 0 then
        update session_free_line_credits
        set amount = amount - 1
        where user_wallet_address = p_drawer_wallet_address and session_id = p_session_id;
    else
        -- If no free credits, use a paid credit
        -- Lock the user row to prevent race conditions on credit updates
        select line_credits_standard, line_credits_discounted
        into v_standard_credits, v_discounted_credits
        from users
        where wallet_address = p_drawer_wallet_address
        for update;

        if (v_standard_credits + v_discounted_credits) < 1 then
            raise exception 'Insufficient paid line credits.';
        end if;

        -- Logic to spend discounted credits first
        if v_discounted_credits > 0 then
            update users set line_credits_discounted = line_credits_discounted - 1 where wallet_address = p_drawer_wallet_address;
        else
            update users set line_credits_standard = line_credits_standard - 1 where wallet_address = p_drawer_wallet_address;
        end if;
        
        -- Add revenue for the streamer for paid lines
        select owner_wallet_address into v_streamer_wallet_address
        from public.sessions
        where id = p_session_id;

        if v_streamer_wallet_address is not null then
            update public.revenue
            set unclaimed_sol = unclaimed_sol + (0.00005 * 0.5) -- 0.00005 SOL per line, 50% share
            where streamer_wallet_address = v_streamer_wallet_address;
        end if;
    end if;

    -- Now, insert the single stroke data as one row.
    insert into public.drawings (session_id, drawer_wallet_address, drawing_data)
    values (p_session_id, p_drawer_wallet_address, p_stroke_data);

end;
$$;
