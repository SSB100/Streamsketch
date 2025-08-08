-- Update record_drawing to also write to session_revenue_ledger.
-- Keeps same signature/API used by the app.
-- New per-line pricing from script 96 is preserved here.

create or replace function public.record_drawing(
  p_drawer_wallet_address text,
  p_session_id uuid,
  p_drawing_data jsonb
)
returns setof public.drawings
language plpgsql
security definer
as $$
declare
  v_streamer_wallet_address text;
  v_free_credits int;
  v_paid_credits_standard int;
  v_paid_credits_discounted int;
  v_revenue_per_line numeric;
  v_streamer_share_rate numeric := 0.8; -- 80%
  v_streamer_share numeric;

  v_tx_id bigint;
  v_drawing_id bigint;
  v_source text;
begin
  -- Validate session and get owner
  select owner_wallet_address
    into v_streamer_wallet_address
  from public.sessions
  where id = p_session_id;

  if v_streamer_wallet_address is null then
    raise exception 'Session not found';
  end if;

  -- 1) Consume free session credits first (no revenue)
  select amount
    into v_free_credits
  from public.session_free_line_credits
  where user_wallet_address = p_drawer_wallet_address
    and session_id = p_session_id
  for update;

  if v_free_credits is not null and v_free_credits > 0 then
    update public.session_free_line_credits
      set amount = amount - 1
    where user_wallet_address = p_drawer_wallet_address
      and session_id = p_session_id;

    -- Log free draw usage
    insert into public.transactions (user_wallet_address, transaction_type, sol_amount, notes)
    values (p_drawer_wallet_address, 'draw_line_free', 0, 'Session ID: ' || p_session_id);

    -- Insert drawing and return it
    insert into public.drawings (session_id, drawer_wallet_address, drawing_data)
    values (p_session_id, p_drawer_wallet_address, p_drawing_data)
    returning id into v_drawing_id;

    -- Optional ledger entry for free (kept for analytics completeness)
    insert into public.session_revenue_ledger(
      session_id, streamer_wallet_address, user_wallet_address,
      revenue_type, source, gross_sol, streamer_share_sol, transaction_id, drawing_id
    ) values (
      p_session_id, v_streamer_wallet_address, p_drawer_wallet_address,
      'line', 'line_free', 0, 0, null, v_drawing_id
    );

    return query select * from public.drawings where id = v_drawing_id;

  else
    -- 2) Otherwise consume paid credits (standard first, then discounted)
    select line_credits_standard, line_credits_discounted
      into v_paid_credits_standard, v_paid_credits_discounted
    from public.users
    where wallet_address = p_drawer_wallet_address
    for update;

    if v_paid_credits_standard > 0 then
      update public.users
         set line_credits_standard = line_credits_standard - 1
       where wallet_address = p_drawer_wallet_address;
      v_revenue_per_line := 0.001;  -- 10-pack @ 0.01 SOL
      v_source := 'line_standard';

    elsif v_paid_credits_discounted > 0 then
      update public.users
         set line_credits_discounted = line_credits_discounted - 1
       where wallet_address = p_drawer_wallet_address;
      v_revenue_per_line := 0.0008; -- 50-pack @ 0.04 SOL
      v_source := 'line_discounted';

    else
      raise exception 'Insufficient credits';
    end if;

    -- Compute and credit streamer share
    v_streamer_share := v_revenue_per_line * v_streamer_share_rate;

    update public.revenue
       set unclaimed_sol = unclaimed_sol + v_streamer_share
     where streamer_wallet_address = v_streamer_wallet_address;

    -- Log gross revenue at the transaction level and capture ID
    insert into public.transactions (user_wallet_address, transaction_type, sol_amount, notes)
    values (p_drawer_wallet_address, 'draw_line', v_revenue_per_line, 'Session ID: ' || p_session_id)
    returning id into v_tx_id;

    -- Insert drawing and return it
    insert into public.drawings (session_id, drawer_wallet_address, drawing_data)
    values (p_session_id, p_drawer_wallet_address, p_drawing_data)
    returning id into v_drawing_id;

    -- Ledger entry for analytics and future reporting
    insert into public.session_revenue_ledger(
      session_id, streamer_wallet_address, user_wallet_address,
      revenue_type, source, gross_sol, streamer_share_sol, transaction_id, drawing_id
    ) values (
      p_session_id, v_streamer_wallet_address, p_drawer_wallet_address,
      'line', v_source, v_revenue_per_line, v_streamer_share, v_tx_id, v_drawing_id
    );

    return query select * from public.drawings where id = v_drawing_id;
  end if;
end;
$$;

-- Permissions: allow execution for anon/auth (matches prior behavior of other RPCs)
grant execute on function public.record_drawing(text, uuid, jsonb) to anon, authenticated;
