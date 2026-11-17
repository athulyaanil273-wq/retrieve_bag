-- Retrieve Bag – Secure Guest Reporting, Strict RLS & Server-Side Matching Migration
-- Safe and idempotent: preserves all existing public.baggage_reports columns, BIGINT primary key, and records.
-- Does NOT disable RLS or grant unrestricted anonymous SELECT, UPDATE, or DELETE access.
-- Execute this script in the Supabase SQL Editor.

-- ============================================================================
-- 1. Schema & BIGINT Sequence Permissions
-- ============================================================================
grant usage on schema public to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;

do $$
declare
  v_seq text;
begin
  v_seq := pg_get_serial_sequence('public.baggage_reports', 'id');
  if v_seq is not null then
    execute format('grant usage, select on sequence %s to anon, authenticated', v_seq);
  end if;
end $$;

-- ============================================================================
-- 2. Strict RLS on public.baggage_reports, public.baggage_matches & public.notifications
--    - Anonymous users can INSERT validated guest reports (user_id is null).
--    - Anonymous users have ZERO direct SELECT, UPDATE, or DELETE privileges.
--    - Authenticated users can SELECT, UPDATE, and DELETE only their own rows.
--    - Checks information_schema so policies compare uuid = uuid when the
--      existing user_id / recipient_user_id column is UUID, or safely cast
--      auth.uid()::text when a pre-existing column is TEXT (without altering schemas).
-- ============================================================================
alter table public.baggage_reports enable row level security;

revoke all on table public.baggage_reports from public, anon;
grant insert on table public.baggage_reports to anon;
grant select, insert, update, delete on table public.baggage_reports to authenticated;

alter table public.baggage_matches enable row level security;
revoke all on table public.baggage_matches from public, anon;
grant select on table public.baggage_matches to authenticated;

alter table public.notifications enable row level security;
revoke all on table public.notifications from public, anon;
grant select, update on table public.notifications to authenticated;

do $$
declare
  pol record;
  v_reports_uid_type text;
  v_notif_uid_type text;
  v_reports_owner_expr text;
  v_reports_insert_auth_expr text;
  v_reports_insert_anon_expr text;
  v_notif_owner_expr text;
