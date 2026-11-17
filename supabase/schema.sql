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
--  Excluir a própria conta (chamada pelo site via RPC)
-- ---------------------------------------------------------
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'Não autenticado';
  end if;
  if exists (select 1 from public.profiles where id = me and papel = 'admin')
     and (select count(*) from public.profiles where papel = 'admin') = 1 then
    raise exception 'Você é o único administrador. Promova outra pessoa a administrador antes de excluir sua conta.';
  end if;
  -- perfil, favoritos e vínculos saem em cascata; imóveis ficam sem responsável
  delete from auth.users where id = me;
end;
$$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

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

-- =========================================================
--  CHAT: conversas entre interessado e corretor responsável
-- =========================================================
create table if not exists public.conversas (
  id           uuid primary key default gen_random_uuid(),
  imovel_id    uuid references public.imoveis(id) on delete set null,
  cliente_id   uuid not null,
  corretor_id  uuid,
  ultima_msg   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint conversas_cliente_fk  foreign key (cliente_id)  references public.profiles(id) on delete cascade,
  constraint conversas_corretor_fk foreign key (corretor_id) references public.profiles(id) on delete set null,
  constraint conversas_unica unique (imovel_id, cliente_id)
);
create index if not exists conversas_cliente_idx  on public.conversas (cliente_id, updated_at desc);
create index if not exists conversas_corretor_idx on public.conversas (corretor_id, updated_at desc);

create table if not exists public.mensagens (
  id           uuid primary key default gen_random_uuid(),
  conversa_id  uuid not null references public.conversas(id) on delete cascade,
  autor_id     uuid references public.profiles(id) on delete set null,
  texto        text not null check (char_length(texto) between 1 and 2000),
  lida         boolean not null default false,
  created_at   timestamptz not null default now()
);
create index if not exists mensagens_conversa_idx on public.mensagens (conversa_id, created_at);
create index if not exists mensagens_naolidas_idx on public.mensagens (conversa_id) where lida = false;

create or replace function public.is_participante(_conversa uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.conversas c where c.id = _conversa and auth.uid() in (c.cliente_id, c.corretor_id));
$$;

-- Ao abrir conversa, o corretor é sempre o responsável pelo imóvel (ou o 1º admin)
create or replace function public.conversa_define_corretor() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.cliente_id := auth.uid();
  select coalesce(i.responsavel_id, (select id from public.profiles where papel = 'admin' order by created_at limit 1))
    into new.corretor_id from public.imoveis i where i.id = new.imovel_id;
  if new.corretor_id is null then raise exception 'Imóvel sem responsável'; end if;
  if new.corretor_id = new.cliente_id then raise exception 'Você é o responsável por este imóvel'; end if;
  return new;
end;
$$;
drop trigger if exists conversas_define_corretor on public.conversas;
create trigger conversas_define_corretor before insert on public.conversas
  for each row execute function public.conversa_define_corretor();

-- Nova mensagem atualiza a prévia da conversa
create or replace function public.mensagem_atualiza_conversa() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.conversas set ultima_msg = left(new.texto, 200), updated_at = new.created_at where id = new.conversa_id;
  return new;
end;
$$;
drop trigger if exists mensagens_atualiza_conversa on public.mensagens;
create trigger mensagens_atualiza_conversa after insert on public.mensagens
  for each row execute function public.mensagem_atualiza_conversa();

alter table public.conversas enable row level security;
alter table public.mensagens enable row level security;

drop policy if exists "conversas: participantes leem" on public.conversas;
create policy "conversas: participantes leem" on public.conversas for select
  using (auth.uid() in (cliente_id, corretor_id));
drop policy if exists "conversas: interessado abre" on public.conversas;
create policy "conversas: interessado abre" on public.conversas for insert to authenticated
  with check (true); -- o trigger força cliente_id = auth.uid() e define o corretor

drop policy if exists "mensagens: participantes leem" on public.mensagens;
create policy "mensagens: participantes leem" on public.mensagens for select
  using (public.is_participante(conversa_id));
drop policy if exists "mensagens: participantes enviam" on public.mensagens;
create policy "mensagens: participantes enviam" on public.mensagens for insert to authenticated
  with check (autor_id = auth.uid() and public.is_participante(conversa_id));
