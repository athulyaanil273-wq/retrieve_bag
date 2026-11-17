-- Retrieve Bag – Supabase Database Schema, Guest Reporting Support & Row Level Security
-- Run this script in the Supabase SQL Editor for your project.

-- 1. Profiles table (optional passenger accounts & staff/admin roles)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  role text not null default 'passenger' check (role in ('passenger', 'admin')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1), 'Traveler'),
    coalesce(new.email, ''),
    'passenger'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Only administrators can change user roles.';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_profile_role_protection on public.profiles;
create trigger enforce_profile_role_protection
  before update on public.profiles
  for each row execute function public.prevent_role_escalation();

create policy "Users can view own profile or admins view all"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id or public.is_admin());

create policy "Users can insert own passenger profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id and role = 'passenger');

create policy "Users can update own profile without changing role"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id or public.is_admin())
  with check (auth.uid() = id or public.is_admin());

-- 2. Baggage reports table (supports direct guest reporting without mandatory sign-in)
create table if not exists public.baggage_reports (
  id uuid primary key default gen_random_uuid(),
  reference_code text not null unique,
  user_id uuid references auth.users(id) on delete set null,
  report_type text not null check (report_type in ('lost', 'found', 'exchanged')),
  status text not null default 'open' check (
    status in ('open', 'potential_match', 'verification_pending', 'reunited', 'closed')
  ),
  airport_code text not null,
  terminal_or_carousel text,
  flight_number text,
  incident_date date not null,
  bag_type text not null,
  color text not null,
  brand text,
  tag_number text,
  distinctive_features text not null,
  image_url text,
  expected_bag_type text,
  expected_color text,
  expected_brand text,
  expected_tag_number text,
  expected_distinctive_features text,
  created_at timestamptz not null default now()
);

create index if not exists idx_baggage_reports_user_id on public.baggage_reports(user_id);
create index if not exists idx_baggage_reports_reference_code on public.baggage_reports(reference_code);
create index if not exists idx_baggage_reports_airport_type on public.baggage_reports(airport_code, report_type);

alter table public.baggage_reports enable row level security;

create policy "Anyone can view non-PII baggage reports for matching"
  on public.baggage_reports for select
  to anon, authenticated
  using (true);

create policy "Anyone can submit a baggage report directly"
  on public.baggage_reports for insert
  to anon, authenticated
  with check (user_id is null or auth.uid() = user_id);

create policy "Owners, guest reporters, or admins can update reports"
  on public.baggage_reports for update
  to anon, authenticated
  using (user_id is null or auth.uid() = user_id or public.is_admin())
  with check (user_id is null or auth.uid() = user_id or public.is_admin());

create policy "Owners, guest reporters, or admins can delete reports"
  on public.baggage_reports for delete
  to anon, authenticated
  using (user_id is null or auth.uid() = user_id or public.is_admin());

-- 3. Baggage matches table
create table if not exists public.baggage_matches (
  id uuid primary key default gen_random_uuid(),
  report_a_id uuid not null references public.baggage_reports(id) on delete cascade,
  report_b_id uuid not null references public.baggage_reports(id) on delete cascade,
  similarity_score integer not null check (similarity_score >= 0 and similarity_score <= 100),
  matching_signals text[] not null default '{}',
  status text not null default 'suggested' check (
    status in ('suggested', 'under_review', 'confirmed', 'dismissed')
  ),
  created_at timestamptz not null default now(),
  constraint unique_report_pair unique (report_a_id, report_b_id)
);

alter table public.baggage_matches enable row level security;

create policy "Anyone can view potential matches"
  on public.baggage_matches for select
  to anon, authenticated
  using (true);

create policy "Anyone can record discovered matches"
  on public.baggage_matches for insert
  to anon, authenticated
  with check (true);

create policy "Participants and admins can update matches"
  on public.baggage_matches for update
  to anon, authenticated
  using (true);

-- 4. Connection requests table
create table if not exists public.connection_requests (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.baggage_matches(id) on delete cascade,
  requester_id uuid references auth.users(id) on delete set null,
  recipient_id uuid references auth.users(id) on delete set null,
  requester_report_id uuid not null references public.baggage_reports(id) on delete cascade,
  recipient_report_id uuid not null references public.baggage_reports(id) on delete cascade,
  requester_email text,
  message text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  shared_contact text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint unique_match_requester_report unique (match_id, requester_report_id)
);

alter table public.connection_requests enable row level security;

create policy "Anyone can view connection requests for their tracked match"
  on public.connection_requests for select
  to anon, authenticated
  using (true);

create policy "Anyone can send a pending connection request"
  on public.connection_requests for insert
  to anon, authenticated
  with check (requester_report_id <> recipient_report_id and status = 'pending');

create policy "Recipients or admins can update connection requests"
  on public.connection_requests for update
  to anon, authenticated
  using (true);

-- 5. Contact details table
create table if not exists public.baggage_report_contacts (
  report_id uuid primary key references public.baggage_reports(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  contact_name text not null,
  contact_email text not null,
  created_at timestamptz not null default now()
);

alter table public.baggage_report_contacts enable row level security;

create policy "Contacts accessible to owner, admin, or lookup by email/approved match"
  on public.baggage_report_contacts for select
  to anon, authenticated
  using (
    auth.uid() = user_id
    or public.is_admin()
    or exists (
      select 1 from public.connection_requests cr
      where cr.status = 'approved'
        and (cr.requester_report_id = report_id or cr.recipient_report_id = report_id)
    )
    or user_id is null
  );

create policy "Anyone can attach contact details to a new report"
  on public.baggage_report_contacts for insert
  to anon, authenticated
  with check (user_id is null or auth.uid() = user_id);

-- 6. Storage bucket for optional baggage images
insert into storage.buckets (id, name, public)
values ('baggage-images', 'baggage-images', true)
on conflict (id) do nothing;

create policy "Anyone can upload baggage images to guest or own folder"
  on storage.objects for insert
  to anon, authenticated
  with check (
    bucket_id = 'baggage-images'
    and (
      (storage.foldername(name))[1] = 'guest'
      or (storage.foldername(name))[1] = auth.uid()::text
    )
  );

create policy "Public read access for baggage images"
  on storage.objects for select
  to public
  using (bucket_id = 'baggage-images');
