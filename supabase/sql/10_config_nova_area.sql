-- =====================================================================
-- MIGRAÇÃO: CONFIGURAÇÃO DO MINI-DASHBOARD "NOVA ÁREA"
-- =====================================================================
-- Execute isto no SQL Editor do Supabase.
--
-- Guarda o "Nome GCM" e a "Área" digitados no mini-dashboard do painel
-- "Não Cadastradas", pra não se perderem ao recarregar a página.
-- É uma tabela de uma linha só (id sempre = true).
-- =====================================================================

create table if not exists public.config_nova_area (
  id boolean primary key default true,
  nome_gcm text,
  nome_area text,
  atualizado_em timestamptz not null default now(),
  constraint config_nova_area_linha_unica check (id = true)
);

alter table public.config_nova_area enable row level security;

drop policy if exists "config_nova_area_select" on public.config_nova_area;
create policy "config_nova_area_select" on public.config_nova_area
  for select to authenticated using (public.eh_admin());

drop policy if exists "config_nova_area_admin_all" on public.config_nova_area;
create policy "config_nova_area_admin_all" on public.config_nova_area
  for all to authenticated using (public.eh_admin()) with check (public.eh_admin());
