-- Smartrain: komplettes Datenbank-Setup für ein neues, leeres Supabase-Projekt.
--
-- Erzeugt mit `npm run db:setup-sql` aus supabase/schema.sql und allen Dateien
-- in supabase/migrations. Nicht von Hand bearbeiten.
--
-- Ausführen: Supabase Dashboard > SQL Editor > New query > Inhalt einfügen > Run.

-- ============================================================
-- schema.sql
-- ============================================================

create extension if not exists "pgcrypto";

do $$
begin
  create type public.team_role as enum ('owner', 'coach', 'player', 'parent');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.member_status as enum ('active', 'pending', 'inactive');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.event_type as enum ('training', 'game', 'meeting', 'event');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.response_status as enum ('yes', 'no', 'maybe');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.task_status as enum ('open', 'done');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  phone text,
  jersey_number integer,
  position text,
  birthday date,
  emergency_contact_name text,
  emergency_contact_phone text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists jersey_number integer;
alter table public.profiles add column if not exists position text;
alter table public.profiles add column if not exists birthday date;
alter table public.profiles add column if not exists emergency_contact_name text;
alter table public.profiles add column if not exists emergency_contact_phone text;
alter table public.profiles add column if not exists updated_at timestamptz not null default timezone('utc', now());

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sport text not null default 'Football',
  season text not null default to_char(current_date, 'YYYY'),
  logo_url text,
  theme_color text not null default '#115e59',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.teams add column if not exists sport text;
alter table public.teams add column if not exists season text;
alter table public.teams add column if not exists logo_url text;
alter table public.teams add column if not exists theme_color text;
alter table public.teams add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.teams add column if not exists updated_at timestamptz not null default timezone('utc', now());

update public.teams
set
  sport = coalesce(nullif(sport, ''), 'Football'),
  season = coalesce(nullif(season, ''), to_char(current_date, 'YYYY')),
  theme_color = coalesce(nullif(theme_color, ''), '#115e59')
where sport is null
   or season is null
   or theme_color is null;

alter table public.teams alter column sport set default 'Football';
alter table public.teams alter column sport set not null;
alter table public.teams alter column season set default to_char(current_date, 'YYYY');
alter table public.teams alter column season set not null;
alter table public.teams alter column theme_color set default '#115e59';
alter table public.teams alter column theme_color set not null;

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.team_role not null default 'player',
  status public.member_status not null default 'active',
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique(team_id, user_id)
);

alter table public.team_members add column if not exists status public.member_status not null default 'active';
alter table public.team_members add column if not exists invited_by uuid references auth.users(id) on delete set null;
alter table public.team_members add column if not exists updated_at timestamptz not null default timezone('utc', now());
alter table public.team_members alter column role type public.team_role using role::public.team_role;

create table if not exists public.team_invites (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  code text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
  token text,
  team_name text not null,
  team_sport text not null,
  role public.team_role not null default 'player',
  is_active boolean not null default true,
  expires_at timestamptz,
  last_used_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  title text not null,
  type public.event_type not null default 'training',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  location text,
  description text,
  response_deadline timestamptz,
  max_participants integer check (max_participants is null or max_participants between 1 and 500),
  is_cancelled boolean not null default false,
  opponent text,
  score_for integer,
  score_against integer,
  report_summary text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.events add column if not exists response_deadline timestamptz;
alter table public.events add column if not exists max_participants integer;
alter table public.events add column if not exists is_cancelled boolean not null default false;
alter table public.events add column if not exists opponent text;
alter table public.events add column if not exists score_for integer;
alter table public.events add column if not exists score_against integer;
alter table public.events add column if not exists report_summary text;

create table if not exists public.event_responses (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status public.response_status not null,
  comment text,
  responded_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique(event_id, user_id)
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  event_id uuid references public.events(id) on delete set null,
  title text not null,
  description text,
  assigned_to uuid references auth.users(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  status public.task_status not null default 'open',
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  team_id uuid references public.teams(id) on delete cascade,
  event_id uuid references public.events(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  action_path text,
  is_read boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_team_members_user_id on public.team_members(user_id);
create index if not exists idx_team_members_team_id on public.team_members(team_id);
create index if not exists idx_team_invites_code on public.team_invites(code);
create index if not exists idx_events_team_id_starts_at on public.events(team_id, starts_at);
create index if not exists idx_event_responses_event_id on public.event_responses(event_id);
create index if not exists idx_tasks_team_id_status on public.tasks(team_id, status);
create index if not exists idx_notifications_user_id_is_read on public.notifications(user_id, is_read);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(coalesce(new.email, ''), '@', 1))
  )
  on conflict (id) do update
    set email = excluded.email;

  return new;
end;
$$;

create or replace function public.is_team_member(target_team_id uuid, target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.team_members tm
    where tm.team_id = target_team_id
      and tm.user_id = target_user_id
      and tm.status = 'active'
  );
$$;

create or replace function public.team_role_for(target_team_id uuid, target_user_id uuid default auth.uid())
returns public.team_role
language sql
stable
security definer
set search_path = public
as $$
  select tm.role
  from public.team_members tm
  where tm.team_id = target_team_id
    and tm.user_id = target_user_id
    and tm.status = 'active'
  limit 1;
$$;

create or replace function public.is_team_manager(target_team_id uuid, target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.team_role_for(target_team_id, target_user_id) in ('owner', 'coach'), false);
$$;

create or replace function public.join_team_with_invite(invite_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  invite_record public.team_invites%rowtype;
  joined_team_id uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;

  select *
  into invite_record
  from public.team_invites
  where (code = invite_code or token = invite_code)
    and is_active = true
    and (expires_at is null or expires_at > timezone('utc', now()))
  order by created_at desc
  limit 1;

  if not found then
    raise exception 'invite_not_found';
  end if;

  insert into public.team_members (team_id, user_id, role, status, invited_by)
  values (invite_record.team_id, auth.uid(), invite_record.role, 'active', invite_record.created_by)
  on conflict (team_id, user_id) do update
    set status = 'active',
        role = excluded.role,
        invited_by = coalesce(public.team_members.invited_by, excluded.invited_by),
        updated_at = timezone('utc', now());

  update public.team_invites
  set last_used_at = timezone('utc', now())
  where id = invite_record.id;

  joined_team_id := invite_record.team_id;
  return joined_team_id;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists teams_set_updated_at on public.teams;
create trigger teams_set_updated_at
before update on public.teams
for each row execute function public.set_updated_at();

drop trigger if exists team_members_set_updated_at on public.team_members;
create trigger team_members_set_updated_at
before update on public.team_members
for each row execute function public.set_updated_at();

drop trigger if exists team_invites_set_updated_at on public.team_invites;
create trigger team_invites_set_updated_at
before update on public.team_invites
for each row execute function public.set_updated_at();

drop trigger if exists events_set_updated_at on public.events;
create trigger events_set_updated_at
before update on public.events
for each row execute function public.set_updated_at();

drop trigger if exists event_responses_set_updated_at on public.event_responses;
create trigger event_responses_set_updated_at
before update on public.event_responses
for each row execute function public.set_updated_at();

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.team_invites enable row level security;
alter table public.events enable row level security;
alter table public.event_responses enable row level security;
alter table public.tasks enable row level security;
alter table public.notifications enable row level security;

drop policy if exists "users can read profiles" on public.profiles;
drop policy if exists "users can update own profile" on public.profiles;
drop policy if exists "authenticated can manage teams" on public.teams;
drop policy if exists "authenticated can manage team members" on public.team_members;

drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select"
on public.profiles
for select
to authenticated
using (
  auth.uid() = id
  or exists (
    select 1
    from public.team_members viewer
    join public.team_members teammate
      on teammate.team_id = viewer.team_id
    where viewer.user_id = auth.uid()
      and viewer.status = 'active'
      and teammate.user_id = profiles.id
      and teammate.status = 'active'
  )
);

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "teams_select_members" on public.teams;
create policy "teams_select_members"
on public.teams
for select
to authenticated
using (public.is_team_member(id));

drop policy if exists "teams_insert_authenticated" on public.teams;
create policy "teams_insert_authenticated"
on public.teams
for insert
to authenticated
with check (auth.uid() = created_by);

drop policy if exists "teams_update_managers" on public.teams;
create policy "teams_update_managers"
on public.teams
for update
to authenticated
using (public.is_team_manager(id))
with check (public.is_team_manager(id));

drop policy if exists "teams_delete_owner" on public.teams;
create policy "teams_delete_owner"
on public.teams
for delete
to authenticated
using (public.team_role_for(id) = 'owner');

drop policy if exists "team_members_select_team" on public.team_members;
create policy "team_members_select_team"
on public.team_members
for select
to authenticated
using (public.is_team_member(team_id));

drop policy if exists "team_members_insert_manager_or_creator" on public.team_members;
create policy "team_members_insert_manager_or_creator"
on public.team_members
for insert
to authenticated
with check (
  public.is_team_manager(team_id)
  or (
    auth.uid() = user_id
    and exists (
      select 1
      from public.teams t
      where t.id = team_id
        and t.created_by = auth.uid()
    )
  )
);

drop policy if exists "team_members_insert_self_with_invite" on public.team_members;
create policy "team_members_insert_self_with_invite"
on public.team_members
for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.team_invites ti
    where ti.team_id = team_members.team_id
      and ti.is_active = true
      and (ti.expires_at is null or ti.expires_at > timezone('utc', now()))
  )
);

drop policy if exists "team_members_update_self_with_invite" on public.team_members;
create policy "team_members_update_self_with_invite"
on public.team_members
for update
to authenticated
using (
  auth.uid() = user_id
  and exists (
    select 1
    from public.team_invites ti
    where ti.team_id = team_members.team_id
      and ti.is_active = true
      and (ti.expires_at is null or ti.expires_at > timezone('utc', now()))
  )
)
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.team_invites ti
    where ti.team_id = team_members.team_id
      and ti.is_active = true
      and (ti.expires_at is null or ti.expires_at > timezone('utc', now()))
  )
);

