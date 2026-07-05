-- =====================================================================
-- MIGRAÇÃO: LOJAS NÃO CADASTRADAS + COLUNA "NOVA ÁREA"
-- =====================================================================
-- Execute isto no SQL Editor do Supabase (Painel > SQL Editor > New query > Run).
--
-- O que este arquivo cria:
--   1. Tabela "lojas_nao_cadastradas": guarda lojas candidatas para análise
--      de uma nova área/região (para decidir contratação de um novo GCM).
--      As linhas chegam de duas formas:
--        - origem = 'upload' -> subidas manualmente na aba Upload
--        - origem = 'painel' -> copiadas do Painel principal, quando o
--          usuário marca a caixinha "Nova Área" numa loja já cliente
--   2. Coluna "incluido_nova_area" na tabela "metas_loja": guarda se aquela
--      loja (pelo DN) está marcada como parte da nova área no Painel principal.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Garante que a tabela "metas_loja" existe (caso ainda não exista)
--    e adiciona a nova coluna "incluido_nova_area".
-- ---------------------------------------------------------------------
create table if not exists public.metas_loja (
  dn text primary key,
  meta_cdc_prem numeric,
  lm_consig_ativo boolean not null default false,
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid references auth.users(id)
);

alter table public.metas_loja
  add column if not exists incluido_nova_area boolean not null default false;

alter table public.metas_loja enable row level security;

drop policy if exists "metas_loja_select" on public.metas_loja;
create policy "metas_loja_select" on public.metas_loja
  for select to authenticated using (true);

drop policy if exists "metas_loja_admin_all" on public.metas_loja;
create policy "metas_loja_admin_all" on public.metas_loja
  for all to authenticated using (public.eh_admin()) with check (public.eh_admin());


-- ---------------------------------------------------------------------
-- 2. Tabela LOJAS_NAO_CADASTRADAS
-- ---------------------------------------------------------------------
create table if not exists public.lojas_nao_cadastradas (
  id bigint generated always as identity primary key,
  origem text not null default 'upload' check (origem in ('upload', 'painel')),
  dn text,                    -- preenchido só quando a linha vem do Painel principal (loja já cliente)
  cnpj_loja text,
  razao_social text,
  endereco text,
  numero text,
  bairro text,
  cep text,
  zona text,
  potencial_categoria text,
  volume_mercado numeric,
  ctos_merc numeric,
  nova_area boolean not null default false,   -- checkbox da coluna "Nova Área" dentro deste painel
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (origem, dn)
);

comment on table public.lojas_nao_cadastradas is
  'Lojas candidatas para uma nova área/GCM: enviadas via upload (não-clientes) ou copiadas do Painel principal (marcação "Nova Área"). Usada para somar o potencial de uma região antes de decidir uma contratação.';

create index if not exists idx_nao_cadastradas_dn on public.lojas_nao_cadastradas (dn);
create index if not exists idx_nao_cadastradas_origem on public.lojas_nao_cadastradas (origem);

alter table public.lojas_nao_cadastradas enable row level security;

-- Esta é uma área estratégica (planejamento de contratação), então só
-- administradores enxergam e mexem nesta tabela — diferente do painel
-- principal, que todo usuário autenticado pode ler.
drop policy if exists "nao_cadastradas_select" on public.lojas_nao_cadastradas;
create policy "nao_cadastradas_select" on public.lojas_nao_cadastradas
  for select to authenticated using (public.eh_admin());

drop policy if exists "nao_cadastradas_admin_all" on public.lojas_nao_cadastradas;
create policy "nao_cadastradas_admin_all" on public.lojas_nao_cadastradas
  for all to authenticated using (public.eh_admin()) with check (public.eh_admin());
