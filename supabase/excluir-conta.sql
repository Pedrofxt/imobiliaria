-- =========================================================
--  ALVAR IMÓVEIS — atualização: exclusão de conta
--  Se você já rodou o schema.sql antes, rode só este arquivo.
--  (Rodar o schema.sql inteiro de novo também funciona.)
-- =========================================================
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
