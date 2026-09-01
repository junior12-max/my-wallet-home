-- roles
create type public.app_role as enum ('admin', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;

alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

revoke execute on function public.has_role(uuid, public.app_role) from public, anon;
grant execute on function public.has_role(uuid, public.app_role) to authenticated, service_role;

create policy "Users can read own roles"
on public.user_roles for select to authenticated
using (auth.uid() = user_id);

create policy "Admins can read all roles"
on public.user_roles for select to authenticated
using (public.has_role(auth.uid(), 'admin'));

create policy "Admins can manage roles"
on public.user_roles for all to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

-- freeze flag on accounts
alter table public.accounts add column if not exists is_frozen boolean not null default false;

-- admin read/write policies
create policy "Admins can read all profiles"
on public.profiles for select to authenticated
using (public.has_role(auth.uid(), 'admin'));

create policy "Admins can read all accounts"
on public.accounts for select to authenticated
using (public.has_role(auth.uid(), 'admin'));

create policy "Admins can update all accounts"
on public.accounts for update to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

create policy "Admins can read all cards"
on public.cards for select to authenticated
using (public.has_role(auth.uid(), 'admin'));

create policy "Admins can read all transactions"
on public.transactions for select to authenticated
using (public.has_role(auth.uid(), 'admin'));

-- grant role on signup: first user becomes admin
create or replace function public.assign_default_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_roles (user_id, role)
  values (
    new.id,
    case when exists (select 1 from public.user_roles where role = 'admin') then 'user'::public.app_role
         else 'admin'::public.app_role end
  )
  on conflict do nothing;
  return new;
end;
$$;

revoke execute on function public.assign_default_role() from public, anon, authenticated;

create trigger on_auth_user_created_assign_role
after insert on auth.users
for each row execute function public.assign_default_role();

-- backfill: make the earliest existing user an admin
insert into public.user_roles (user_id, role)
select id, 'admin'::public.app_role from auth.users order by created_at asc limit 1
on conflict do nothing;