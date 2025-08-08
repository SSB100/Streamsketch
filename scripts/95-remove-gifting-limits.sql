-- Purpose: Remove weekly gifting limits. Redefine RPC to allow unlimited free gifting.
-- Notes:
-- - Keeps function signature used by the app:
--     gift_credits_to_session(p_owner_wallet uuid/text, p_session_id uuid, p_viewer_wallet text, p_lines_to_gift int, p_nukes_to_gift int)
-- - Returns a human-readable message (TEXT) as expected by the UI.
-- - Increments per-session free credit balances without any weekly cap or reset logic.
-- - Assumes unique key (session_id, user_wallet_address) on session_free_line_credits and session_free_nuke_credits.

create or replace function public.gift_credits_to_session(
  p_owner_wallet text,
  p_session_id uuid,
  p_viewer_wallet text,
  p_lines_to_gift integer,
  p_nukes_to_gift integer
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lines integer := coalesce(p_lines_to_gift, 0);
  v_nukes integer := coalesce(p_nukes_to_gift, 0);
begin
  if (v_lines < 0 or v_nukes < 0) then
    raise exception 'Cannot gift negative credits.';
  end if;

  if (v_lines = 0 and v_nukes = 0) then
    return 'Nothing to gift.';
  end if;

  -- Ensure target session exists
  perform 1 from public.sessions s where s.id = p_session_id;
  if not found then
    raise exception 'Session not found.';
  end if;

  -- Lines: upsert add
  if v_lines > 0 then
    insert into public.session_free_line_credits (session_id, user_wallet_address, amount)
    values (p_session_id, p_viewer_wallet, v_lines)
    on conflict (session_id, user_wallet_address)
    do update set amount = public.session_free_line_credits.amount + excluded.amount;
  end if;

  -- Nukes: upsert add
  if v_nukes > 0 then
    insert into public.session_free_nuke_credits (session_id, user_wallet_address, amount)
    values (p_session_id, p_viewer_wallet, v_nukes)
    on conflict (session_id, user_wallet_address)
    do update set amount = public.session_free_nuke_credits.amount + excluded.amount;
  end if;

  return format('Gifted %s lines and %s nukes to %s for session %s.',
                v_lines, v_nukes, p_viewer_wallet, p_session_id);
exception
  when others then
    -- Surface the error to client while keeping a consistent type
    raise;
end;
$$;

comment on function public.gift_credits_to_session(text, uuid, text, integer, integer)
  is 'Gifts unlimited free lines/nukes to a viewer for a session. No weekly caps.';

-- Optional: keep a compatibility function so other code that queried prior weekly limits won''t break.
-- We return zeros to indicate "no tracked weekly caps".
create or replace function public.get_gifting_limits(p_streamer_wallet_address text)
returns table (lines_gifted integer, nukes_gifted integer)
language sql
stable
as $$
  select 0::int as lines_gifted, 0::int as nukes_gifted;
$$;
