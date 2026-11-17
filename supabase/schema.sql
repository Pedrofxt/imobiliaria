-- =========================================================
--  ALVAR IMÓVEIS — schema do Supabase
--  Rode este arquivo inteiro no SQL Editor do seu projeto.
--  Pode ser executado mais de uma vez (é idempotente).
-- =========================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------
--  Perfis (1:1 com auth.users)
-- ---------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  nome        text,
  email       text,
  avatar_url  text,
  telefone    text,
  creci       text,
  cargo       text,
  bio         text,
  papel       text not null default 'cliente' check (papel in ('cliente','corretor','admin')),
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------
--  Imóveis
-- ---------------------------------------------------------
create table if not exists public.imoveis (
  id              uuid primary key default gen_random_uuid(),
  titulo          text not null,
  descricao       text,
  tipo            text not null default 'casa' check (tipo in ('casa','apartamento','cobertura','terreno','comercial')),
  finalidade      text not null default 'venda' check (finalidade in ('venda','aluguel')),
  status          text not null default 'disponivel' check (status in ('disponivel','reservado','vendido','alugado')),
  preco           numeric(14,2) not null default 0,
  condominio      numeric(12,2),
  iptu            numeric(12,2),
  area_m2         numeric(10,2),
  quartos         int default 0,
  suites          int default 0,
  banheiros       int default 0,
  vagas           int default 0,
  cep             text,
  endereco        text,
  bairro          text,
  cidade          text not null,
  estado          text default 'PR',
  comodidades     text[] default '{}',
  destaque        boolean not null default false,
  responsavel_id  uuid,
  criado_por      uuid,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint imoveis_responsavel_fk foreign key (responsavel_id) references public.profiles(id) on delete set null,
  constraint imoveis_criado_por_fk  foreign key (criado_por)     references public.profiles(id) on delete set null
);
create index if not exists imoveis_created_idx on public.imoveis (created_at desc);
create index if not exists imoveis_resp_idx on public.imoveis (responsavel_id);

create table if not exists public.imovel_fotos (
  id          uuid primary key default gen_random_uuid(),
  imovel_id   uuid not null references public.imoveis(id) on delete cascade,
  url         text not null,
  path        text,
  ordem       int not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists imovel_fotos_imovel_idx on public.imovel_fotos (imovel_id, ordem);

create table if not exists public.favoritos (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  imovel_id   uuid not null references public.imoveis(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, imovel_id)
);

create table if not exists public.leads (
  id          uuid primary key default gen_random_uuid(),
  imovel_id   uuid references public.imoveis(id) on delete cascade,
  user_id     uuid references public.profiles(id) on delete set null,
  nome        text not null check (char_length(nome) between 1 and 120),
  email       text not null check (char_length(email) between 3 and 200),
  telefone    text check (telefone is null or char_length(telefone) <= 40),
  mensagem    text check (mensagem is null or char_length(mensagem) <= 2000),
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------
--  Funções auxiliares (security definer evita recursão no RLS)
-- ---------------------------------------------------------
create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and papel in ('corretor','admin'));
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and papel = 'admin');
$$;

create or replace function public.can_edit_imovel(_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin() or exists (
    select 1 from public.imoveis i
    where i.id = _id and public.is_staff() and (i.responsavel_id = auth.uid() or i.criado_por = auth.uid())
  );
$$;

-- Novo usuário → perfil. O PRIMEIRO usuário vira administrador.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, nome, email, avatar_url, papel)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'),
    case when exists (select 1 from public.profiles where papel = 'admin') then 'cliente' else 'admin' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Só administradores mudam papéis
create or replace function public.guard_papel() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.papel is distinct from old.papel and not public.is_admin() then
    raise exception 'Apenas administradores podem alterar papéis';
  end if;
  if new.papel is distinct from old.papel and new.id = auth.uid() then
    raise exception 'Você não pode alterar o próprio papel';
  end if;
  return new;
end;
$$;
drop trigger if exists profiles_guard_papel on public.profiles;
create trigger profiles_guard_papel before update on public.profiles
  for each row execute function public.guard_papel();

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
drop trigger if exists imoveis_touch on public.imoveis;
create trigger imoveis_touch before update on public.imoveis
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------
--  RLS
-- ---------------------------------------------------------
alter table public.profiles     enable row level security;
alter table public.imoveis      enable row level security;
alter table public.imovel_fotos enable row level security;
alter table public.favoritos    enable row level security;
alter table public.leads        enable row level security;

