-- =========================================================
--  ALVAR IMÓVEIS — avisos por e-mail (gatilhos → função "notificar")
--  1. Publique a Edge Function supabase/functions/notificar
--  2. Troque TROQUE-ESTE-SEGREDO abaixo pelo mesmo valor do segredo
--     WEBHOOK_SECRET da função (não publique o valor real no GitHub)
--  3. Rode este arquivo no SQL Editor
-- =========================================================
create extension if not exists pg_net with schema extensions;

create or replace function public.alvar_notificar() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
declare
  anterior text := null;
begin
  if tg_table_name = 'imoveis' then
    if tg_op = 'UPDATE' then
      if new.situacao is not distinct from old.situacao then return new; end if;
      anterior := old.situacao;
    end if;
  elsif tg_table_name in ('visitas', 'solicitacoes_corretor') and tg_op = 'UPDATE' then
    if new.status is not distinct from old.status then return new; end if;
  end if;

  perform net.http_post(
    url     := 'https://esotkfzgmkncfkqbaiho.supabase.co/functions/v1/notificar',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', 'TROQUE-ESTE-SEGREDO'),
    body    := jsonb_build_object('tabela', tg_table_name, 'evento', tg_op, 'id', new.id, 'anterior', anterior),
    timeout_milliseconds := 5000
  );
  return new;
exception when others then
  return new; -- aviso nunca bloqueia a gravação
end;
$$;

drop trigger if exists notificar_mensagens on public.mensagens;
create trigger notificar_mensagens after insert on public.mensagens for each row execute function public.alvar_notificar();
drop trigger if exists notificar_leads on public.leads;
create trigger notificar_leads after insert on public.leads for each row execute function public.alvar_notificar();
drop trigger if exists notificar_visitas on public.visitas;
create trigger notificar_visitas after insert or update on public.visitas for each row execute function public.alvar_notificar();
drop trigger if exists notificar_imoveis on public.imoveis;
create trigger notificar_imoveis after insert or update on public.imoveis for each row execute function public.alvar_notificar();
drop trigger if exists notificar_solicitacoes on public.solicitacoes_corretor;
create trigger notificar_solicitacoes after insert or update on public.solicitacoes_corretor for each row execute function public.alvar_notificar();
