-- =====================================================================
-- POLÍTICAS DE SEGURANÇA (ROW LEVEL SECURITY)
-- =====================================================================
-- Execute DEPOIS do 01_schema.sql.
-- Regras:
--   - Qualquer usuário logado (admin ou visualizador) pode LER os dados.
--   - Apenas usuários com papel = 'admin' podem INSERIR/ATUALIZAR/APAGAR.
-- =====================================================================

-- Habilita RLS em todas as tabelas
alter table public.perfis enable row level security;
alter table public.lojas enable row level security;
alter table public.potencial enable row level security;
alter table public.producao enable row level security;
alter table public.producao_meta enable row level security;

-- Função auxiliar: verifica se o usuário logado é admin
create or replace function public.eh_admin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.perfis
    where id = auth.uid() and papel = 'admin'
  );
$$;

-- ---------------------------------------------------------------------
-- PERFIS: todo usuário logado pode ver os perfis (para listas/admin),
-- mas só pode alterar o próprio nome (não o próprio papel).
-- ---------------------------------------------------------------------
drop policy if exists "perfis_select" on public.perfis;
create policy "perfis_select" on public.perfis
  for select to authenticated using (true);

drop policy if exists "perfis_update_admin" on public.perfis;
create policy "perfis_update_admin" on public.perfis
  for update to authenticated using (public.eh_admin());

-- ---------------------------------------------------------------------
-- LOJAS
-- ---------------------------------------------------------------------
drop policy if exists "lojas_select" on public.lojas;
create policy "lojas_select" on public.lojas
  for select to authenticated using (true);

drop policy if exists "lojas_admin_all" on public.lojas;
create policy "lojas_admin_all" on public.lojas
  for all to authenticated using (public.eh_admin()) with check (public.eh_admin());

-- ---------------------------------------------------------------------
-- POTENCIAL
-- ---------------------------------------------------------------------
drop policy if exists "potencial_select" on public.potencial;
create policy "potencial_select" on public.potencial
  for select to authenticated using (true);

drop policy if exists "potencial_admin_all" on public.potencial;
create policy "potencial_admin_all" on public.potencial
  for all to authenticated using (public.eh_admin()) with check (public.eh_admin());

-- ---------------------------------------------------------------------
-- PRODUCAO
-- ---------------------------------------------------------------------
drop policy if exists "producao_select" on public.producao;
create policy "producao_select" on public.producao
  for select to authenticated using (true);

drop policy if exists "producao_admin_all" on public.producao;
create policy "producao_admin_all" on public.producao
  for all to authenticated using (public.eh_admin()) with check (public.eh_admin());

-- ---------------------------------------------------------------------
-- PRODUCAO_META
-- ---------------------------------------------------------------------
drop policy if exists "producao_meta_select" on public.producao_meta;
create policy "producao_meta_select" on public.producao_meta
  for select to authenticated using (true);

drop policy if exists "producao_meta_admin_all" on public.producao_meta;
create policy "producao_meta_admin_all" on public.producao_meta
  for all to authenticated using (public.eh_admin()) with check (public.eh_admin());