drop policy if exists "mensagens: marcar como lida" on public.mensagens;
create policy "mensagens: marcar como lida" on public.mensagens for update to authenticated
  using (public.is_participante(conversa_id) and autor_id <> auth.uid())
  with check (public.is_participante(conversa_id));

grant select, insert on public.conversas to authenticated;
grant select, insert on public.mensagens to authenticated;
revoke update on public.mensagens from authenticated;
grant update (lida) on public.mensagens to authenticated;

-- Tempo real
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'mensagens') then
    alter publication supabase_realtime add table public.mensagens;
  end if;
end $$;

-- =========================================================
--  MELHORIAS (mapa, aprovação, visitas, buscas, painel, anti-spam)
-- =========================================================
-- ---------------------------------------------------------
--  Imóveis: coordenadas e situação (rascunho → aprovação)
-- ---------------------------------------------------------
alter table public.imoveis add column if not exists latitude double precision;
alter table public.imoveis add column if not exists longitude double precision;
alter table public.imoveis add column if not exists situacao text not null default 'publicado';
alter table public.imoveis add column if not exists motivo_rejeicao text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'imoveis_situacao_chk') then
    alter table public.imoveis add constraint imoveis_situacao_chk check (situacao in ('rascunho','pendente','publicado','rejeitado'));
  end if;
end $$;
create index if not exists imoveis_situacao_idx on public.imoveis (situacao);

-- Corretor não publica sozinho: vira "pendente" até um admin aprovar.
-- (SQL Editor / service role — auth.uid() nulo — passa direto, para o seed funcionar.)
create or replace function public.imovel_moderacao() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.is_admin() then return new; end if;
  if tg_op = 'INSERT' then
    if new.situacao <> 'rascunho' then new.situacao := 'pendente'; end if;
    new.motivo_rejeicao := null;
  else
    if new.situacao in ('publicado', 'rejeitado') and new.situacao is distinct from old.situacao then
      new.situacao := 'pendente';
    end if;
    if new.situacao = 'pendente' then new.motivo_rejeicao := null; end if;
    if new.situacao = old.situacao then new.motivo_rejeicao := old.motivo_rejeicao; end if;
  end if;
  return new;
end;
$$;
drop trigger if exists imoveis_moderacao on public.imoveis;
create trigger imoveis_moderacao before insert or update on public.imoveis
  for each row execute function public.imovel_moderacao();

-- Público só vê anúncios publicados; quem edita vê os seus rascunhos
drop policy if exists "imoveis: leitura pública" on public.imoveis;
create policy "imoveis: leitura pública" on public.imoveis for select
  using (situacao = 'publicado' or public.can_edit_imovel(id));

-- ---------------------------------------------------------
--  Interessados: etapas (mini CRM) + anti-spam
-- ---------------------------------------------------------
alter table public.leads add column if not exists etapa text not null default 'novo';
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'leads_etapa_chk') then
    alter table public.leads add constraint leads_etapa_chk check (etapa in ('novo','contato','visita','proposta','fechado','perdido'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'leads_email_chk') then
    alter table public.leads add constraint leads_email_chk check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$') not valid;
  end if;
end $$;

drop policy if exists "leads: responsável atualiza" on public.leads;
create policy "leads: responsável atualiza" on public.leads for update
  using (public.is_admin() or exists (select 1 from public.imoveis i where i.id = imovel_id and i.responsavel_id = auth.uid()));
revoke update on public.leads from authenticated;
grant update (etapa) on public.leads to authenticated;

create or replace function public.leads_antispam() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.leads where lower(email) = lower(new.email) and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'Muitos contatos em pouco tempo. Tente novamente mais tarde.';
  end if;
  if exists (select 1 from public.leads where lower(email) = lower(new.email) and imovel_id = new.imovel_id and created_at > now() - interval '10 minutes') then
    raise exception 'Você já enviou interesse neste imóvel há pouco. Aguarde o retorno do corretor.';
  end if;
  return new;
end;
$$;
drop trigger if exists leads_antispam on public.leads;
create trigger leads_antispam before insert on public.leads
  for each row execute function public.leads_antispam();

create or replace function public.mensagens_antispam() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.mensagens where autor_id = new.autor_id and created_at > now() - interval '1 minute') >= 20 then
    raise exception 'Você está enviando mensagens rápido demais. Aguarde um instante.';
  end if;
  return new;