drop policy if exists "team_members_update_manager" on public.team_members;
create policy "team_members_update_manager"
on public.team_members
for update
to authenticated
using (public.is_team_manager(team_id))
with check (public.is_team_manager(team_id));

drop policy if exists "team_members_delete_manager" on public.team_members;
create policy "team_members_delete_manager"
on public.team_members
for delete
to authenticated
using (public.is_team_manager(team_id));

drop policy if exists "team_invites_public_select_active" on public.team_invites;
create policy "team_invites_public_select_active"
on public.team_invites
for select
to anon, authenticated
using (
  (is_active and (expires_at is null or expires_at > timezone('utc', now())))
  or public.is_team_member(team_id)
);

drop policy if exists "team_invites_manage" on public.team_invites;
create policy "team_invites_manage"
on public.team_invites
for all
to authenticated
using (public.is_team_manager(team_id))
with check (public.is_team_manager(team_id));

drop policy if exists "events_select_members" on public.events;
create policy "events_select_members"
on public.events
for select
to authenticated
using (public.is_team_member(team_id));

drop policy if exists "events_manage_managers" on public.events;
create policy "events_manage_managers"
on public.events
for all
to authenticated
using (public.is_team_manager(team_id))
with check (public.is_team_manager(team_id));

drop policy if exists "event_responses_select_members" on public.event_responses;
create policy "event_responses_select_members"
on public.event_responses
for select
to authenticated
using (
  exists (
    select 1
    from public.events e
    where e.id = event_id
      and public.is_team_member(e.team_id)
  )
);

drop policy if exists "event_responses_upsert_self" on public.event_responses;
create policy "event_responses_upsert_self"
on public.event_responses
for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.events e
    where e.id = event_id
      and public.is_team_member(e.team_id)
  )
);

drop policy if exists "event_responses_update_self" on public.event_responses;
create policy "event_responses_update_self"
on public.event_responses
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "tasks_select_members" on public.tasks;
create policy "tasks_select_members"
on public.tasks
for select
to authenticated
using (public.is_team_member(team_id));

drop policy if exists "tasks_insert_managers" on public.tasks;
create policy "tasks_insert_managers"
on public.tasks
for insert
to authenticated
with check (public.is_team_manager(team_id));

drop policy if exists "tasks_update_manager_or_assignee" on public.tasks;
create policy "tasks_update_manager_or_assignee"
on public.tasks
for update
to authenticated
using (public.is_team_manager(team_id) or assigned_to = auth.uid())
with check (public.is_team_manager(team_id) or assigned_to = auth.uid());

drop policy if exists "tasks_delete_managers" on public.tasks;
create policy "tasks_delete_managers"
on public.tasks
for delete
to authenticated
using (public.is_team_manager(team_id));

drop policy if exists "notifications_select_owner" on public.notifications;
create policy "notifications_select_owner"
on public.notifications
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "notifications_insert_self_or_manager" on public.notifications;
create policy "notifications_insert_self_or_manager"
on public.notifications
for insert
to authenticated
with check (
  auth.uid() = user_id
  or (
    team_id is not null
    and public.is_team_manager(team_id)
  )
);

drop policy if exists "notifications_update_owner" on public.notifications;
create policy "notifications_update_owner"
on public.notifications
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

alter table public.profiles add column if not exists name text;
update public.profiles
set name = coalesce(name, full_name)
where name is null;

alter table public.teams add column if not exists owner_id uuid references auth.users(id) on delete set null;
alter table public.teams add column if not exists color text;
update public.teams
set
  owner_id = coalesce(owner_id, created_by),
  color = coalesce(color, theme_color)
where owner_id is null
   or color is null;

alter table public.team_invites add column if not exists token text;
update public.team_invites
set token = coalesce(token, code)
where token is null;
create unique index if not exists idx_team_invites_token on public.team_invites(token);

create or replace function public.sync_team_invite_token()
returns trigger
language plpgsql
as $$
begin
  new.token = coalesce(new.token, new.code);
  return new;
end;
$$;

drop trigger if exists team_invites_sync_token on public.team_invites;
create trigger team_invites_sync_token
before insert or update on public.team_invites
for each row execute function public.sync_team_invite_token();

create or replace view public.invites
with (security_invoker = true)
as
select
  id,
  team_id,
  token,
  created_by,
  expires_at,
  created_at
from public.team_invites;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  display_name text;
begin
  display_name := coalesce(new.raw_user_meta_data->>'full_name', split_part(coalesce(new.email, ''), '@', 1));

  insert into public.profiles (id, email, full_name, name)
  values (new.id, new.email, display_name, display_name)
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(public.profiles.full_name, excluded.full_name),
        name = coalesce(public.profiles.name, excluded.name);

  return new;
end;
$$;

create or replace function public.is_team_owner(target_team_id uuid, target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.team_role_for(target_team_id, target_user_id) = 'owner', false);
$$;

