-- This function atomically spends multiple line credits and inserts a batch of drawing segments.
-- This is more performant than calling the single-stroke function repeatedly.
create or replace function spend_credits_and_draw_strokes_batch(
    p_drawer_wallet_address text,
    p_session_id uuid,
    p_stroke_count int,
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
    v_total_lines_to_spend int := p_stroke_count;
    v_segment jsonb;
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

    -- Use free session credits first
    if v_session_free_lines > 0 then
        v_free_lines_spent := least(v_total_lines_to_spend, v_session_free_lines);
        
        update session_free_line_credits
        set amount = amount - v_free_lines_spent
        where user_wallet_address = p_drawer_wallet_address and session_id = p_session_id;
        
        v_total_lines_to_spend := v_total_lines_to_spend - v_free_lines_spent;
    end if;

    -- If more lines are needed, use paid credits
    if v_total_lines_to_spend > 0 then
        -- Lock the user row to prevent race conditions on credit updates
        select line_credits_standard, line_credits_discounted
        into v_standard_credits, v_discounted_credits
        from users
        where id = v_user_id
        for update;

        if (v_standard_credits + v_discounted_credits) < v_total_lines_to_spend then
            raise exception 'Insufficient paid line credits. Has %, needs %', (v_standard_credits + v_discounted_credits), v_total_lines_to_spend;
        end if;

        -- Logic to spend discounted credits first
        v_paid_lines_spent := least(v_total_lines_to_spend, v_discounted_credits);
        if v_paid_lines_spent > 0 then
            update users set line_credits_discounted = line_credits_discounted - v_paid_lines_spent where id = v_user_id;
            v_total_lines_to_spend := v_total_lines_to_spend - v_paid_lines_spent;
        end if;

        -- Spend standard credits if still more are needed
        if v_total_lines_to_spend > 0 then
            update users set line_credits_standard = line_credits_standard - v_total_lines_to_spend where id = v_user_id;
        end if;
    end if;

    -- Now, insert all drawing segments using a more efficient unnest
    if array_length(p_segments, 1) > 0 then
        insert into drawings(session_id, drawer_wallet_address, drawing_data)
        select p_session_id, p_drawer_wallet_address, unnest_segment
        from unnest(p_segments) as unnest_segment;
    end if;

end;
$$;
