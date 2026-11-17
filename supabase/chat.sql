-- =========================================================
--  ALVAR IMÓVEIS — atualização: chat
--  Se você já rodou o schema.sql antes, rode só este arquivo.
-- =========================================================
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