create or replace function public.create_team_with_owner(
  team_name text,
  team_sport text,
  team_season text,
  team_theme_color text default '#dc2626',
  team_logo_url text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  created_team_id uuid;
begin
  if current_user_id is null then
    raise exception 'authentication_required';
  end if;

  if nullif(trim(team_name), '') is null
     or nullif(trim(team_sport), '') is null
     or nullif(trim(team_season), '') is null then
    raise exception 'team_fields_required';
  end if;

  if (
    select count(*)
    from public.team_members tm
    where tm.user_id = current_user_id
      and tm.role = 'owner'
      and tm.status = 'active'
  ) >= 3 then
    raise exception 'team_limit_reached';
  end if;

  insert into public.teams (
    name,
    sport,
    season,
    theme_color,
    logo_url,
    created_by,
    owner_id,
    color
  )
  values (
    trim(team_name),
    trim(team_sport),
    trim(team_season),
    coalesce(nullif(trim(team_theme_color), ''), '#dc2626'),
    nullif(trim(team_logo_url), ''),
    current_user_id,
    current_user_id,
    coalesce(nullif(trim(team_theme_color), ''), '#dc2626')
  )
  returning id into created_team_id;

  insert into public.team_members (team_id, user_id, role, status, invited_by)
  values (created_team_id, current_user_id, 'owner', 'active', current_user_id);

  return created_team_id;
end;
$$;

revoke all on function public.create_team_with_owner(text, text, text, text, text) from public;
grant execute on function public.create_team_with_owner(text, text, text, text, text) to authenticated;

drop policy if exists "teams_update_managers" on public.teams;
drop policy if exists "teams_update_owner" on public.teams;
create policy "teams_update_owner"
on public.teams
for update
to authenticated
using (public.is_team_owner(id))
with check (public.is_team_owner(id));

drop policy if exists "teams_delete_owner" on public.teams;
create policy "teams_delete_owner"
on public.teams
for delete
to authenticated
using (public.is_team_owner(id));

drop policy if exists "team_members_update_manager" on public.team_members;
drop policy if exists "team_members_update_owner" on public.team_members;
create policy "team_members_update_owner"
on public.team_members
for update
to authenticated
using (public.is_team_owner(team_id))
with check (public.is_team_owner(team_id));

drop policy if exists "team_members_delete_manager" on public.team_members;
drop policy if exists "team_members_delete_owner" on public.team_members;
create policy "team_members_delete_owner"
on public.team_members
for delete
to authenticated
using (public.is_team_owner(team_id));

-- ============================================================
-- migrations/20260424_smartrain_team_app.sql
-- ============================================================

create extension if not exists "pgcrypto";

do $$
begin
  create type public.team_role as enum ('owner', 'coach', 'player', 'parent');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.member_status as enum ('active', 'pending', 'inactive');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.event_type as enum ('training', 'game', 'meeting', 'event');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.response_status as enum ('yes', 'no', 'maybe');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.task_status as enum ('open', 'done');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  phone text,
  jersey_number integer,
  position text,
  birthday date,
  emergency_contact_name text,
  emergency_contact_phone text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists jersey_number integer;
alter table public.profiles add column if not exists position text;
alter table public.profiles add column if not exists birthday date;
alter table public.profiles add column if not exists emergency_contact_name text;
alter table public.profiles add column if not exists emergency_contact_phone text;
alter table public.profiles add column if not exists updated_at timestamptz not null default timezone('utc', now());

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sport text not null default 'Football',
  season text not null default to_char(current_date, 'YYYY'),
  logo_url text,
  theme_color text not null default '#115e59',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.teams add column if not exists sport text;
alter table public.teams add column if not exists season text;
alter table public.teams add column if not exists logo_url text;
alter table public.teams add column if not exists theme_color text;
alter table public.teams add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.teams add column if not exists updated_at timestamptz not null default timezone('utc', now());

update public.teams
set
  sport = coalesce(nullif(sport, ''), 'Football'),
  season = coalesce(nullif(season, ''), to_char(current_date, 'YYYY')),
  theme_color = coalesce(nullif(theme_color, ''), '#115e59')
where sport is null
   or season is null
   or theme_color is null;

alter table public.teams alter column sport set default 'Football';
alter table public.teams alter column sport set not null;
alter table public.teams alter column season set default to_char(current_date, 'YYYY');
alter table public.teams alter column season set not null;
alter table public.teams alter column theme_color set default '#115e59';
alter table public.teams alter column theme_color set not null;

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.team_role not null default 'player',
  status public.member_status not null default 'active',
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique(team_id, user_id)
);

alter table public.team_members add column if not exists status public.member_status not null default 'active';
alter table public.team_members add column if not exists invited_by uuid references auth.users(id) on delete set null;
alter table public.team_members add column if not exists updated_at timestamptz not null default timezone('utc', now());
alter table public.team_members alter column role drop default;
alter table public.team_members alter column role type public.team_role using (
  case lower(role::text)
    when 'owner' then 'owner'
    when 'coach' then 'coach'
    when 'parent' then 'parent'
    else 'player'
  end
)::public.team_role;
alter table public.team_members alter column role set default 'player'::public.team_role;
alter table public.team_members alter column role set not null;

