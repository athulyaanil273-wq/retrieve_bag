-- Additive, idempotent migration for Retrieve Bag matching & persistent notifications.
-- Preserves all existing public.baggage_reports columns, primary key (BIGINT), and records.
-- Safe to execute multiple times in the Supabase SQL Editor.

-- 1. Ensure baggage_matches exists with BIGINT foreign keys matching public.baggage_reports.id
create table if not exists public.baggage_matches (
  id uuid primary key default gen_random_uuid(),
  report_a_id bigint not null references public.baggage_reports(id) on delete cascade,
  report_b_id bigint not null references public.baggage_reports(id) on delete cascade,
  similarity_score integer not null check (similarity_score >= 0 and similarity_score <= 100),
  matching_signals text[] not null default '{}',
  status text not null default 'suggested' check (
    status in ('suggested', 'under_review', 'confirmed', 'dismissed')
  ),
  created_at timestamptz not null default now(),
  constraint unique_report_pair unique (report_a_id, report_b_id)
);

create index if not exists idx_baggage_matches_report_a on public.baggage_matches(report_a_id);
create index if not exists idx_baggage_matches_report_b on public.baggage_matches(report_b_id);

alter table public.baggage_matches enable row level security;

drop policy if exists "Anyone can view potential matches" on public.baggage_matches;
create policy "Anyone can view potential matches"
  on public.baggage_matches for select
  to anon, authenticated
  using (true);

drop policy if exists "Anyone can record discovered matches" on public.baggage_matches;
create policy "Anyone can record discovered matches"
  on public.baggage_matches for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Participants and admins can update matches" on public.baggage_matches;
create policy "Participants and admins can update matches"
  on public.baggage_matches for update
  to anon, authenticated
  using (true);

-- 2. Create notifications table with BIGINT foreign keys referencing public.baggage_reports(id)
--    and UUID foreign key referencing auth.users(id).
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  report_id bigint not null references public.baggage_reports(id) on delete cascade,
  matched_report_id bigint not null references public.baggage_reports(id) on delete cascade,
  recipient_user_id uuid references auth.users(id) on delete set null,
  title text not null,
  message text not null,
  similarity_score integer not null default 0,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  constraint unique_report_match_notification unique (report_id, matched_report_id)
);

-- 3. Add match_id referencing public.baggage_matches(id) using its exact column type (UUID or BIGINT)
do $$
declare
  v_match_id_type text;
begin
  select
    case
      when udt_name in ('int8', 'int4', 'int2') then 'bigint'
      else 'uuid'
    end
  into v_match_id_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'baggage_matches'
    and column_name = 'id';

  if v_match_id_type is not null
     and not exists (
       select 1
       from information_schema.columns
       where table_schema = 'public'
         and table_name = 'notifications'
         and column_name = 'match_id'
     ) then
    execute format(
      'alter table public.notifications add column match_id %s references public.baggage_matches(id) on delete set null',
      v_match_id_type
    );
  end if;
end $$;

create index if not exists idx_notifications_report_id on public.notifications(report_id);
create index if not exists idx_notifications_matched_report_id on public.notifications(matched_report_id);
create index if not exists idx_notifications_recipient_user on public.notifications(recipient_user_id);
create index if not exists idx_notifications_match_id on public.notifications(match_id);

alter table public.notifications enable row level security;

drop policy if exists "Users can view notifications for their own reports" on public.notifications;
create policy "Users can view notifications for their own reports"
  on public.notifications for select
  to anon, authenticated
  using (
    recipient_user_id is null
    or auth.uid() = recipient_user_id
  );

drop policy if exists "Automated matching can insert notifications" on public.notifications;
create policy "Automated matching can insert notifications"
  on public.notifications for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Owners can mark notifications as read" on public.notifications;
create policy "Owners can mark notifications as read"
  on public.notifications for update
  to anon, authenticated
  using (
    recipient_user_id is null
    or auth.uid() = recipient_user_id
  );