end;
$$;
drop trigger if exists mensagens_antispam on public.mensagens;
create trigger mensagens_antispam before insert on public.mensagens
  for each row execute function public.mensagens_antispam();

-- ---------------------------------------------------------
--  Visitas agendadas
-- ---------------------------------------------------------
create table if not exists public.visitas (
  id           uuid primary key default gen_random_uuid(),
  imovel_id    uuid not null references public.imoveis(id) on delete cascade,
  cliente_id   uuid not null,
  corretor_id  uuid,
  data_hora    timestamptz not null,
  status       text not null default 'pendente' check (status in ('pendente','confirmada','recusada','cancelada','realizada')),
  observacao   text check (observacao is null or char_length(observacao) <= 500),
  created_at   timestamptz not null default now(),
  constraint visitas_cliente_fk  foreign key (cliente_id)  references public.profiles(id) on delete cascade,
  constraint visitas_corretor_fk foreign key (corretor_id) references public.profiles(id) on delete set null
);
create index if not exists visitas_cliente_idx  on public.visitas (cliente_id, data_hora);
create index if not exists visitas_corretor_idx on public.visitas (corretor_id, data_hora);
create index if not exists visitas_imovel_idx   on public.visitas (imovel_id, data_hora);

create or replace function public.visita_antes_inserir() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.cliente_id := auth.uid();
  new.status := 'pendente';
  select coalesce(i.responsavel_id, (select id from public.profiles where papel = 'admin' order by created_at limit 1))
    into new.corretor_id from public.imoveis i where i.id = new.imovel_id and i.situacao = 'publicado';
  if new.corretor_id is null then raise exception 'Imóvel indisponível para visitas'; end if;
  if new.corretor_id = new.cliente_id then raise exception 'Você é o responsável por este imóvel'; end if;
  if new.data_hora < now() + interval '1 hour' then raise exception 'Escolha um horário futuro'; end if;
  if new.data_hora > now() + interval '60 days' then raise exception 'Agende com no máximo 60 dias de antecedência'; end if;
  if exists (select 1 from public.visitas where imovel_id = new.imovel_id and data_hora = new.data_hora and status in ('pendente','confirmada')) then
    raise exception 'Esse horário acabou de ser reservado. Escolha outro.';
  end if;
  if (select count(*) from public.visitas where cliente_id = new.cliente_id and imovel_id = new.imovel_id and status in ('pendente','confirmada') and data_hora > now()) >= 2 then
    raise exception 'Você já tem visitas marcadas para este imóvel.';
  end if;
  return new;
end;
$$;
drop trigger if exists visitas_antes_inserir on public.visitas;
create trigger visitas_antes_inserir before insert on public.visitas
  for each row execute function public.visita_antes_inserir();

-- Cliente só pode cancelar; corretor/admin confirmam, recusam ou marcam realizada
create or replace function public.visita_antes_atualizar() returns trigger
language plpgsql security definer set search_path = public as $$
declare equipe boolean := (auth.uid() = old.corretor_id or public.is_admin());
begin
  if auth.uid() is null then return new; end if;
  new.imovel_id := old.imovel_id; new.cliente_id := old.cliente_id; new.corretor_id := old.corretor_id;
  new.data_hora := old.data_hora; new.observacao := old.observacao; new.created_at := old.created_at;
  if not equipe and new.status <> 'cancelada' then raise exception 'Você só pode cancelar a visita'; end if;
  return new;
end;
$$;
drop trigger if exists visitas_antes_atualizar on public.visitas;
create trigger visitas_antes_atualizar before update on public.visitas
  for each row execute function public.visita_antes_atualizar();

alter table public.visitas enable row level security;
drop policy if exists "visitas: participantes leem" on public.visitas;
create policy "visitas: participantes leem" on public.visitas for select
  using (auth.uid() in (cliente_id, corretor_id) or public.is_admin());
drop policy if exists "visitas: interessado agenda" on public.visitas;
create policy "visitas: interessado agenda" on public.visitas for insert to authenticated with check (true);
drop policy if exists "visitas: participantes atualizam" on public.visitas;
create policy "visitas: participantes atualizam" on public.visitas for update to authenticated
  using (auth.uid() in (cliente_id, corretor_id) or public.is_admin());
grant select, insert on public.visitas to authenticated;
revoke update on public.visitas from authenticated;
grant update (status) on public.visitas to authenticated;