begin
  -- Drop existing policies cleanly for idempotency
  for pol in
    select tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('baggage_reports', 'baggage_matches', 'notifications')
  loop
    execute format('drop policy if exists %I on public.%I', pol.policyname, pol.tablename);
  end loop;

  -- Inspect existing user_id / recipient_user_id column types without modifying table schemas
  select data_type
  into v_reports_uid_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'baggage_reports'
    and column_name = 'user_id';

  select data_type
  into v_notif_uid_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'notifications'
    and column_name = 'recipient_user_id';

  if v_reports_uid_type = 'uuid' then
    v_reports_owner_expr := 'user_id = auth.uid()';
    v_reports_insert_anon_expr := 'auth.role() = ''anon'' and user_id is null';
    v_reports_insert_auth_expr := 'auth.role() = ''authenticated'' and (user_id is null or user_id = auth.uid())';
  else
    v_reports_owner_expr := 'lower(nullif(trim(coalesce(user_id::text, '''')), '''')) = auth.uid()::text';
    v_reports_insert_anon_expr := 'auth.role() = ''anon'' and nullif(trim(coalesce(user_id::text, '''')), '''') is null';
    v_reports_insert_auth_expr := 'auth.role() = ''authenticated'' and (nullif(trim(coalesce(user_id::text, '''')), '''') is null or lower(trim(user_id::text)) = auth.uid()::text)';
  end if;

  if v_notif_uid_type = 'uuid' then
    v_notif_owner_expr := 'recipient_user_id = auth.uid()';
  else
    v_notif_owner_expr := 'lower(nullif(trim(coalesce(recipient_user_id::text, '''')), '''')) = auth.uid()::text';
  end if;

  -- public.baggage_reports policies
  execute format(
    'create policy "Allow validated guest and user inserts"
       on public.baggage_reports for insert
       to anon, authenticated
       with check (
         ((%s) or (%s))
         and report_type in (''lost'', ''found'', ''exchanged'')
         and coalesce(status, ''open'') = ''open''
         and length(trim(coalesce(airport, ''''))) >= 2
         and length(trim(coalesce(distinctive_features, ''''))) >= 1
       )',
    v_reports_insert_anon_expr,
    v_reports_insert_auth_expr
  );

  execute format(
    'create policy "Authenticated users view own reports"
       on public.baggage_reports for select
       to authenticated
       using (%s)',
    v_reports_owner_expr
  );

  execute format(
    'create policy "Authenticated users update own reports"
       on public.baggage_reports for update
       to authenticated
       using (%s)
       with check (%s)',
    v_reports_owner_expr,
    v_reports_owner_expr
  );

  execute format(
    'create policy "Authenticated users delete own reports"
       on public.baggage_reports for delete
       to authenticated
       using (%s)',
    v_reports_owner_expr
  );

  -- public.baggage_matches policy
  execute format(
    'create policy "Authenticated owners view own matches"
       on public.baggage_matches for select
       to authenticated
       using (
         exists (
           select 1
           from public.baggage_reports r
           where (
             r.id::text = trim(coalesce(report_a_id::text, ''''))
             or r.id::text = trim(coalesce(report_b_id::text, ''''))
           )
             and (%s)
         )
       )',
    replace(v_reports_owner_expr, 'user_id', 'r.user_id')
  );

  -- public.notifications policies
  execute format(
    'create policy "Authenticated users view own notifications"
       on public.notifications for select
       to authenticated
       using (
         (%s)
         or exists (
           select 1
           from public.baggage_reports r
           where r.id::text = trim(coalesce(report_id::text, ''''))
             and (%s)
         )
       )',
    v_notif_owner_expr,
    replace(v_reports_owner_expr, 'user_id', 'r.user_id')
  );

  execute format(
    'create policy "Authenticated users mark own notifications read"
       on public.notifications for update
       to authenticated
       using (
         (%s)
         or exists (
           select 1
           from public.baggage_reports r
           where r.id::text = trim(coalesce(report_id::text, ''''))
             and (%s)
         )
       )
       with check (
         (%s)
         or exists (
           select 1
           from public.baggage_reports r
           where r.id::text = trim(coalesce(report_id::text, ''''))
             and (%s)
         )
       )',
    v_notif_owner_expr,
    replace(v_reports_owner_expr, 'user_id', 'r.user_id'),
    v_notif_owner_expr,
    replace(v_reports_owner_expr, 'user_id', 'r.user_id')
  );
end $$;

-- ============================================================================
-- 3. Private Guest Ownership Token Table (No Direct Client Access)
--    Stores SHA-256 hashes of per-browser guest claim tokens without altering
--    existing public.baggage_reports columns or records.
-- ============================================================================
create table if not exists public.guest_report_tokens (
  report_id bigint primary key references public.baggage_reports(id) on delete cascade,
  token_hash text not null,
  created_at timestamptz not null default now()
);

revoke all on table public.guest_report_tokens from public, anon, authenticated;
alter table public.guest_report_tokens enable row level security;

-- ============================================================================
-- 4. Helper Security, Safe UUID Conversion & Ownership Functions
-- ============================================================================
create or replace function public._safe_to_uuid(p_value text)
returns uuid
language plpgsql
immutable
security definer
set search_path = public
as $$
declare
  v_trimmed text := nullif(trim(coalesce(p_value, '')), '');
begin
  if v_trimmed is null then
    return null;
  end if;

  if v_trimmed ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return v_trimmed::uuid;
  end if;

  return null;
end;
$$;

revoke all on function public._safe_to_uuid(text) from public, anon, authenticated;

create or replace function public._safe_to_bigint(p_value text)
returns bigint
language plpgsql
immutable
security definer
set search_path = public
as $$
declare
  v_trimmed text := nullif(trim(coalesce(p_value, '')), '');
begin
  if v_trimmed is null then
    return null;
  end if;

  if v_trimmed ~ '^[0-9]{1,18}$' then
    return v_trimmed::bigint;
  end if;

  return null;
end;
$$;

revoke all on function public._safe_to_bigint(text) from public, anon, authenticated;

create or replace function public._hash_guest_token(p_token text)
returns text
language sql
immutable
security definer
set search_path = public
as $$
  select encode(sha256(convert_to(coalesce(p_token, ''), 'UTF8')), 'hex');
$$;

revoke all on function public._hash_guest_token(text) from public, anon, authenticated;

create or replace function public._is_report_owner(
  p_report_id bigint,
  p_report_ids bigint[] default '{}'::bigint[],
  p_guest_token text default null
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.baggage_reports r
    where r.id = p_report_id
      and (
        (
          auth.uid() is not null
          and public._safe_to_uuid(r.user_id::text) = auth.uid()
        )
        or (
          coalesce(length(trim(p_guest_token)), 0) >= 16
          and r.id = any(coalesce(p_report_ids, '{}'::bigint[]))
          and exists (
            select 1
            from public.guest_report_tokens t
            where t.report_id = r.id
              and t.token_hash = public._hash_guest_token(p_guest_token)
          )
        )
      )
  );
$$;

revoke all on function public._is_report_owner(bigint, bigint[], text) from public, anon, authenticated;

create or replace function public._serialize_baggage_report(
  p_report public.baggage_reports,
  p_mask_private boolean default true
)
returns jsonb
language plpgsql
immutable
security definer
set search_path = public
as $$
begin
  if p_report.id is null then
    return null;
  end if;

  return jsonb_build_object(
    'id', p_report.id,
    'user_id', case when p_mask_private then null else p_report.user_id end,
    'report_type', p_report.report_type,
    'status', p_report.status,
    'airport', p_report.airport,
    'incident_date', p_report.incident_date,
    'bag_type', p_report.bag_type,
    'bag_colour', p_report.bag_colour,
    'brand', p_report.brand,
    'bag_tag_number', case when p_mask_private then null else p_report.bag_tag_number end,
    'distinctive_features', p_report.distinctive_features,
    'created_at', p_report.created_at
  );
end;
$$;

revoke all on function public._serialize_baggage_report(public.baggage_reports, boolean) from public, anon, authenticated;

-- ============================================================================
-- 5. Server-Side Similarity Scoring & Automated Matching Engine
--    Runs inside PostgreSQL as SECURITY DEFINER so raw baggage tag numbers
--    are compared server-side and never exposed to other users.
-- ============================================================================
create or replace function public._normalize_colour_family(p_colour text)
returns text
language plpgsql
immutable
security definer
set search_path = public
as $$
declare
  c text := lower(trim(coalesce(p_colour, '')));
begin
  if c like '%pink%' or c like '%rose%' then return 'pink'; end if;
  if c like '%lavender%' or c like '%purple%' then return 'purple'; end if;
  if c like '%navy%' or c like '%blue%' then return 'blue'; end if;
  if c like '%silver%' or c like '%gray%' or c like '%grey%' then return 'gray'; end if;
  if c like '%red%' or c like '%burgundy%' then return 'red'; end if;
  if c like '%green%' or c like '%olive%' then return 'green'; end if;
  if c like '%beige%' or c like '%champagne%' then return 'beige'; end if;
  return c;
end;
$$;

revoke all on function public._normalize_colour_family(text) from public, anon, authenticated;

create or replace function public._stem_feature_token(p_word text)
returns text
language plpgsql
immutable
security definer
set search_path = public
as $$
declare
  w text := lower(trim(coalesce(p_word, '')));
begin
  case w
    when 'strap', 'straps', 'belt', 'ribbon', 'ribbons', 'band', 'cord', 'tie' then return 'strap';
    when 'sticker', 'stickers', 'decal', 'decals', 'patch', 'patches', 'badge', 'label', 'nametag' then return 'marker';
    when 'lock', 'padlock', 'combo', 'combination' then return 'lock';
    when 'zipper', 'zippers', 'zip' then return 'zipper';
    when 'scratch', 'scratches', 'scuff', 'scuffs', 'dent', 'dents', 'crack', 'cracked', 'worn' then return 'wear';
    when 'wheel', 'wheels', 'spinner' then return 'wheel';
    when 'handle', 'handles' then return 'handle';
    when 'pocket', 'pockets' then return 'pocket';
    when 'pink', 'rose', 'blush', 'magenta' then return 'pink';
    when 'lavender', 'purple', 'violet', 'lilac' then return 'purple';
    when 'navy', 'blue', 'cobalt', 'indigo' then return 'blue';
    when 'silver', 'gray', 'grey', 'charcoal' then return 'gray';
    when 'red', 'crimson', 'burgundy', 'maroon' then return 'red';
    when 'gold', 'golden', 'brass', 'yellow' then return 'gold';
    when 'flower', 'floral', 'flowers' then return 'floral';
    else null;
  end case;

  if length(w) > 5 and right(w, 3) = 'ies' then
    return left(w, length(w) - 3) || 'y';
  elsif length(w) > 5 and right(w, 3) = 'ing' then
    return left(w, length(w) - 3);
  elsif length(w) > 4 and right(w, 2) in ('ed', 'es') then
    return left(w, length(w) - 2);
  elsif length(w) > 3 and right(w, 1) = 's' then
    return left(w, length(w) - 1);
  end if;

  return w;
end;
$$;

revoke all on function public._stem_feature_token(text) from public, anon, authenticated;

create or replace function public.run_baggage_matching_for_report(p_report_id bigint)
returns table(matches_found integer, notifications_created integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_source public.baggage_reports%rowtype;
  v_cand public.baggage_reports%rowtype;
  v_pair text;
  v_score integer;
  v_signals text[];
  v_tag_a text;
  v_tag_b text;
  v_airport_a text;
  v_airport_b text;
  v_brand_a text;
  v_brand_b text;
  v_days_diff integer;
  v_matched_tokens text[];
  v_feature_score integer;
  v_first_id bigint;
  v_second_id bigint;
  v_match_id_text text;
  v_match_rep_a_type text;
  v_match_rep_b_type text;
  v_notif_rep_id_type text;
  v_notif_matched_rep_id_type text;
  v_notif_match_id_type text;
  v_notif_uid_type text;
  v_source_uid_uuid uuid;
  v_cand_uid_uuid uuid;
  v_matches integer := 0;
  v_notifs integer := 0;
  v_row_count integer := 0;
  v_title_target text;
  v_msg_target text;
  v_title_cand text;
  v_msg_cand text;
  v_collection_msg constant text :=
    'Good news! A bag matching your description has been found. Please visit the airport baggage service/front desk to verify ownership and collect your baggage. Carry your baggage tag or other proof of ownership.';
begin
  select * into v_source
  from public.baggage_reports
  where id = p_report_id;

  if not found then
    return query select 0, 0;
    return;
  end if;

  if coalesce(v_source.status, 'open') in ('reunited', 'closed') then
    return query select 0, 0;
    return;
  end if;

  select
    case
      when udt_name in ('int8', 'int4', 'int2') then 'bigint'
      when udt_name = 'uuid' then 'uuid'
      else 'text'
    end
  into v_match_rep_a_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'baggage_matches'
    and column_name = 'report_a_id';

  select
    case
      when udt_name in ('int8', 'int4', 'int2') then 'bigint'
      when udt_name = 'uuid' then 'uuid'
      else 'text'
    end
  into v_match_rep_b_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'baggage_matches'
    and column_name = 'report_b_id';

  select
    case
      when udt_name in ('int8', 'int4', 'int2') then 'bigint'
      when udt_name = 'uuid' then 'uuid'
      else 'text'
    end
  into v_notif_rep_id_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'notifications'
    and column_name = 'report_id';

  select
    case
      when udt_name in ('int8', 'int4', 'int2') then 'bigint'
      when udt_name = 'uuid' then 'uuid'
      else 'text'
    end
  into v_notif_matched_rep_id_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'notifications'
    and column_name = 'matched_report_id';

  select
    case
      when udt_name in ('int8', 'int4', 'int2') then 'bigint'
      when udt_name = 'uuid' then 'uuid'
      else 'text'
    end
  into v_notif_match_id_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'notifications'
    and column_name = 'match_id';

  select data_type
  into v_notif_uid_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'notifications'
    and column_name = 'recipient_user_id';

  v_match_rep_a_type := coalesce(v_match_rep_a_type, 'bigint');
  v_match_rep_b_type := coalesce(v_match_rep_b_type, 'bigint');
  v_notif_rep_id_type := coalesce(v_notif_rep_id_type, 'bigint');
  v_notif_matched_rep_id_type := coalesce(v_notif_matched_rep_id_type, v_notif_rep_id_type);

  v_source_uid_uuid := public._safe_to_uuid(v_source.user_id::text);

  for v_cand in
    select *
    from public.baggage_reports
    where id <> v_source.id
      and coalesce(status, 'open') not in ('reunited', 'closed')
    order by created_at desc
    limit 250
  loop
    v_pair := least(v_source.report_type, v_cand.report_type) || ':' || greatest(v_source.report_type, v_cand.report_type);
    if v_pair not in ('found:lost', 'exchanged:exchanged', 'exchanged:found', 'exchanged:lost') then
      continue;
    end if;

    v_score := 0;
    v_signals := '{}'::text[];

    -- 1. Baggage tag matching (server-side only; never exposed to counterpart)
    v_tag_a := upper(regexp_replace(coalesce(v_source.bag_tag_number, ''), '[^A-Za-z0-9]', '', 'g'));
    v_tag_b := upper(regexp_replace(coalesce(v_cand.bag_tag_number, ''), '[^A-Za-z0-9]', '', 'g'));
    if v_tag_a <> '' and v_tag_b <> '' then
      if v_tag_a = v_tag_b then
        v_score := v_score + 45;
        v_signals := array_append(v_signals, 'Exact baggage tag number match');
      elsif length(v_tag_a) >= 4 and length(v_tag_b) >= 4 and right(v_tag_a, 4) = right(v_tag_b, 4) then
        v_score := v_score + 24;
        v_signals := array_append(v_signals, 'Matching final 4 tag digits (' || right(v_tag_a, 4) || ')');
      end if;
    end if;

    -- 2. Distinctive features overlap (synonyms + stemming)
    select coalesce(array_agg(distinct tok), '{}'::text[])
    into v_matched_tokens
    from (
      select public._stem_feature_token(t) as tok
      from regexp_split_to_table(lower(regexp_replace(coalesce(v_source.distinctive_features, ''), '[^a-z0-9\s]', ' ', 'g')), '\s+') as t
      where length(t) >= 3
        and t not in ('with','from','have','this','that','they','their','there','around','inside','outside','side','front','back','suitcase','luggage','baggage','carry','case','trolley','item','near','airport')
      intersect
      select public._stem_feature_token(t) as tok
      from regexp_split_to_table(lower(regexp_replace(coalesce(v_cand.distinctive_features, ''), '[^a-z0-9\s]', ' ', 'g')), '\s+') as t
      where length(t) >= 3
        and t not in ('with','from','have','this','that','they','their','there','around','inside','outside','side','front','back','suitcase','luggage','baggage','carry','case','trolley','item','near','airport')
    ) sub
    where tok is not null and tok <> '';

    if array_length(v_matched_tokens, 1) > 0 then
      v_feature_score := least(34, 12 + (array_length(v_matched_tokens, 1) - 1) * 7);
      v_score := v_score + v_feature_score;
      v_signals := array_append(
        v_signals,
        'Matching visual features (' || array_to_string(v_matched_tokens[1:4], ', ') || ')'
      );
    end if;

    -- 3. Airport alignment
    v_airport_a := lower(trim(coalesce(v_source.airport, '')));
    v_airport_b := lower(trim(coalesce(v_cand.airport, '')));
    if v_airport_a <> '' and v_airport_b <> '' and (
      v_airport_a = v_airport_b
      or v_airport_a like '%' || v_airport_b || '%'
      or v_airport_b like '%' || v_airport_a || '%'
    ) then
      v_score := v_score + 16;
      v_signals := array_append(v_signals, 'Matching airport (' || v_source.airport || ')');
    end if;

    -- 4. Incident date proximity
    begin
      v_days_diff := abs((v_source.incident_date::date) - (v_cand.incident_date::date));
      if v_days_diff <= 2 then
        v_score := v_score + 10;
        v_signals := array_append(v_signals, 'Incident within 48 hours');
      elsif v_days_diff <= 7 then
        v_score := v_score + 5;
        v_signals := array_append(v_signals, 'Incident within 7 days');
      end if;
    exception when others then
      null;
    end;

    -- 5. Bag type, colour family, brand
    if lower(trim(coalesce(v_source.bag_type, ''))) = lower(trim(coalesce(v_cand.bag_type, ''))) then
      v_score := v_score + 10;
      v_signals := array_append(v_signals, 'Same bag type');
    end if;

    if public._normalize_colour_family(v_source.bag_colour) <> ''
       and public._normalize_colour_family(v_source.bag_colour) = public._normalize_colour_family(v_cand.bag_colour) then
      v_score := v_score + 10;
      v_signals := array_append(v_signals, 'Matching bag colour (' || v_source.bag_colour || ')');
    end if;

    v_brand_a := lower(trim(coalesce(v_source.brand, '')));
    v_brand_b := lower(trim(coalesce(v_cand.brand, '')));
    if v_brand_a <> '' and v_brand_b <> '' and (
      v_brand_a = v_brand_b or v_brand_a like '%' || v_brand_b || '%' or v_brand_b like '%' || v_brand_a || '%'
    ) then
      v_score := v_score + 8;
      v_signals := array_append(v_signals, 'Matching brand (' || coalesce(nullif(v_source.brand, ''), v_cand.brand) || ')');
    end if;

    v_score := least(100, v_score);
    if v_score < 45 then
      continue;
    end if;

    v_first_id := least(v_source.id, v_cand.id);
    v_second_id := greatest(v_source.id, v_cand.id);

    begin
      execute format(
        'insert into public.baggage_matches (report_a_id, report_b_id, similarity_score, matching_signals, status)
         select $1::%s, $2::%s, $3, $4, ''suggested''
         where not exists (
           select 1
           from public.baggage_matches existing
           where existing.report_a_id::text = $1
             and existing.report_b_id::text = $2
         )',
        v_match_rep_a_type,
        v_match_rep_b_type
      )
      using v_first_id::text, v_second_id::text, v_score, v_signals;
    exception when unique_violation then
      null;
    end;

    select id::text into v_match_id_text
    from public.baggage_matches
    where report_a_id::text = v_first_id::text
      and report_b_id::text = v_second_id::text
    limit 1;

    if v_match_id_text is not null then
      v_matches := v_matches + 1;
    end if;

    update public.baggage_reports
    set status = 'potential_match'
    where id in (v_source.id, v_cand.id)
      and coalesce(status, 'open') = 'open';

    -- Build targeted notification messages
    if v_pair = 'found:lost' then
      if v_source.report_type = 'lost' then
        v_title_target := 'Potential matching bag found';
        v_msg_target := v_collection_msg;
        v_title_cand := 'Potential matching lost report detected';
        v_msg_cand := format(
          'A lost baggage report closely matches the bag you reported (%s%% similarity). Please ensure the suitcase is turned in to the airport baggage service/front desk so staff can verify ownership before release.',
          v_score
        );
      else
        v_title_target := 'Potential matching lost report detected';
        v_msg_target := format(
          'A lost baggage report closely matches the bag you reported (%s%% similarity). Please ensure the suitcase is turned in to the airport baggage service/front desk so staff can verify ownership before release.',
          v_score
        );
        v_title_cand := 'Potential matching bag found';
        v_msg_cand := v_collection_msg;
      end if;
    else
      v_title_target := 'Potential exchanged baggage match detected';
      v_msg_target := format(
        'A potentially matching baggage report was detected (%s%% similarity). Please visit the airport baggage service/front desk with your baggage tag or other proof of ownership so staff can verify ownership before any baggage exchange.',
        v_score
      );
      v_title_cand := v_title_target;
      v_msg_cand := v_msg_target;
    end if;

    v_cand_uid_uuid := public._safe_to_uuid(v_cand.user_id::text);

    if v_match_id_text is not null then
      if v_notif_match_id_type is not null then
        begin
          execute format(
            'insert into public.notifications (report_id, matched_report_id, match_id, recipient_user_id, title, message, similarity_score, is_read)
             select $1::%s, $2::%s, $3::%s, $4::%s, $5, $6, $7, false
             where not exists (
               select 1
               from public.notifications existing
               where existing.report_id::text = $1
                 and existing.matched_report_id::text = $2
             )',
            v_notif_rep_id_type,
            v_notif_matched_rep_id_type,
            v_notif_match_id_type,
            case when v_notif_uid_type = 'uuid' then 'uuid' else 'text' end
          )
          using
            v_source.id::text,
            v_cand.id::text,
            v_match_id_text,
            case when v_notif_uid_type = 'uuid' then v_source_uid_uuid::text else v_source.user_id::text end,
            v_title_target,
            v_msg_target,
            v_score;
          get diagnostics v_row_count = row_count;
          v_notifs := v_notifs + v_row_count;
        exception when unique_violation then
          null;
        end;

        begin
          execute format(
            'insert into public.notifications (report_id, matched_report_id, match_id, recipient_user_id, title, message, similarity_score, is_read)
             select $1::%s, $2::%s, $3::%s, $4::%s, $5, $6, $7, false
             where not exists (
               select 1
               from public.notifications existing
               where existing.report_id::text = $1
                 and existing.matched_report_id::text = $2
             )',
            v_notif_rep_id_type,
            v_notif_matched_rep_id_type,
            v_notif_match_id_type,
            case when v_notif_uid_type = 'uuid' then 'uuid' else 'text' end
          )
          using
            v_cand.id::text,
            v_source.id::text,
            v_match_id_text,
            case when v_notif_uid_type = 'uuid' then v_cand_uid_uuid::text else v_cand.user_id::text end,
            v_title_cand,
            v_msg_cand,
            v_score;
          get diagnostics v_row_count = row_count;
          v_notifs := v_notifs + v_row_count;
        exception when unique_violation then
          null;
        end;
      else
        begin
          execute format(
            'insert into public.notifications (report_id, matched_report_id, recipient_user_id, title, message, similarity_score, is_read)
             select $1::%s, $2::%s, $3::%s, $4, $5, $6, false
             where not exists (
               select 1
               from public.notifications existing
               where existing.report_id::text = $1
                 and existing.matched_report_id::text = $2
             )',
            v_notif_rep_id_type,
            v_notif_matched_rep_id_type,
            case when v_notif_uid_type = 'uuid' then 'uuid' else 'text' end
          )
          using
            v_source.id::text,
            v_cand.id::text,
            case when v_notif_uid_type = 'uuid' then v_source_uid_uuid::text else v_source.user_id::text end,
            v_title_target,
            v_msg_target,
            v_score;
          get diagnostics v_row_count = row_count;
          v_notifs := v_notifs + v_row_count;
        exception when unique_violation then
          null;
        end;

        begin
          execute format(
            'insert into public.notifications (report_id, matched_report_id, recipient_user_id, title, message, similarity_score, is_read)
             select $1::%s, $2::%s, $3::%s, $4, $5, $6, false
             where not exists (
               select 1
               from public.notifications existing
               where existing.report_id::text = $1
                 and existing.matched_report_id::text = $2
             )',
            v_notif_rep_id_type,
            v_notif_matched_rep_id_type,
            case when v_notif_uid_type = 'uuid' then 'uuid' else 'text' end
          )
          using
            v_cand.id::text,
            v_source.id::text,
            case when v_notif_uid_type = 'uuid' then v_cand_uid_uuid::text else v_cand.user_id::text end,
            v_title_cand,
            v_msg_cand,
            v_score;
          get diagnostics v_row_count = row_count;
          v_notifs := v_notifs + v_row_count;
        exception when unique_violation then
          null;
        end;
      end if;
    end if;
  end loop;

  return query select v_matches, v_notifs;
end;
$$;

revoke all on function public.run_baggage_matching_for_report(bigint) from public, anon, authenticated;

-- Trigger automatic server-side matching after every INSERT (both RPC and direct anon INSERT)
create or replace function public.trg_after_baggage_report_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.run_baggage_matching_for_report(new.id);
  return new;
end;
$$;

revoke all on function public.trg_after_baggage_report_insert() from public, anon, authenticated;

drop trigger if exists trg_baggage_reports_auto_match on public.baggage_reports;
create trigger trg_baggage_reports_auto_match
  after insert on public.baggage_reports
  for each row execute function public.trg_after_baggage_report_insert();

-- ============================================================================
-- 6. Public RPCs for Secure Guest & Authenticated Report Workflows
-- ============================================================================

-- 6a. Submit a Lost, Found, or Exchanged report and return created report + match counts
create or replace function public.submit_baggage_report(
  p_report_type text,
  p_airport text,
  p_incident_date date,
  p_bag_type text,
  p_bag_colour text,
  p_brand text default null,
  p_bag_tag_number text default null,
  p_distinctive_features text default '',
  p_guest_token text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_inserted public.baggage_reports%rowtype;
  v_matches_found integer := 0;
  v_notifications_created integer := 0;
begin
  if p_report_type not in ('lost', 'found', 'exchanged') then
    raise exception 'Invalid report_type: %. Must be lost, found, or exchanged.', p_report_type;
  end if;

  if length(trim(coalesce(p_airport, ''))) < 2 then
    raise exception 'Airport name is required (minimum 2 characters).';
  end if;

  if length(trim(coalesce(p_distinctive_features, ''))) < 1 then
    raise exception 'Distinctive features are required.';
  end if;

  insert into public.baggage_reports (
    user_id,
    report_type,
    status,
    airport,
    incident_date,
    bag_type,
    bag_colour,
    brand,
    bag_tag_number,
    distinctive_features
  ) values (
    v_user_id,
    p_report_type,
    'open',
    trim(p_airport),
    p_incident_date,
    coalesce(nullif(trim(p_bag_type), ''), 'other'),
    coalesce(nullif(trim(p_bag_colour), ''), 'Other'),
    nullif(trim(coalesce(p_brand, '')), ''),
    nullif(trim(coalesce(p_bag_tag_number, '')), ''),
    trim(p_distinctive_features)
  )
  returning * into v_inserted;

  if v_user_id is null and length(trim(coalesce(p_guest_token, ''))) >= 16 then
    insert into public.guest_report_tokens (report_id, token_hash)
    values (v_inserted.id, public._hash_guest_token(p_guest_token))
    on conflict (report_id) do update
      set token_hash = excluded.token_hash;
  end if;

  -- Reload in case AFTER INSERT trigger updated status to 'potential_match'
  select * into v_inserted
  from public.baggage_reports
  where id = v_inserted.id;

  select count(*)::integer into v_matches_found
  from public.baggage_matches m
  where (m.report_a_id::text = v_inserted.id::text or m.report_b_id::text = v_inserted.id::text)
    and m.status <> 'dismissed';

  select count(*)::integer into v_notifications_created
  from public.notifications n
  where n.report_id::text = v_inserted.id::text
     or n.matched_report_id::text = v_inserted.id::text;

  return jsonb_build_object(
    'report', public._serialize_baggage_report(v_inserted, false),
    'matches_found', v_matches_found,
    'notifications_created', v_notifications_created
  );
end;
$$;

revoke all on function public.submit_baggage_report(text, text, date, text, text, text, text, text, text) from public;
grant execute on function public.submit_baggage_report(text, text, date, text, text, text, text, text, text) to anon, authenticated;

-- 6b. Fetch only reports owned by the signed-in user or verified guest token
create or replace function public.get_my_baggage_reports(
  p_report_ids bigint[] default '{}'::bigint[],
  p_guest_token text default null
)
returns setof jsonb
language sql
stable
security definer
set search_path = public
as $$
  select public._serialize_baggage_report(r, false)
  from public.baggage_reports r
  where public._is_report_owner(r.id, p_report_ids, p_guest_token)
  order by r.created_at desc;
$$;

revoke all on function public.get_my_baggage_reports(bigint[], text) from public;
grant execute on function public.get_my_baggage_reports(bigint[], text) to anon, authenticated;

-- 6c. Fetch matches for owned reports with counterpart bag_tag_number masked
create or replace function public.get_my_baggage_matches(
  p_report_ids bigint[] default '{}'::bigint[],
  p_guest_token text default null
)
returns setof jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', m.id,
    'report_a_id', m.report_a_id,
    'report_b_id', m.report_b_id,
    'similarity_score', m.similarity_score,
    'matching_signals', m.matching_signals,
    'status', m.status,
    'created_at', m.created_at,
    'report_a', public._serialize_baggage_report(
      ra,
      not public._is_report_owner(ra.id, p_report_ids, p_guest_token)
    ),
    'report_b', public._serialize_baggage_report(
      rb,
      not public._is_report_owner(rb.id, p_report_ids, p_guest_token)
    )
  )
  from public.baggage_matches m
  join public.baggage_reports ra on ra.id::text = trim(coalesce(m.report_a_id::text, ''))
  join public.baggage_reports rb on rb.id::text = trim(coalesce(m.report_b_id::text, ''))
  where public._is_report_owner(ra.id, p_report_ids, p_guest_token)
     or public._is_report_owner(rb.id, p_report_ids, p_guest_token)
  order by m.similarity_score desc, m.created_at desc;
$$;

revoke all on function public.get_my_baggage_matches(bigint[], text) from public;
grant execute on function public.get_my_baggage_matches(bigint[], text) to anon, authenticated;

-- 6d. Fetch single match detail (only for participants, with counterpart tag masked)
drop function if exists public.get_my_match_by_id(text, bigint[], text);
drop function if exists public.get_my_match_by_id(uuid, bigint[], text);

create or replace function public.get_my_match_by_id(
  p_match_id uuid,
  p_report_ids bigint[] default '{}'::bigint[],
  p_guest_token text default null
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', m.id,
    'report_a_id', m.report_a_id,
    'report_b_id', m.report_b_id,
    'similarity_score', m.similarity_score,
    'matching_signals', m.matching_signals,
    'status', m.status,
    'created_at', m.created_at,
    'report_a', public._serialize_baggage_report(
      ra,
      not public._is_report_owner(ra.id, p_report_ids, p_guest_token)
    ),
    'report_b', public._serialize_baggage_report(
      rb,
      not public._is_report_owner(rb.id, p_report_ids, p_guest_token)
    )
  )
  from public.baggage_matches m
  join public.baggage_reports ra on ra.id::text = trim(coalesce(m.report_a_id::text, ''))
  join public.baggage_reports rb on rb.id::text = trim(coalesce(m.report_b_id::text, ''))
  where lower(m.id::text) = p_match_id::text
    and (
      public._is_report_owner(ra.id, p_report_ids, p_guest_token)
      or public._is_report_owner(rb.id, p_report_ids, p_guest_token)
    )
  limit 1;
$$;

revoke all on function public.get_my_match_by_id(uuid, bigint[], text) from public;
grant execute on function public.get_my_match_by_id(uuid, bigint[], text) to anon, authenticated;

-- 6e. Fetch notifications for owned reports (counterpart tag masked)
create or replace function public.get_my_notifications(
  p_report_ids bigint[] default '{}'::bigint[],
  p_guest_token text default null
)
returns setof jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', n.id,
    'report_id', n.report_id,
    'matched_report_id', n.matched_report_id,
    'match_id', n.match_id,
    'recipient_user_id', n.recipient_user_id,
    'title', n.title,
    'message', n.message,
    'similarity_score', n.similarity_score,
    'is_read', n.is_read,
    'created_at', n.created_at,
    'report', public._serialize_baggage_report(r_own, false),
    'matched_report', case
      when r_match.id is null then null
      else public._serialize_baggage_report(r_match, true)
    end
  )
  from public.notifications n
  join public.baggage_reports r_own on r_own.id::text = trim(coalesce(n.report_id::text, ''))
  left join public.baggage_reports r_match on r_match.id::text = trim(coalesce(n.matched_report_id::text, ''))
  where public._is_report_owner(public._safe_to_bigint(n.report_id::text), p_report_ids, p_guest_token)
     or (
       auth.uid() is not null
       and public._safe_to_uuid(n.recipient_user_id::text) = auth.uid()
     )
  order by n.created_at desc;
$$;

revoke all on function public.get_my_notifications(bigint[], text) from public;
grant execute on function public.get_my_notifications(bigint[], text) to anon, authenticated;

-- 6f. Mark owned notifications as read
drop function if exists public.mark_my_notifications_read(text[], bigint[], text);

create or replace function public.mark_my_notifications_read(
  p_notification_ids uuid[],
  p_report_ids bigint[] default '{}'::bigint[],
  p_guest_token text default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated integer := 0;
begin
  update public.notifications n
  set is_read = true
  where lower(n.id::text) = any(coalesce(p_notification_ids, '{}'::uuid[])::text[])
    and (
      public._is_report_owner(public._safe_to_bigint(n.report_id::text), p_report_ids, p_guest_token)
      or (
        auth.uid() is not null
        and public._safe_to_uuid(n.recipient_user_id::text) = auth.uid()
      )
    );

  get diagnostics v_updated = row_count;
  return v_updated;
end;
$$;

revoke all on function public.mark_my_notifications_read(uuid[], bigint[], text) from public;
grant execute on function public.mark_my_notifications_read(uuid[], bigint[], text) to anon, authenticated;

-- 6g. Owner-verified status update (e.g., Mark Reunited) without unrestricted anon UPDATE
create or replace function public.update_my_report_status(
  p_report_id bigint,
  p_status text,
  p_report_ids bigint[] default '{}'::bigint[],
  p_guest_token text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated public.baggage_reports%rowtype;
begin
  if p_status not in ('open', 'potential_match', 'verification_pending', 'reunited', 'closed') then
    raise exception 'Invalid status value: %', p_status;
  end if;

  if not public._is_report_owner(p_report_id, p_report_ids, p_guest_token) then
    raise exception 'Not authorized to update report %.', p_report_id using errcode = '42501';
  end if;

  update public.baggage_reports
  set status = p_status
  where id = p_report_id
  returning * into v_updated;

  return public._serialize_baggage_report(v_updated, false);
end;
$$;

revoke all on function public.update_my_report_status(bigint, text, bigint[], text) from public;
grant execute on function public.update_my_report_status(bigint, text, bigint[], text) to anon, authenticated;

-- 6h. Owner-verified report deletion without unrestricted anon DELETE
create or replace function public.delete_my_report(
  p_report_id bigint,
  p_report_ids bigint[] default '{}'::bigint[],
  p_guest_token text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public._is_report_owner(p_report_id, p_report_ids, p_guest_token) then
    raise exception 'Not authorized to delete report %.', p_report_id using errcode = '42501';
  end if;

  delete from public.baggage_reports where id = p_report_id;
  return found;
end;
$$;

revoke all on function public.delete_my_report(bigint, bigint[], text) from public;
grant execute on function public.delete_my_report(bigint, bigint[], text) to anon, authenticated;
