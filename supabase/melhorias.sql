-- =========================================================
--  ALVAR IMÓVEIS — atualização: melhorias
--  mapa · aprovação de anúncios · visitas · buscas salvas ·
--  visualizações e painel · etapas de interessados · anti-spam
--
--  Rode depois do schema.sql e do chat.sql. Pode rodar de novo.
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
