-- =====================================================================
-- MIGRAÇÃO: ACESSO POR GCM (visualizadores só veem seu próprio GCM)
-- =====================================================================
-- Execute isto DEPOIS dos arquivos 01, 02 e 03, no SQL Editor do Supabase.
-- Esta migração:
--   1. Faz o cadastro capturar o "nome" digitado (que deve ser o nome do GCM).
--   2. Restringe a leitura de potencial/lojas/producao: visualizadores só
--      veem linhas cujo campo GCM seja igual ao nome do próprio perfil.
--      Admins continuam vendo tudo, sem filtro.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Atualiza a função de criação de perfil para capturar o "nome"
--    enviado no momento do cadastro (signUp com options.data.nome).
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.perfis (id, email, nome, papel)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'nome',
    'visualizador'
  );
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 2. Função auxiliar: retorna o nome do perfil logado (usado nos filtros)
-- ---------------------------------------------------------------------
create or replace function public.meu_gcm()
returns text
language sql
security definer set search_path = public
stable
as $$
  select nome from public.perfis where id = auth.uid();
$$;

-- ---------------------------------------------------------------------
-- 3. Substitui as políticas de SELECT: admin vê tudo, visualizador só
--    vê linhas onde gcm = nome do próprio perfil.
-- ---------------------------------------------------------------------

-- POTENCIAL
drop policy if exists "potencial_select" on public.potencial;
create policy "potencial_select" on public.potencial
  for select to authenticated
  using (
    public.eh_admin()
    or gcm = public.meu_gcm()
  );

-- LOJAS
drop policy if exists "lojas_select" on public.lojas;
create policy "lojas_select" on public.lojas
  for select to authenticated
  using (
    public.eh_admin()
    or gcm = public.meu_gcm()
  );

-- PRODUCAO
-- Aqui não existe coluna gcm diretamente (produção é ligada por DEALER).
-- Por isso, checamos o GCM através da tabela potencial, casando pelo
-- código da loja (dn = dealer).
drop policy if exists "producao_select" on public.producao;
create policy "producao_select" on public.producao
  for select to authenticated
  using (
    public.eh_admin()
    or exists (
      select 1 from public.potencial p
      where p.dn = public.producao.dealer
        and p.gcm = public.meu_gcm()
    )
  );

comment on function public.meu_gcm is 'Retorna o nome do perfil logado, usado como GCM para filtrar dados de visualizadores.';
