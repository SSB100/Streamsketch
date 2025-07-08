-- This function atomically spends a single line credit and inserts all segments for that one stroke.
-- This is the primary function for all drawing operations.
create or replace function spend_credit_and_draw_stroke(
    p_drawer_wallet_address text,
    p_session_id uuid,
    p_segments jsonb[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_user_id uuid;
    v_free_lines_spent int := 0;
    v_paid_lines_spent int := 0;
    v_standard_credits int;
    v_discounted_credits int;
    v_session_free_lines int;
begin
    -- Get the user's ID
    select id into v_user_id from users where wallet_address = p_drawer_wallet_address;
    if v_user_id is null then
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
        v_free_lines_spent := 1;
    else
        -- If no free credits, use a paid credit
        -- Lock the user row to prevent race conditions on credit updates
        select line_credits_standard, line_credits_discounted
        into v_standard_credits, v_discounted_credits
        from users
        where id = v_user_id
        for update;

        if (v_standard_credits + v_discounted_credits) < 1 then
            raise exception 'Insufficient paid line credits.';
        end if;

        -- Logic to spend discounted credits first
        if v_discounted_credits > 0 then
            update users set line_credits_discounted = line_credits_discounted - 1 where id = v_user_id;
        else
            update users set line_credits_standard = line_credits_standard - 1 where id = v_user_id;
        end if;
        v_paid_lines_spent := 1;
    end if;

    -- Now, insert all drawing segments for the stroke using a more efficient unnest
    if array_length(p_segments, 1) > 0 then
        insert into drawings(session_id, drawer_wallet_address, drawing_data)
        select p_session_id, p_drawer_wallet_address, unnest_segment
        from unnest(p_segments) as unnest_segment;
    end if;

end;
$$;