-- Horários já ocupados (para desabilitar no calendário, sem expor quem marcou)
create or replace function public.horarios_ocupados(_imovel uuid) returns setof timestamptz
language sql stable security definer set search_path = public as $$
  select data_hora from public.visitas
  where imovel_id = _imovel and status in ('pendente','confirmada') and data_hora > now();
$$;
grant execute on function public.horarios_ocupados(uuid) to anon, authenticated;

-- ---------------------------------------------------------
--  Buscas salvas (com alerta)
-- ---------------------------------------------------------
create table if not exists public.buscas_salvas (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  nome          text not null check (char_length(nome) between 1 and 80),
  filtros       jsonb not null default '{}',
  alerta_email  boolean not null default true,
  visto_em      timestamptz not null default now(),
  created_at    timestamptz not null default now()
);
create index if not exists buscas_user_idx on public.buscas_salvas (user_id);
alter table public.buscas_salvas enable row level security;
drop policy if exists "buscas: só as minhas" on public.buscas_salvas;
create policy "buscas: só as minhas" on public.buscas_salvas for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update, delete on public.buscas_salvas to authenticated;

create or replace function public.imovel_combina(f jsonb, i public.imoveis) returns boolean
language sql immutable as $$
  select (coalesce(f->>'fin', '') = '' or i.finalidade = f->>'fin')
     and (coalesce(f->>'tipo', '') = '' or i.tipo = f->>'tipo')
     and coalesce(i.quartos, 0) >= coalesce(nullif(f->>'quartos', '')::int, 0)
     and (coalesce(f->>'preco', '') = '' or i.preco <= (f->>'preco')::numeric)
     and (coalesce(f->>'q', '') = '' or
          (i.titulo || ' ' || coalesce(i.bairro, '') || ' ' || i.cidade || ' ' || coalesce(i.descricao, '') || ' ' || array_to_string(coalesce(i.comodidades, '{}'), ' ')) ilike '%' || (f->>'q') || '%');
$$;

-- ---------------------------------------------------------
--  Visualizações e painel de números
-- ---------------------------------------------------------
create table if not exists public.visualizacoes (
  id          bigint generated always as identity primary key,
  imovel_id   uuid not null references public.imoveis(id) on delete cascade,
  created_at  timestamptz not null default now()
);
create index if not exists visualizacoes_imovel_idx on public.visualizacoes (imovel_id, created_at);
alter table public.visualizacoes enable row level security;
drop policy if exists "visualizacoes: registrar" on public.visualizacoes;
create policy "visualizacoes: registrar" on public.visualizacoes for insert with check (true);
grant insert on public.visualizacoes to anon, authenticated;

create or replace function public.stats_imoveis(dias int default 30)
returns table (imovel_id uuid, views bigint, favoritos bigint, leads bigint, visitas bigint)
language sql stable security definer set search_path = public as $$
  select i.id,
    (select count(*) from public.visualizacoes v where v.imovel_id = i.id and v.created_at > now() - make_interval(days => dias)),
    (select count(*) from public.favoritos f where f.imovel_id = i.id),
    (select count(*) from public.leads l where l.imovel_id = i.id and l.created_at > now() - make_interval(days => dias)),
    (select count(*) from public.visitas s where s.imovel_id = i.id and s.created_at > now() - make_interval(days => dias))
  from public.imoveis i
  where public.is_staff() and (public.is_admin() or i.responsavel_id = auth.uid() or i.criado_por = auth.uid());
$$;

create or replace function public.views_por_dia(dias int default 14)
returns table (dia date, total bigint)
language sql stable security definer set search_path = public as $$
  select d::date, (
    select count(*) from public.visualizacoes v join public.imoveis i on i.id = v.imovel_id
    where v.created_at >= d and v.created_at < d + interval '1 day'
      and (public.is_admin() or i.responsavel_id = auth.uid() or i.criado_por = auth.uid())
  )
  from generate_series(date_trunc('day', now()) - make_interval(days => dias - 1), date_trunc('day', now()), interval '1 day') d
  where public.is_staff();
$$;
grant execute on function public.stats_imoveis(int), public.views_por_dia(int) to authenticated;

-- ---------------------------------------------------------
--  Controle de avisos por e-mail (usado pela função "notificar")
-- ---------------------------------------------------------
alter table public.conversas add column if not exists notificado_em timestamptz;
