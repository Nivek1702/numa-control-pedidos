create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  role text not null default 'worker' check (role in ('worker', 'admin')),
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  supplier text not null,
  product text not null,
  quantity numeric not null check (quantity > 0),
  unit text not null,
  unit_price numeric not null default 0 check (unit_price >= 0),
  items jsonb not null default '[]'::jsonb,
  priority text not null default 'normal' check (priority in ('normal', 'high', 'urgent')),
  status text not null default 'pending' check (status in ('pending', 'received')),
  notes text not null default '',
  user_id uuid not null references auth.users(id) on delete cascade,
  requested_date date not null default current_date,
  created_at timestamptz not null default now(),
  received_at timestamptz
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question text not null,
  answer text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_orders_user_created on public.orders(user_id, created_at desc);
create index if not exists idx_orders_user_status on public.orders(user_id, status);
create index if not exists idx_orders_user_date on public.orders(user_id, requested_date);
create index if not exists idx_conversations_user_created on public.conversations(user_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.orders enable row level security;
alter table public.conversations enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated using ((select auth.uid()) = id);

drop policy if exists orders_select_own on public.orders;
create policy orders_select_own on public.orders
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists orders_insert_own on public.orders;
create policy orders_insert_own on public.orders
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists orders_update_own on public.orders;
create policy orders_update_own on public.orders
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists orders_delete_own on public.orders;
create policy orders_delete_own on public.orders
  for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists conversations_select_own on public.conversations;
create policy conversations_select_own on public.conversations
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists conversations_insert_own on public.conversations;
create policy conversations_insert_own on public.conversations
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists conversations_delete_own on public.conversations;
create policy conversations_delete_own on public.conversations
  for delete to authenticated using ((select auth.uid()) = user_id);

grant usage on schema public to authenticated;
grant select on public.profiles to authenticated;
grant select, insert, update, delete on public.orders to authenticated;
grant select, insert, delete on public.conversations to authenticated;
