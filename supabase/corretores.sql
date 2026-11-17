-- =========================================================
--  ALVAR IMÓVEIS — atualização: visitante × corretor
--  Ao entrar, a pessoa escolhe se é visitante ou corretor.
--  Corretor precisa da aprovação de outros corretores; o admin
--  define quem aprova e quantas aprovações são necessárias.
--  Rode depois dos outros arquivos. Pode rodar de novo.
-- =========================================================

-- Tipo de conta escolhido no primeiro acesso (nulo = ainda não escolheu)
alter table public.profiles add column if not exists tipo_conta text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_tipo_conta_chk') then
    alter table public.profiles add constraint profiles_tipo_conta_chk check (tipo_conta in ('visitante','corretor'));
  end if;
end $$;
-- quem já é da equipe não precisa escolher
update public.profiles set tipo_conta = 'corretor' where tipo_conta is null and papel in ('corretor','admin');

-- ---------------------------------------------------------
--  Configurações (uma linha só, editada pelo admin)
-- ---------------------------------------------------------
create table if not exists public.configuracoes (
  id                      int primary key default 1 check (id = 1),
  quem_aprova             text not null default 'equipe' check (quem_aprova in ('equipe','admin')),
  aprovacoes_necessarias  int  not null default 1 check (aprovacoes_necessarias between 1 and 5),
  updated_at              timestamptz not null default now()
);
insert into public.configuracoes (id) values (1) on conflict (id) do nothing;
alter table public.configuracoes enable row level security;
drop policy if exists "config: todos leem" on public.configuracoes;
create policy "config: todos leem" on public.configuracoes for select using (true);
drop policy if exists "config: admin altera" on public.configuracoes;
create policy "config: admin altera" on public.configuracoes for update using (public.is_admin()) with check (public.is_admin());
grant select on public.configuracoes to anon, authenticated;
grant update (quem_aprova, aprovacoes_necessarias, updated_at) on public.configuracoes to authenticated;

create or replace function public.pode_aprovar() returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin() or (
    (select quem_aprova from public.configuracoes where id = 1) = 'equipe'
    and exists (select 1 from public.profiles where id = auth.uid() and papel = 'corretor')
  );
$$;

-- ---------------------------------------------------------
--  Solicitações para ser corretor + votos
-- ---------------------------------------------------------
create table if not exists public.solicitacoes_corretor (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null unique references public.profiles(id) on delete cascade,
  creci         text not null check (char_length(creci) between 3 and 40),
  telefone      text check (telefone is null or char_length(telefone) <= 40),
  mensagem      text check (mensagem is null or char_length(mensagem) <= 600),
  status        text not null default 'pendente' check (status in ('pendente','aprovada','rejeitada')),
  decidido_em   timestamptz,
  decidido_por  uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now()
);
create table if not exists public.votos_corretor (
  solicitacao_id  uuid not null references public.solicitacoes_corretor(id) on delete cascade,
  aprovador_id    uuid not null references public.profiles(id) on delete cascade,
  voto            text not null check (voto in ('aprovar','rejeitar')),
  created_at      timestamptz not null default now(),
  primary key (solicitacao_id, aprovador_id)
);

alter table public.solicitacoes_corretor enable row level security;
alter table public.votos_corretor enable row level security;
drop policy if exists "solicitacoes: dono e aprovadores leem" on public.solicitacoes_corretor;
create policy "solicitacoes: dono e aprovadores leem" on public.solicitacoes_corretor for select
  using (user_id = auth.uid() or public.pode_aprovar());
drop policy if exists "votos: aprovadores leem" on public.votos_corretor;
create policy "votos: aprovadores leem" on public.votos_corretor for select
  using (public.pode_aprovar() or exists (select 1 from public.solicitacoes_corretor s where s.id = solicitacao_id and s.user_id = auth.uid()));
grant select on public.solicitacoes_corretor, public.votos_corretor to authenticated;
-- escrita só pelas funções abaixo

-- Libera a troca de papel quando feita pelas funções de aprovação
create or replace function public.guard_papel() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(current_setting('alvar.promover', true), '') = '1' then return new; end if;
  if new.papel is distinct from old.papel and not public.is_admin() then
    raise exception 'Apenas administradores podem alterar papéis';
  end if;
  if new.papel is distinct from old.papel and new.id = auth.uid() then
    raise exception 'Você não pode alterar o próprio papel';
  end if;
  if new.tipo_conta is distinct from old.tipo_conta and old.tipo_conta is not null and not public.is_admin() then
    new.tipo_conta := old.tipo_conta;
  end if;
  return new;
end;
$$;