create table if not exists public.team_invites (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  code text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
  token text,
  team_name text not null,
  team_sport text not null,
  role public.team_role not null default 'player',
  is_active boolean not null default true,
  expires_at timestamptz,
  last_used_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  title text not null,
  type public.event_type not null default 'training',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  location text,
  description text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.event_responses (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status public.response_status not null,
  comment text,
  responded_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique(event_id, user_id)
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  event_id uuid references public.events(id) on delete set null,
  title text not null,
  description text,
  assigned_to uuid references auth.users(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  status public.task_status not null default 'open',
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  team_id uuid references public.teams(id) on delete cascade,
  event_id uuid references public.events(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  action_path text,
  is_read boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_team_members_user_id on public.team_members(user_id);
create index if not exists idx_team_members_team_id on public.team_members(team_id);
create index if not exists idx_team_invites_code on public.team_invites(code);
create index if not exists idx_events_team_id_starts_at on public.events(team_id, starts_at);
create index if not exists idx_event_responses_event_id on public.event_responses(event_id);
create index if not exists idx_tasks_team_id_status on public.tasks(team_id, status);
create index if not exists idx_notifications_user_id_is_read on public.notifications(user_id, is_read);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(coalesce(new.email, ''), '@', 1))
  )
  on conflict (id) do update
    set email = excluded.email;

  return new;
end;
$$;

create or replace function public.is_team_member(target_team_id uuid, target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.team_members tm
    where tm.team_id = target_team_id
      and tm.user_id = target_user_id
      and tm.status = 'active'
  );
$$;

create or replace function public.team_role_for(target_team_id uuid, target_user_id uuid default auth.uid())
returns public.team_role
language sql
stable
security definer
set search_path = public
as $$
  select tm.role
  from public.team_members tm
  where tm.team_id = target_team_id
    and tm.user_id = target_user_id
    and tm.status = 'active'
  limit 1;
$$;

create or replace function public.is_team_manager(target_team_id uuid, target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.team_role_for(target_team_id, target_user_id) in ('owner', 'coach'), false);
$$;

create or replace function public.join_team_with_invite(invite_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  invite_record public.team_invites%rowtype;
  joined_team_id uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;

  select *
  into invite_record
  from public.team_invites
  where code = invite_code
    and is_active = true
    and (expires_at is null or expires_at > timezone('utc', now()))
  order by created_at desc
  limit 1;

  if not found then
    raise exception 'invite_not_found';
  end if;

  insert into public.team_members (team_id, user_id, role, status, invited_by)
  values (invite_record.team_id, auth.uid(), invite_record.role, 'active', invite_record.created_by)
  on conflict (team_id, user_id) do update
    set status = 'active',
        updated_at = timezone('utc', now());

  update public.team_invites
  set last_used_at = timezone('utc', now())
  where id = invite_record.id;

  joined_team_id := invite_record.team_id;
  return joined_team_id;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists teams_set_updated_at on public.teams;
create trigger teams_set_updated_at
before update on public.teams
for each row execute function public.set_updated_at();

drop trigger if exists team_members_set_updated_at on public.team_members;
create trigger team_members_set_updated_at
before update on public.team_members
for each row execute function public.set_updated_at();

drop trigger if exists team_invites_set_updated_at on public.team_invites;
create trigger team_invites_set_updated_at
before update on public.team_invites
for each row execute function public.set_updated_at();

drop trigger if exists events_set_updated_at on public.events;
create trigger events_set_updated_at
before update on public.events
for each row execute function public.set_updated_at();

drop trigger if exists event_responses_set_updated_at on public.event_responses;
create trigger event_responses_set_updated_at
before update on public.event_responses
for each row execute function public.set_updated_at();

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.team_invites enable row level security;
alter table public.events enable row level security;
alter table public.event_responses enable row level security;
alter table public.tasks enable row level security;
alter table public.notifications enable row level security;

drop policy if exists "users can read profiles" on public.profiles;
drop policy if exists "users can update own profile" on public.profiles;
drop policy if exists "authenticated can manage teams" on public.teams;
drop policy if exists "authenticated can manage team members" on public.team_members;

drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select"
on public.profiles
for select
to authenticated
using (
  auth.uid() = id
  or exists (
    select 1
    from public.team_members viewer
    join public.team_members teammate
      on teammate.team_id = viewer.team_id
    where viewer.user_id = auth.uid()
      and viewer.status = 'active'
      and teammate.user_id = profiles.id
      and teammate.status = 'active'
  )
);

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "teams_select_members" on public.teams;
create policy "teams_select_members"
on public.teams
for select
to authenticated
using (public.is_team_member(id));

drop policy if exists "teams_insert_authenticated" on public.teams;
create policy "teams_insert_authenticated"
on public.teams
for insert
to authenticated
with check (auth.uid() = created_by);

drop policy if exists "teams_update_managers" on public.teams;
create policy "teams_update_managers"
on public.teams
for update
to authenticated
using (public.is_team_manager(id))
with check (public.is_team_manager(id));

drop policy if exists "teams_delete_owner" on public.teams;
create policy "teams_delete_owner"
on public.teams
for delete
to authenticated
using (public.team_role_for(id) = 'owner');

drop policy if exists "team_members_select_team" on public.team_members;
create policy "team_members_select_team"
on public.team_members
for select
to authenticated
using (public.is_team_member(team_id));

drop policy if exists "team_members_insert_manager_or_creator" on public.team_members;
create policy "team_members_insert_manager_or_creator"
on public.team_members
for insert
to authenticated
with check (
  public.is_team_manager(team_id)
  or (
    auth.uid() = user_id
    and exists (
      select 1
      from public.teams t
      where t.id = team_id
        and t.created_by = auth.uid()
    )
  )
);

drop policy if exists "team_members_update_manager" on public.team_members;
create policy "team_members_update_manager"
on public.team_members
for update
to authenticated
using (public.is_team_manager(team_id))
with check (public.is_team_manager(team_id));

drop policy if exists "team_members_delete_manager" on public.team_members;
create policy "team_members_delete_manager"
on public.team_members
for delete
to authenticated
using (public.is_team_manager(team_id));

drop policy if exists "team_invites_public_select_active" on public.team_invites;
create policy "team_invites_public_select_active"
on public.team_invites
for select
to anon, authenticated
using (
  (is_active and (expires_at is null or expires_at > timezone('utc', now())))
  or public.is_team_member(team_id)
);

drop policy if exists "team_invites_manage" on public.team_invites;
create policy "team_invites_manage"
on public.team_invites
for all
to authenticated
using (public.is_team_manager(team_id))
with check (public.is_team_manager(team_id));

drop policy if exists "events_select_members" on public.events;
create policy "events_select_members"
on public.events
for select
to authenticated
using (public.is_team_member(team_id));

drop policy if exists "events_manage_managers" on public.events;
create policy "events_manage_managers"
on public.events
for all
to authenticated
using (public.is_team_manager(team_id))
with check (public.is_team_manager(team_id));

drop policy if exists "event_responses_select_members" on public.event_responses;
create policy "event_responses_select_members"
on public.event_responses
for select
to authenticated
using (
  exists (
    select 1
    from public.events e
    where e.id = event_id
      and public.is_team_member(e.team_id)
  )
);

drop policy if exists "event_responses_upsert_self" on public.event_responses;
create policy "event_responses_upsert_self"
on public.event_responses
for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.events e
    where e.id = event_id
      and public.is_team_member(e.team_id)
  )
);

drop policy if exists "event_responses_update_self" on public.event_responses;
create policy "event_responses_update_self"
on public.event_responses
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "tasks_select_members" on public.tasks;
create policy "tasks_select_members"
on public.tasks
for select
to authenticated
using (public.is_team_member(team_id));

drop policy if exists "tasks_insert_managers" on public.tasks;
create policy "tasks_insert_managers"
on public.tasks
for insert
to authenticated
with check (public.is_team_manager(team_id));

drop policy if exists "tasks_update_manager_or_assignee" on public.tasks;
create policy "tasks_update_manager_or_assignee"
on public.tasks
for update
to authenticated
using (public.is_team_manager(team_id) or assigned_to = auth.uid())
with check (public.is_team_manager(team_id) or assigned_to = auth.uid());

drop policy if exists "tasks_delete_managers" on public.tasks;
create policy "tasks_delete_managers"
on public.tasks
for delete
to authenticated
using (public.is_team_manager(team_id));

drop policy if exists "notifications_select_owner" on public.notifications;
create policy "notifications_select_owner"
on public.notifications
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "notifications_insert_self_or_manager" on public.notifications;
create policy "notifications_insert_self_or_manager"
on public.notifications
for insert
to authenticated
with check (
  auth.uid() = user_id
  or (
    team_id is not null
    and public.is_team_manager(team_id)
  )
);

drop policy if exists "notifications_update_owner" on public.notifications;
create policy "notifications_update_owner"
on public.notifications
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- ============================================================
-- migrations/202604250001_smartrain_invite_join_fixes.sql
-- ============================================================

alter table public.team_invites add column if not exists token text;
update public.team_invites
set token = coalesce(token, code)
where token is null;

create or replace function public.join_team_with_invite(invite_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  invite_record public.team_invites%rowtype;
  joined_team_id uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;

  select *
  into invite_record
  from public.team_invites
  where (code = invite_code or token = invite_code)
    and is_active = true
    and (expires_at is null or expires_at > timezone('utc', now()))
  order by created_at desc
  limit 1;

  if not found then
    raise exception 'invite_not_found';
  end if;

  insert into public.team_members (team_id, user_id, role, status, invited_by)
  values (invite_record.team_id, auth.uid(), invite_record.role, 'active', invite_record.created_by)
  on conflict (team_id, user_id) do update
    set status = 'active',
        role = excluded.role,
        invited_by = coalesce(public.team_members.invited_by, excluded.invited_by),
        updated_at = timezone('utc', now());

  update public.team_invites
  set last_used_at = timezone('utc', now())
  where id = invite_record.id;

  joined_team_id := invite_record.team_id;
  return joined_team_id;
end;
$$;

drop policy if exists "team_members_insert_self_with_invite" on public.team_members;
create policy "team_members_insert_self_with_invite"
on public.team_members
for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.team_invites ti
    where ti.team_id = team_members.team_id
      and ti.is_active = true
      and (ti.expires_at is null or ti.expires_at > timezone('utc', now()))
  )
);

drop policy if exists "team_members_update_self_with_invite" on public.team_members;
create policy "team_members_update_self_with_invite"
on public.team_members
for update
to authenticated
using (
  auth.uid() = user_id
  and exists (
    select 1
    from public.team_invites ti
    where ti.team_id = team_members.team_id
      and ti.is_active = true
      and (ti.expires_at is null or ti.expires_at > timezone('utc', now()))
  )
)
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.team_invites ti
    where ti.team_id = team_members.team_id
      and ti.is_active = true
      and (ti.expires_at is null or ti.expires_at > timezone('utc', now()))
  )
);

-- ============================================================
-- migrations/202604260001_smartrain_owner_coach_policy_alignment.sql
-- ============================================================

alter table public.profiles add column if not exists name text;
update public.profiles
set name = coalesce(name, full_name)
where name is null;

alter table public.teams add column if not exists owner_id uuid references auth.users(id) on delete set null;
alter table public.teams add column if not exists color text;
update public.teams
set
  owner_id = coalesce(owner_id, created_by),
  color = coalesce(color, theme_color)
where owner_id is null
   or color is null;

alter table public.team_invites add column if not exists token text;
update public.team_invites
set token = coalesce(token, code)
where token is null;
create unique index if not exists idx_team_invites_token on public.team_invites(token);

create or replace function public.sync_team_invite_token()
returns trigger
language plpgsql
as $$
begin
  new.token = coalesce(new.token, new.code);
  return new;
end;
$$;

drop trigger if exists team_invites_sync_token on public.team_invites;
create trigger team_invites_sync_token
before insert or update on public.team_invites
for each row execute function public.sync_team_invite_token();

create or replace view public.invites
with (security_invoker = true)
as
select
  id,
  team_id,
  token,
  created_by,
  expires_at,
  created_at
from public.team_invites;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  display_name text;
begin
  display_name := coalesce(new.raw_user_meta_data->>'full_name', split_part(coalesce(new.email, ''), '@', 1));

  insert into public.profiles (id, email, full_name, name)
  values (new.id, new.email, display_name, display_name)
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(public.profiles.full_name, excluded.full_name),
        name = coalesce(public.profiles.name, excluded.name);

  return new;