-- profiles
drop policy if exists "perfis: equipe é pública" on public.profiles;
create policy "perfis: equipe é pública" on public.profiles for select
  using (papel in ('corretor','admin') or id = auth.uid() or public.is_staff());
drop policy if exists "perfis: editar o próprio" on public.profiles;
create policy "perfis: editar o próprio" on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());
drop policy if exists "perfis: admin edita todos" on public.profiles;
create policy "perfis: admin edita todos" on public.profiles for update
  using (public.is_admin()) with check (public.is_admin());

-- imoveis
drop policy if exists "imoveis: leitura pública" on public.imoveis;
create policy "imoveis: leitura pública" on public.imoveis for select using (true);
drop policy if exists "imoveis: equipe cadastra" on public.imoveis;
create policy "imoveis: equipe cadastra" on public.imoveis for insert
  with check (public.is_staff());
drop policy if exists "imoveis: responsável edita" on public.imoveis;
create policy "imoveis: responsável edita" on public.imoveis for update
  using (public.can_edit_imovel(id)) with check (public.is_staff());
drop policy if exists "imoveis: responsável exclui" on public.imoveis;
create policy "imoveis: responsável exclui" on public.imoveis for delete
  using (public.can_edit_imovel(id));

-- fotos
drop policy if exists "fotos: leitura pública" on public.imovel_fotos;
create policy "fotos: leitura pública" on public.imovel_fotos for select using (true);
drop policy if exists "fotos: responsável gerencia" on public.imovel_fotos;
create policy "fotos: responsável gerencia" on public.imovel_fotos for all
  using (public.can_edit_imovel(imovel_id)) with check (public.can_edit_imovel(imovel_id));

-- favoritos
drop policy if exists "favoritos: só os meus" on public.favoritos;
create policy "favoritos: só os meus" on public.favoritos for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- leads
drop policy if exists "leads: qualquer um envia" on public.leads;
create policy "leads: qualquer um envia" on public.leads for insert
  with check (user_id is null or user_id = auth.uid());
drop policy if exists "leads: responsável lê" on public.leads;
create policy "leads: responsável lê" on public.leads for select
  using (public.is_admin() or exists (select 1 from public.imoveis i where i.id = imovel_id and i.responsavel_id = auth.uid()));
drop policy if exists "leads: responsável apaga" on public.leads;
create policy "leads: responsável apaga" on public.leads for delete
  using (public.is_admin() or exists (select 1 from public.imoveis i where i.id = imovel_id and i.responsavel_id = auth.uid()));

grant usage on schema public to anon, authenticated;
grant select on public.imoveis, public.imovel_fotos, public.profiles to anon;
grant insert on public.leads to anon;
grant all on public.profiles, public.imoveis, public.imovel_fotos, public.favoritos, public.leads to authenticated;

-- ---------------------------------------------------------
--  Storage: bucket público para fotos
-- ---------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('imoveis', 'imoveis', true, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true;

drop policy if exists "fotos storage: leitura" on storage.objects;
create policy "fotos storage: leitura" on storage.objects for select
  using (bucket_id = 'imoveis');

drop policy if exists "fotos storage: equipe envia" on storage.objects;
create policy "fotos storage: equipe envia" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'imoveis' and (
      ((storage.foldername(name))[1] <> 'avatars' and public.is_staff())
      or ((storage.foldername(name))[1] = 'avatars' and (storage.foldername(name))[2] = auth.uid()::text)
    )
  );

drop policy if exists "fotos storage: equipe altera" on storage.objects;
create policy "fotos storage: equipe altera" on storage.objects for update to authenticated
  using (bucket_id = 'imoveis' and (public.is_staff() or (storage.foldername(name))[2] = auth.uid()::text));

drop policy if exists "fotos storage: equipe remove" on storage.objects;
create policy "fotos storage: equipe remove" on storage.objects for delete to authenticated
  using (bucket_id = 'imoveis' and (public.is_staff() or (storage.foldername(name))[2] = auth.uid()::text));
