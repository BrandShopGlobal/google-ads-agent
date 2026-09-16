create extension if not exists "pgcrypto";

create type public.app_role as enum ('admin', 'member');
create type public.project_status as enum ('draft', 'ready', 'deployed', 'failed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role public.app_role not null default 'member',
  created_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  customer_id text not null check (customer_id ~ '^[0-9]{10}$'),
  company text not null,
  description text not null,
  final_url text not null,
  location_ids text[] not null default '{}',
  language_id text not null default '1000',
  minimum_volume integer not null default 100 check (minimum_volume >= 0),
  status public.project_status not null default 'draft',
  brief jsonb not null default '{}',
  keywords jsonb not null default '[]',
  creative jsonb,
  campaign_draft jsonb,
  created_by uuid not null references public.profiles(id),
  updated_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.deployments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete set null,
  customer_id text not null,
  campaign_resource_name text,
  status text not null,
  request_snapshot jsonb not null,
  response_snapshot jsonb,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.audit_events (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index projects_updated_at_idx on public.projects(updated_at desc);
create index deployments_project_id_idx on public.deployments(project_id);
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.deployments enable row level security;
alter table public.audit_events enable row level security;

create function public.current_role() returns public.app_role language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create policy "team reads profiles" on public.profiles for select to authenticated using (true);
create policy "users update own profile" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid() and role = public.current_role());
create policy "team reads projects" on public.projects for select to authenticated using (true);
create policy "team creates projects" on public.projects for insert to authenticated with check (created_by = auth.uid() and updated_by = auth.uid());
create policy "team updates projects" on public.projects for update to authenticated using (true) with check (updated_by = auth.uid());
create policy "admins read deployments" on public.deployments for select to authenticated using (public.current_role() = 'admin');
create policy "admins create deployments" on public.deployments for insert to authenticated with check (public.current_role() = 'admin' and created_by = auth.uid());
create policy "admins read audit events" on public.audit_events for select to authenticated using (public.current_role() = 'admin');

create function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name) values (new.id, coalesce(new.email, ''), new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

-- After inviting Elley, promote her once using the SQL editor:
-- update public.profiles set role = 'admin' where email = 'helloelley@elleynott.com';