end;
$$;

create or replace function public.is_team_owner(target_team_id uuid, target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.team_role_for(target_team_id, target_user_id) = 'owner', false);
$$;

drop policy if exists "teams_update_managers" on public.teams;
drop policy if exists "teams_update_owner" on public.teams;
create policy "teams_update_owner"
on public.teams
for update
to authenticated
using (public.is_team_owner(id))
with check (public.is_team_owner(id));

drop policy if exists "teams_delete_owner" on public.teams;
create policy "teams_delete_owner"
on public.teams
for delete
to authenticated
using (public.is_team_owner(id));

drop policy if exists "team_members_update_manager" on public.team_members;
drop policy if exists "team_members_update_owner" on public.team_members;
create policy "team_members_update_owner"
on public.team_members
for update
to authenticated
using (public.is_team_owner(team_id))
with check (public.is_team_owner(team_id));

drop policy if exists "team_members_delete_manager" on public.team_members;
drop policy if exists "team_members_delete_owner" on public.team_members;
create policy "team_members_delete_owner"
on public.team_members
for delete
to authenticated
using (public.is_team_owner(team_id));

drop policy if exists "team_invites_manage" on public.team_invites;
create policy "team_invites_manage"
on public.team_invites
for all
to authenticated
using (public.is_team_manager(team_id))
with check (public.is_team_manager(team_id));

-- ============================================================
-- migrations/202604260002_smartrain_rpc_team_invites.sql
-- ============================================================

alter table public.profiles add column if not exists name text;
update public.profiles
set name = coalesce(name, full_name)
where name is null;

alter table public.teams add column if not exists sport text;
alter table public.teams add column if not exists season text;
alter table public.teams add column if not exists logo_url text;
alter table public.teams add column if not exists theme_color text;
alter table public.teams add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.teams add column if not exists owner_id uuid references auth.users(id) on delete set null;
alter table public.teams add column if not exists color text;
alter table public.teams add column if not exists updated_at timestamptz not null default timezone('utc', now());

update public.teams
set
  sport = coalesce(nullif(sport, ''), 'Team'),
  season = coalesce(nullif(season, ''), to_char(current_date, 'YYYY')),
  theme_color = coalesce(nullif(theme_color, ''), coalesce(nullif(color, ''), '#115e59')),
  owner_id = coalesce(owner_id, created_by),
  color = coalesce(nullif(color, ''), coalesce(nullif(theme_color, ''), '#115e59'))
where sport is null
   or season is null
   or theme_color is null
   or owner_id is null
   or color is null;

alter table public.team_members add column if not exists status public.member_status not null default 'active';
alter table public.team_members add column if not exists invited_by uuid references auth.users(id) on delete set null;
alter table public.team_members add column if not exists updated_at timestamptz not null default timezone('utc', now());

alter table public.team_invites add column if not exists token text;
alter table public.team_invites add column if not exists is_active boolean not null default true;
alter table public.team_invites add column if not exists last_used_at timestamptz;
alter table public.team_invites add column if not exists updated_at timestamptz not null default timezone('utc', now());

update public.team_invites
set token = coalesce(token, code)
where token is null;

create unique index if not exists idx_team_invites_token on public.team_invites(token);

create or replace function public.is_team_member(target_team_id uuid, target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.team_members tm
    where tm.team_id = target_team_id
      and tm.user_id = target_user_id
      and coalesce(tm.status, 'active') = 'active'
  );
$$;

create or replace function public.team_role_for(target_team_id uuid, target_user_id uuid default auth.uid())
returns public.team_role
language sql
stable
security definer
set search_path = public
as $$
  select tm.role
  from public.team_members tm
  where tm.team_id = target_team_id
    and tm.user_id = target_user_id
    and coalesce(tm.status, 'active') = 'active'
  limit 1;
$$;

create or replace function public.is_team_manager(target_team_id uuid, target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.team_role_for(target_team_id, target_user_id) in ('owner', 'coach'), false);
$$;

create or replace function public.can_insert_initial_owner(target_team_id uuid, target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.teams t
    where t.id = target_team_id
      and coalesce(t.created_by, t.owner_id) = target_user_id
  );
$$;