-- Primeiro acesso: escolher visitante ou corretor
create or replace function public.escolher_tipo_conta(_tipo text, _creci text default null, _telefone text default null, _mensagem text default null)
returns text language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  p public.profiles;
begin
  if me is null then raise exception 'Não autenticado'; end if;
  select * into p from public.profiles where id = me;
  if p.papel in ('corretor','admin') then
    update public.profiles set tipo_conta = 'corretor' where id = me;
    return 'equipe';
  end if;
  if _tipo = 'visitante' then
    update public.profiles set tipo_conta = coalesce(tipo_conta, 'visitante') where id = me;
    return 'visitante';
  end if;
  if _tipo <> 'corretor' then raise exception 'Tipo inválido'; end if;
  if coalesce(trim(_creci), '') = '' then raise exception 'Informe o CRECI'; end if;
  perform set_config('alvar.promover', '1', true);
  update public.profiles set tipo_conta = 'corretor', creci = trim(_creci), telefone = coalesce(nullif(trim(_telefone), ''), telefone) where id = me;
  insert into public.solicitacoes_corretor (user_id, creci, telefone, mensagem)
  values (me, trim(_creci), nullif(trim(_telefone), ''), nullif(trim(_mensagem), ''))
  on conflict (user_id) do update set creci = excluded.creci, telefone = excluded.telefone, mensagem = excluded.mensagem,
    status = 'pendente', decidido_em = null, decidido_por = null, created_at = now()
  where public.solicitacoes_corretor.status <> 'aprovada';
  -- nova solicitação (ou reenvio após rejeição) começa sem votos
  delete from public.votos_corretor v using public.solicitacoes_corretor s
    where v.solicitacao_id = s.id and s.user_id = me and s.status = 'pendente';
  return 'pendente';
end;
$$;
grant execute on function public.escolher_tipo_conta(text, text, text, text) to authenticated;

-- Votar numa solicitação (o voto do admin decide na hora)
create or replace function public.votar_corretor(_solicitacao uuid, _voto text)
returns text language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  s public.solicitacoes_corretor;
  necessarias int := (select aprovacoes_necessarias from public.configuracoes where id = 1);
  sim int; nao int; equipe int;
  admin boolean := public.is_admin();
begin
  if not public.pode_aprovar() then raise exception 'Você não tem permissão para aprovar corretores'; end if;
  if _voto not in ('aprovar','rejeitar') then raise exception 'Voto inválido'; end if;
  select * into s from public.solicitacoes_corretor where id = _solicitacao for update;
  if s.id is null then raise exception 'Solicitação não encontrada'; end if;
  if s.user_id = me then raise exception 'Você não pode votar na própria solicitação'; end if;
  if s.status <> 'pendente' then return s.status; end if;

  insert into public.votos_corretor (solicitacao_id, aprovador_id, voto) values (s.id, me, _voto)
  on conflict (solicitacao_id, aprovador_id) do update set voto = excluded.voto, created_at = now();

  select count(*) filter (where voto = 'aprovar'), count(*) filter (where voto = 'rejeitar')
    into sim, nao from public.votos_corretor where solicitacao_id = s.id;
  -- se a equipe for menor que o exigido, basta todos os aprovadores disponíveis
  select count(*) into equipe from public.profiles where id <> s.user_id and (papel = 'admin' or (papel = 'corretor' and (select quem_aprova from public.configuracoes where id = 1) = 'equipe'));
  necessarias := greatest(1, least(necessarias, equipe));

  if (admin and _voto = 'aprovar') or sim >= necessarias then
    perform set_config('alvar.promover', '1', true);
    update public.profiles set papel = 'corretor', tipo_conta = 'corretor', creci = coalesce(creci, s.creci) where id = s.user_id and papel = 'cliente';
    update public.solicitacoes_corretor set status = 'aprovada', decidido_em = now(), decidido_por = me where id = s.id;
    return 'aprovada';
  elsif (admin and _voto = 'rejeitar') or nao >= necessarias then
    update public.solicitacoes_corretor set status = 'rejeitada', decidido_em = now(), decidido_por = me where id = s.id;
    return 'rejeitada';
  end if;
  return 'pendente';
end;
$$;
grant execute on function public.votar_corretor(uuid, text) to authenticated;

-- O primeiro usuário vira admin e já conta como corretor
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare primeiro boolean := not exists (select 1 from public.profiles where papel = 'admin');
begin
  insert into public.profiles (id, nome, email, avatar_url, papel, tipo_conta)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'),
    case when primeiro then 'admin' else 'cliente' end,
    case when primeiro then 'corretor' else null end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Quando o admin rebaixa um corretor para cliente, a conta volta a ser de visitante
create or replace function public.papel_sincroniza_tipo() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.papel = 'cliente' and old.papel in ('corretor','admin') then new.tipo_conta := 'visitante'; end if;
  if new.papel in ('corretor','admin') then
    new.tipo_conta := 'corretor';
    update public.solicitacoes_corretor set status = 'aprovada', decidido_em = now(), decidido_por = auth.uid()
      where user_id = new.id and status = 'pendente';
  end if;
  return new;
end;
$$;
drop trigger if exists profiles_sincroniza_tipo on public.profiles;
create trigger profiles_sincroniza_tipo before update of papel on public.profiles
  for each row execute function public.papel_sincroniza_tipo();