create or replace function public.create_team_with_owner(
  team_name text,
  team_sport text,
  team_season text,
  team_theme_color text default '#115e59',
  team_logo_url text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_team_id uuid;
  current_user_id uuid;
  owned_count integer;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'authentication_required';
  end if;

  if nullif(trim(team_name), '') is null
     or nullif(trim(team_sport), '') is null
     or nullif(trim(team_season), '') is null then
    raise exception 'team_required_fields_missing';
  end if;

  select count(*)
  into owned_count
  from public.team_members tm
  where tm.user_id = current_user_id
    and tm.role = 'owner'
    and coalesce(tm.status, 'active') = 'active';

  if owned_count >= 3 then
    raise exception 'team_limit_reached';
  end if;

  insert into public.teams (
    name,
    sport,
    season,
    logo_url,
    theme_color,
    color,
    created_by,
    owner_id
  )
  values (
    trim(team_name),
    trim(team_sport),
    trim(team_season),
    nullif(trim(coalesce(team_logo_url, '')), ''),
    coalesce(nullif(trim(team_theme_color), ''), '#115e59'),
    coalesce(nullif(trim(team_theme_color), ''), '#115e59'),
    current_user_id,
    current_user_id
  )
  returning id into new_team_id;

  insert into public.team_members (team_id, user_id, role, status)
  values (new_team_id, current_user_id, 'owner', 'active')
  on conflict (team_id, user_id) do update
    set role = 'owner',
        status = 'active',
        updated_at = timezone('utc', now());

  return new_team_id;
end;
$$;

create or replace function public.create_team_invite(
  target_team_id uuid,
  invite_code text,
  invite_role text default 'player',
  invite_expires_at timestamptz default null
)
returns public.team_invites
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid;
  team_record public.teams%rowtype;
  invite_record public.team_invites%rowtype;
  normalized_role public.team_role;
  normalized_code text;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'authentication_required';
  end if;

  if not public.is_team_manager(target_team_id, current_user_id) then
    raise exception 'team_manager_required';
  end if;

  normalized_role := case invite_role
    when 'owner' then 'owner'::public.team_role
    when 'coach' then 'coach'::public.team_role
    when 'parent' then 'parent'::public.team_role
    else 'player'::public.team_role
  end;

  normalized_code := upper(nullif(trim(invite_code), ''));

  if normalized_code is null then
    normalized_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
  end if;

  select *
  into team_record
  from public.teams
  where id = target_team_id;

  if not found then
    raise exception 'team_not_found';
  end if;

  insert into public.team_invites (
    team_id,
    code,
    token,
    team_name,
    team_sport,
    role,
    is_active,
    expires_at,
    created_by
  )
  values (
    target_team_id,
    normalized_code,
    normalized_code,
    team_record.name,
    coalesce(team_record.sport, team_record.season, 'Team'),
    normalized_role,
    true,
    invite_expires_at,
    current_user_id
  )
  returning * into invite_record;

  return invite_record;
end;
$$;

create or replace function public.join_team_with_invite(invite_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  invite_record public.team_invites%rowtype;
  joined_team_id uuid;
  normalized_code text;
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;

  normalized_code := trim(invite_code);

  select *
  into invite_record
  from public.team_invites
  where (code = normalized_code or code = upper(normalized_code) or token = normalized_code or token = upper(normalized_code))
    and is_active = true
    and (expires_at is null or expires_at > timezone('utc', now()))
  order by created_at desc
  limit 1;

  if not found then
    raise exception 'invite_not_found';
  end if;

  insert into public.team_members (team_id, user_id, role, status, invited_by)
  values (invite_record.team_id, auth.uid(), invite_record.role, 'active', invite_record.created_by)
  on conflict (team_id, user_id) do update
    set status = 'active',
        role = excluded.role,
        invited_by = coalesce(public.team_members.invited_by, excluded.invited_by),
        updated_at = timezone('utc', now());

  update public.team_invites
  set last_used_at = timezone('utc', now())
  where id = invite_record.id;

  joined_team_id := invite_record.team_id;
  return joined_team_id;
end;
$$;

grant execute on function public.create_team_with_owner(text, text, text, text, text) to authenticated;
grant execute on function public.create_team_invite(uuid, text, text, timestamptz) to authenticated;
grant execute on function public.join_team_with_invite(text) to authenticated;

drop policy if exists "teams_select_members" on public.teams;
create policy "teams_select_members"
on public.teams
for select
to authenticated
using (public.is_team_member(id));

drop policy if exists "teams_insert_authenticated" on public.teams;
create policy "teams_insert_authenticated"
on public.teams
for insert
to authenticated
with check (auth.uid() = created_by);

drop policy if exists "team_members_select_team" on public.team_members;
create policy "team_members_select_team"
on public.team_members
for select
to authenticated
using (public.is_team_member(team_id));

drop policy if exists "team_members_insert_manager_or_creator" on public.team_members;
create policy "team_members_insert_manager_or_creator"
on public.team_members
for insert
to authenticated
with check (
  public.is_team_manager(team_id)
  or (
    auth.uid() = user_id
    and role = 'owner'
    and public.can_insert_initial_owner(team_id, user_id)
  )
);

drop policy if exists "team_invites_public_select_active" on public.team_invites;
create policy "team_invites_public_select_active"
on public.team_invites
for select
to anon, authenticated
using (
  (is_active and (expires_at is null or expires_at > timezone('utc', now())))
  or public.is_team_member(team_id)
);

drop policy if exists "team_invites_manage" on public.team_invites;
create policy "team_invites_manage"
on public.team_invites
for all
to authenticated
using (public.is_team_manager(team_id))
with check (public.is_team_manager(team_id));

-- ============================================================
-- migrations/20260501_complete_smartrain_invites_and_rls.sql
-- ============================================================

create extension if not exists "pgcrypto";

do $$
begin
  create type public.team_role as enum ('owner', 'coach', 'player', 'parent');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.member_status as enum ('active', 'pending', 'inactive');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  name text,
  avatar_url text,
  phone text,
  jersey_number integer,
  position text,
  birthday date,
  emergency_contact_name text,
  emergency_contact_phone text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.profiles add column if not exists name text;
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists updated_at timestamptz not null default timezone('utc', now());

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sport text not null default 'Team',
  season text not null default to_char(current_date, 'YYYY'),
  logo_url text,
  theme_color text not null default '#16a34a',
  color text,
  created_by uuid references auth.users(id) on delete set null,
  owner_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.teams add column if not exists sport text;
alter table public.teams add column if not exists season text;
alter table public.teams add column if not exists logo_url text;
alter table public.teams add column if not exists theme_color text;
alter table public.teams add column if not exists color text;
alter table public.teams add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.teams add column if not exists owner_id uuid references auth.users(id) on delete set null;
alter table public.teams add column if not exists updated_at timestamptz not null default timezone('utc', now());

update public.teams
set
  sport = coalesce(nullif(sport, ''), 'Team'),
  season = coalesce(nullif(season, ''), to_char(current_date, 'YYYY')),
  theme_color = coalesce(nullif(theme_color, ''), nullif(color, ''), '#16a34a'),
  color = coalesce(nullif(color, ''), nullif(theme_color, ''), '#16a34a'),
  owner_id = coalesce(owner_id, created_by)
where sport is null
   or season is null
   or theme_color is null
   or color is null
   or owner_id is null;

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.team_role not null default 'player',
  status public.member_status not null default 'active',
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique(team_id, user_id)
);

alter table public.team_members add column if not exists status public.member_status not null default 'active';
alter table public.team_members add column if not exists invited_by uuid references auth.users(id) on delete set null;
alter table public.team_members add column if not exists updated_at timestamptz not null default timezone('utc', now());

create table if not exists public.team_invites (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  code text not null unique,
  token text unique,
  team_name text not null,
  team_sport text not null default 'Team',
  role public.team_role not null default 'player',
  is_active boolean not null default true,
  expires_at timestamptz,
  last_used_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.team_invites add column if not exists token text;
alter table public.team_invites add column if not exists is_active boolean not null default true;
alter table public.team_invites add column if not exists last_used_at timestamptz;
alter table public.team_invites add column if not exists updated_at timestamptz not null default timezone('utc', now());

update public.team_invites
set token = coalesce(token, code)
where token is null;

create unique index if not exists idx_team_members_team_user on public.team_members(team_id, user_id);
create index if not exists idx_team_members_user_id on public.team_members(user_id);
create index if not exists idx_team_invites_code on public.team_invites(code);
create unique index if not exists idx_team_invites_token on public.team_invites(token);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists teams_set_updated_at on public.teams;
create trigger teams_set_updated_at before update on public.teams
for each row execute function public.set_updated_at();

drop trigger if exists team_members_set_updated_at on public.team_members;
create trigger team_members_set_updated_at before update on public.team_members
for each row execute function public.set_updated_at();

drop trigger if exists team_invites_set_updated_at on public.team_invites;
create trigger team_invites_set_updated_at before update on public.team_invites
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  display_name text;
begin
  display_name := coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(coalesce(new.email, ''), '@', 1));

  insert into public.profiles (id, email, full_name, name)
  values (new.id, new.email, display_name, display_name)
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(public.profiles.full_name, excluded.full_name),
        name = coalesce(public.profiles.name, excluded.name),
        updated_at = timezone('utc', now());

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_team_member(target_team_id uuid, target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.team_members tm
    where tm.team_id = target_team_id
      and tm.user_id = target_user_id
      and coalesce(tm.status, 'active') = 'active'
  );
$$;

create or replace function public.team_role_for(target_team_id uuid, target_user_id uuid default auth.uid())
returns public.team_role
language sql
stable
security definer
set search_path = public
as $$
  select tm.role
  from public.team_members tm
  where tm.team_id = target_team_id
    and tm.user_id = target_user_id
    and coalesce(tm.status, 'active') = 'active'
  limit 1;
$$;

create or replace function public.is_team_manager(target_team_id uuid, target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.team_role_for(target_team_id, target_user_id) in ('owner', 'coach'), false);
$$;

create or replace function public.create_team_with_owner(
  team_name text,
  team_sport text,
  team_season text,
  team_theme_color text default '#16a34a',
  team_logo_url text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid;
  new_team_id uuid;
  owned_count integer;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'authentication_required';
  end if;

  select count(*)
  into owned_count
  from public.team_members tm
  where tm.user_id = current_user_id
    and tm.role = 'owner'
    and coalesce(tm.status, 'active') = 'active';

  if owned_count >= 3 then
    raise exception 'team_limit_reached';
  end if;

  insert into public.teams (name, sport, season, logo_url, theme_color, color, created_by, owner_id)
  values (
    trim(team_name),
    trim(team_sport),
    trim(team_season),
    nullif(trim(coalesce(team_logo_url, '')), ''),
    coalesce(nullif(trim(team_theme_color), ''), '#16a34a'),
    coalesce(nullif(trim(team_theme_color), ''), '#16a34a'),
    current_user_id,
    current_user_id
  )
  returning id into new_team_id;

  insert into public.team_members (team_id, user_id, role, status)
  values (new_team_id, current_user_id, 'owner', 'active')
  on conflict (team_id, user_id) do update
    set role = 'owner',
        status = 'active',
        updated_at = timezone('utc', now());

  return new_team_id;
end;
$$;

create or replace function public.create_team_invite(
  target_team_id uuid,
  invite_code text default null,
  invite_role text default 'player',
  invite_expires_at timestamptz default null
)
returns public.team_invites
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid;
  team_record public.teams%rowtype;
  invite_record public.team_invites%rowtype;
  normalized_code text;
  normalized_role public.team_role;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'authentication_required';
  end if;

  if not public.is_team_manager(target_team_id, current_user_id) then
    raise exception 'team_manager_required';
  end if;

  normalized_code := upper(nullif(trim(coalesce(invite_code, '')), ''));
  if normalized_code is null then
    normalized_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
  end if;

  normalized_role := case invite_role
    when 'coach' then 'coach'::public.team_role
    when 'parent' then 'parent'::public.team_role
    else 'player'::public.team_role
  end;

  select * into team_record from public.teams where id = target_team_id;
  if not found then
    raise exception 'team_not_found';
  end if;

  insert into public.team_invites (team_id, code, token, team_name, team_sport, role, is_active, expires_at, created_by)
  values (target_team_id, normalized_code, normalized_code, team_record.name, coalesce(team_record.sport, 'Team'), normalized_role, true, invite_expires_at, current_user_id)
  returning * into invite_record;

  return invite_record;
end;
$$;

create or replace function public.join_team_with_invite(invite_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  invite_record public.team_invites%rowtype;
  normalized_code text;
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;

  normalized_code := trim(invite_code);

  select *
  into invite_record
  from public.team_invites
  where (code = normalized_code or code = upper(normalized_code) or token = normalized_code or token = upper(normalized_code))
    and is_active = true
    and (expires_at is null or expires_at > timezone('utc', now()))
  order by created_at desc
  limit 1;

  if not found then
    raise exception 'invite_not_found';
  end if;

  insert into public.team_members (team_id, user_id, role, status, invited_by)
  values (invite_record.team_id, auth.uid(), invite_record.role, 'active', invite_record.created_by)
  on conflict (team_id, user_id) do update
    set status = 'active',
        invited_by = coalesce(public.team_members.invited_by, excluded.invited_by),
        updated_at = timezone('utc', now());

  update public.team_invites
  set last_used_at = timezone('utc', now())
  where id = invite_record.id;

  return invite_record.team_id;
end;
$$;

grant execute on function public.create_team_with_owner(text, text, text, text, text) to authenticated;
grant execute on function public.create_team_invite(uuid, text, text, timestamptz) to authenticated;
grant execute on function public.join_team_with_invite(text) to authenticated;

alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.team_invites enable row level security;

drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
for select to authenticated
using (
  auth.uid() = id
  or exists (
    select 1
    from public.team_members viewer
    join public.team_members teammate on teammate.team_id = viewer.team_id
    where viewer.user_id = auth.uid()
      and teammate.user_id = profiles.id
      and coalesce(viewer.status, 'active') = 'active'
      and coalesce(teammate.status, 'active') = 'active'
  )
);

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self" on public.profiles
for insert to authenticated
with check (auth.uid() = id);

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles
for update to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "teams_select_members" on public.teams;
create policy "teams_select_members" on public.teams
for select to authenticated
using (public.is_team_member(id));

drop policy if exists "teams_insert_authenticated" on public.teams;
create policy "teams_insert_authenticated" on public.teams
for insert to authenticated
with check (auth.uid() = created_by);

drop policy if exists "teams_update_owner" on public.teams;
create policy "teams_update_owner" on public.teams
for update to authenticated
using (public.team_role_for(id) = 'owner')
with check (public.team_role_for(id) = 'owner');

drop policy if exists "team_members_select_team" on public.team_members;
create policy "team_members_select_team" on public.team_members
for select to authenticated
using (public.is_team_member(team_id));

drop policy if exists "team_members_insert_manager_or_invite" on public.team_members;
create policy "team_members_insert_manager_or_invite" on public.team_members
for insert to authenticated
with check (
  public.is_team_manager(team_id)
  or (
    auth.uid() = user_id
    and exists (
      select 1
      from public.team_invites ti
      where ti.team_id = team_members.team_id
        and ti.is_active = true
        and (ti.expires_at is null or ti.expires_at > timezone('utc', now()))
    )
  )
);

drop policy if exists "team_members_update_owner" on public.team_members;
drop policy if exists "team_members_update_manager" on public.team_members;
create policy "team_members_update_owner" on public.team_members
for update to authenticated
using (public.team_role_for(team_id) = 'owner')
with check (public.team_role_for(team_id) = 'owner');

drop policy if exists "team_invites_public_select_active" on public.team_invites;
create policy "team_invites_public_select_active" on public.team_invites
for select to anon, authenticated
using (
  (is_active and (expires_at is null or expires_at > timezone('utc', now())))
  or public.is_team_member(team_id)
);

drop policy if exists "team_invites_manage" on public.team_invites;
create policy "team_invites_manage" on public.team_invites
for all to authenticated
using (public.is_team_manager(team_id))
with check (public.is_team_manager(team_id));

-- ============================================================
-- migrations/202608230001_team_organization_hub.sql
-- ============================================================

-- SpielerPlus-style team organization modules for Smartrain.
-- Safe to run repeatedly after the base schema.

create table if not exists public.team_updates (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  kind text not null default 'message' check (kind in ('news', 'message')),
  title text,
  body text not null,
  is_pinned boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (kind = 'message' or nullif(trim(title), '') is not null)
);

create table if not exists public.polls (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  question text not null,
  description text,
  closes_at timestamptz,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  label text not null,
  position integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.poll_votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  option_id uuid not null references public.poll_options(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique(poll_id, user_id)
);

create table if not exists public.absences (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  starts_on date not null,
  ends_on date not null,
  reason text not null default 'other' check (reason in ('holiday', 'illness', 'injury', 'school', 'work', 'other')),
  note text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (ends_on >= starts_on)
);

create table if not exists public.carpools (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  event_id uuid references public.events(id) on delete cascade,
  driver_id uuid not null references auth.users(id) on delete cascade,
  seats integer not null check (seats between 1 and 20),
  meeting_point text not null,
  departure_at timestamptz,
  note text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.carpool_riders (
  id uuid primary key default gen_random_uuid(),
  carpool_id uuid not null references public.carpools(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique(carpool_id, user_id)
);

create table if not exists public.ledger_entries (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  member_id uuid references auth.users(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('income', 'expense', 'fine', 'fee')),
  title text not null,
  note text,
  amount_cents integer not null check (amount_cents > 0),
  status text not null default 'open' check (status in ('open', 'paid')),
  due_on date,
  paid_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.event_lineup (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  position_label text,
  is_starter boolean not null default true,
  note text,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique(event_id, user_id)
);

create index if not exists idx_team_updates_team_created on public.team_updates(team_id, created_at desc);
create index if not exists idx_polls_team_created on public.polls(team_id, created_at desc);
create index if not exists idx_absences_team_dates on public.absences(team_id, starts_on, ends_on);
create index if not exists idx_carpools_team_event on public.carpools(team_id, event_id);
create index if not exists idx_ledger_entries_team_status on public.ledger_entries(team_id, status);
create index if not exists idx_event_lineup_event on public.event_lineup(event_id);

drop trigger if exists team_updates_set_updated_at on public.team_updates;
create trigger team_updates_set_updated_at before update on public.team_updates
for each row execute function public.set_updated_at();
drop trigger if exists polls_set_updated_at on public.polls;
create trigger polls_set_updated_at before update on public.polls
for each row execute function public.set_updated_at();
drop trigger if exists absences_set_updated_at on public.absences;
create trigger absences_set_updated_at before update on public.absences
for each row execute function public.set_updated_at();
drop trigger if exists carpools_set_updated_at on public.carpools;
create trigger carpools_set_updated_at before update on public.carpools
for each row execute function public.set_updated_at();
drop trigger if exists ledger_entries_set_updated_at on public.ledger_entries;
create trigger ledger_entries_set_updated_at before update on public.ledger_entries
for each row execute function public.set_updated_at();
drop trigger if exists event_lineup_set_updated_at on public.event_lineup;
create trigger event_lineup_set_updated_at before update on public.event_lineup
for each row execute function public.set_updated_at();

alter table public.team_updates enable row level security;
alter table public.polls enable row level security;
alter table public.poll_options enable row level security;
alter table public.poll_votes enable row level security;
alter table public.absences enable row level security;
alter table public.carpools enable row level security;
alter table public.carpool_riders enable row level security;
alter table public.ledger_entries enable row level security;
alter table public.event_lineup enable row level security;

drop policy if exists "team_updates_select_members" on public.team_updates;
create policy "team_updates_select_members" on public.team_updates for select to authenticated
using (public.is_team_member(team_id));
drop policy if exists "team_updates_insert_members" on public.team_updates;
create policy "team_updates_insert_members" on public.team_updates for insert to authenticated
with check (auth.uid() = author_id and public.is_team_member(team_id) and (kind = 'message' or public.is_team_manager(team_id)));
drop policy if exists "team_updates_delete_author_or_manager" on public.team_updates;
create policy "team_updates_delete_author_or_manager" on public.team_updates for delete to authenticated
using (auth.uid() = author_id or public.is_team_manager(team_id));

drop policy if exists "polls_select_members" on public.polls;
create policy "polls_select_members" on public.polls for select to authenticated using (public.is_team_member(team_id));
drop policy if exists "polls_manage_managers" on public.polls;
create policy "polls_manage_managers" on public.polls for all to authenticated
using (public.is_team_manager(team_id)) with check (public.is_team_manager(team_id));
drop policy if exists "poll_options_select_members" on public.poll_options;
create policy "poll_options_select_members" on public.poll_options for select to authenticated
using (exists (select 1 from public.polls p where p.id = poll_id and public.is_team_member(p.team_id)));
drop policy if exists "poll_options_manage_managers" on public.poll_options;
create policy "poll_options_manage_managers" on public.poll_options for all to authenticated
using (exists (select 1 from public.polls p where p.id = poll_id and public.is_team_manager(p.team_id)))
with check (exists (select 1 from public.polls p where p.id = poll_id and public.is_team_manager(p.team_id)));
drop policy if exists "poll_votes_select_members" on public.poll_votes;
create policy "poll_votes_select_members" on public.poll_votes for select to authenticated
using (exists (select 1 from public.polls p where p.id = poll_id and public.is_team_member(p.team_id)));
drop policy if exists "poll_votes_insert_self" on public.poll_votes;
create policy "poll_votes_insert_self" on public.poll_votes for insert to authenticated
with check (auth.uid() = user_id and exists (select 1 from public.polls p where p.id = poll_id and public.is_team_member(p.team_id)));
drop policy if exists "poll_votes_update_self" on public.poll_votes;
create policy "poll_votes_update_self" on public.poll_votes for update to authenticated
using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "absences_select_members" on public.absences;
create policy "absences_select_members" on public.absences for select to authenticated using (public.is_team_member(team_id));
drop policy if exists "absences_insert_self_or_manager" on public.absences;
create policy "absences_insert_self_or_manager" on public.absences for insert to authenticated
with check (public.is_team_member(team_id) and (auth.uid() = user_id or public.is_team_manager(team_id)));
drop policy if exists "absences_delete_self_or_manager" on public.absences;
create policy "absences_delete_self_or_manager" on public.absences for delete to authenticated
using (auth.uid() = user_id or public.is_team_manager(team_id));

drop policy if exists "carpools_select_members" on public.carpools;
create policy "carpools_select_members" on public.carpools for select to authenticated using (public.is_team_member(team_id));
drop policy if exists "carpools_insert_driver" on public.carpools;
create policy "carpools_insert_driver" on public.carpools for insert to authenticated
with check (auth.uid() = driver_id and public.is_team_member(team_id));
drop policy if exists "carpools_delete_driver_or_manager" on public.carpools;
create policy "carpools_delete_driver_or_manager" on public.carpools for delete to authenticated
using (auth.uid() = driver_id or public.is_team_manager(team_id));
drop policy if exists "carpool_riders_select_members" on public.carpool_riders;
create policy "carpool_riders_select_members" on public.carpool_riders for select to authenticated
using (exists (select 1 from public.carpools c where c.id = carpool_id and public.is_team_member(c.team_id)));
drop policy if exists "carpool_riders_manage_self" on public.carpool_riders;
create policy "carpool_riders_manage_self" on public.carpool_riders for all to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id and exists (select 1 from public.carpools c where c.id = carpool_id and public.is_team_member(c.team_id)));

drop policy if exists "ledger_entries_select_members" on public.ledger_entries;
create policy "ledger_entries_select_members" on public.ledger_entries for select to authenticated using (public.is_team_member(team_id));
drop policy if exists "ledger_entries_manage_managers" on public.ledger_entries;
create policy "ledger_entries_manage_managers" on public.ledger_entries for all to authenticated
using (public.is_team_manager(team_id)) with check (public.is_team_manager(team_id));

drop policy if exists "event_lineup_select_members" on public.event_lineup;
create policy "event_lineup_select_members" on public.event_lineup for select to authenticated using (public.is_team_member(team_id));
drop policy if exists "event_lineup_manage_managers" on public.event_lineup;
create policy "event_lineup_manage_managers" on public.event_lineup for all to authenticated
using (public.is_team_manager(team_id)) with check (public.is_team_manager(team_id));

-- ============================================================
-- migrations/202608230002_event_participation_controls.sql
-- ============================================================

alter table public.events add column if not exists response_deadline timestamptz;
alter table public.events add column if not exists max_participants integer;
alter table public.events add column if not exists is_cancelled boolean not null default false;

alter table public.events drop constraint if exists events_max_participants_check;
alter table public.events add constraint events_max_participants_check
check (max_participants is null or max_participants between 1 and 500);

-- ============================================================
-- migrations/202608230003_game_reports.sql
-- ============================================================

alter table public.events add column if not exists opponent text;
alter table public.events add column if not exists score_for integer;
alter table public.events add column if not exists score_against integer;
alter table public.events add column if not exists report_summary text;

alter table public.events drop constraint if exists events_scores_check;
alter table public.events add constraint events_scores_check
check (
  (score_for is null and score_against is null)
  or (score_for >= 0 and score_against >= 0)
);

-- ============================================================
-- migrations/202608260001_event_templates.sql
-- ============================================================

create table if not exists public.event_templates (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  name text not null,
  title text not null,
  type public.event_type not null default 'training',
  source_starts_at timestamptz not null,
  duration_minutes integer not null,
  location text,
  description text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint event_templates_duration_check check (duration_minutes between 1 and 1440),
  constraint event_templates_team_name_key unique (team_id, name)
);

create index if not exists idx_event_templates_team_id on public.event_templates(team_id);

drop trigger if exists event_templates_set_updated_at on public.event_templates;
create trigger event_templates_set_updated_at
before update on public.event_templates
for each row execute function public.set_updated_at();

alter table public.event_templates enable row level security;

drop policy if exists "event_templates_select_members" on public.event_templates;
create policy "event_templates_select_members"
on public.event_templates
for select
to authenticated
using (public.is_team_member(team_id));

drop policy if exists "event_templates_manage_managers" on public.event_templates;
create policy "event_templates_manage_managers"
on public.event_templates
for all
to authenticated
using (public.is_team_manager(team_id))
with check (public.is_team_manager(team_id));

-- ============================================================
-- migrations/20260914_close_team_members_role_escalation.sql
-- ============================================================

-- Security fix: closes a privilege-escalation hole in public.team_members RLS.
--
-- "team_members_insert_self_with_invite" and "team_members_update_self_with_invite"
-- (added in 202604250001_smartrain_invite_join_fixes.sql) let any authenticated
-- user INSERT or UPDATE their own team_members row - including the `role`
-- column - as long as *some* active invite existed for that team, regardless
-- of which role that invite actually grants. Anyone holding any active invite
-- link for a team (invite links are meant to be shared, that's their purpose)
-- could call the Supabase REST API directly with the public anon key and set
-- role = 'owner' on themselves, fully bypassing the app.
--
-- The real join flow has never used these policies: app/(marketing)/join/[inviteCode]
-- and lib/actions/team-actions.ts's joinTeamAction() call the SECURITY DEFINER
-- join_team_with_invite() RPC (added the next day, in
-- 202604260002_smartrain_rpc_team_invites.sql), which correctly sets
-- role = invite_record.role - the invite's own role, not user input. That RPC
-- bypasses RLS by design (SECURITY DEFINER) and does not depend on these
-- policies, so dropping them removes attack surface without touching any
-- feature that actually works today.

drop policy if exists "team_members_insert_self_with_invite" on public.team_members;
drop policy if exists "team_members_update_self_with_invite" on public.team_members;
