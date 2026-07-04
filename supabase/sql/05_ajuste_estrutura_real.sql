-- =====================================================================
-- MIGRAÇÃO: AJUSTE DA ESTRUTURA REAL DOS ARQUIVOS
-- =====================================================================
-- Execute isto DEPOIS dos arquivos 01, 02, 03 e 04, no SQL Editor do Supabase.
--
-- Motivo: os arquivos reais de Lojas, Potencial e Produção têm uma
-- estrutura de colunas diferente da que foi mapeada inicialmente.
-- Esta migração:
--   1. Apaga e recria as tabelas "lojas" e "potencial" com os campos certos.
--   2. Adiciona a coluna "gcm" na tabela "producao" (ela vem nos arquivos
--      mensais de produção).
--   3. Remove a coluna "quant" de "producao" (não existe nos arquivos —
--      a quantidade agora é contada automaticamente como nº de contratos).
--   4. Atualiza as políticas de segurança (RLS) para usar os novos campos.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Recriar a tabela LOJAS com a estrutura real
-- ---------------------------------------------------------------------
-- Colunas reais do arquivo Lojas.xlsx (lado esquerdo da planilha):
-- DN | CNPJ | RAZÃO SOCIAL | GCM | ENDERECO | Nº | BAIRRO | CEP | ZONA

drop table if exists public.lojas cascade;

create table public.lojas (
  id bigint generated always as identity primary key,
  dn text,                 -- código da loja (chave de ligação principal)
  cnpj text,
  razao_social text,
  gcm text,                -- usado como filtro principal no painel
  endereco text,
  numero text,
  bairro text,
  cep text,
  zona text,
  atualizado_em timestamptz not null default now()
);

comment on table public.lojas is 'Cadastro das lojas (banco de dados Lojas) - substituído por completo a cada upload';
create index idx_lojas_dn on public.lojas (dn);
create index idx_lojas_gcm on public.lojas (gcm);

alter table public.lojas enable row level security;

create policy "lojas_select" on public.lojas
  for select to authenticated
  using (public.eh_admin() or gcm = public.meu_gcm());

create policy "lojas_admin_all" on public.lojas
  for all to authenticated using (public.eh_admin()) with check (public.eh_admin());


-- ---------------------------------------------------------------------
-- 2. Recriar a tabela POTENCIAL com a estrutura real
-- ---------------------------------------------------------------------
-- Colunas reais do arquivo Potencial.xlsx (aba "sp1"):
-- CNPJ_LOJA, RAZAO_LOJA, NOME_FANTASIA, CNAE, CNAE_PRIMARIO, TIPO_LOJA_B3,
-- ENDERECO, NUM_LOJA, COMPLEMENTO, BAIRRO, CIDADE, UF, CEP, MESORREGIAO,
-- MICRORREGIAO, REGIAO, DIVISAO, REGIONAL, FILIAL, STATUS_LOJA, EXPURGO_RJ,
-- PORTE_LOJA, QT_FINANCIAMENTOS, VOL_FINANCIAMENTOS, e as métricas QT_LEVES* / VOL_LEVES*.
--
-- Esta tabela não tem uma coluna "DN" isolada — o código da loja vem
-- embutido no início do texto da coluna FILIAL (ex: "FILIAL GRANDE SP 1 - HERMES"
-- não contém o DN numérico). Por isso, o cruzamento com Lojas/Produção
-- é feito pelo CNPJ_LOJA, que é o identificador comum e confiável aqui.

drop table if exists public.potencial cascade;

create table public.potencial (
  id bigint generated always as identity primary key,
  ano_mes text,
  cnpj_loja text,           -- chave de ligação com lojas.cnpj
  razao_loja text,
  nome_fantasia text,
  cnae text,
  cnae_primario text,
  tipo_loja_b3 text,
  endereco text,
  num_loja text,
  complemento text,
  bairro text,
  cidade text,
  uf text,
  cep text,
  mesorregiao text,
  microrregiao text,
  regiao text,
  divisao text,
  regional text,
  filial text,
  status_loja text,
  expurgo_rj text,
  porte_loja text,
  qt_financiamentos numeric,
  vol_financiamentos numeric,
  qt_leves numeric,
  qt_leves_perfil_cb numeric,
  qt_leves_novos numeric,
  qt_leves_semi_i numeric,
  qt_leves_semi_ii numeric,
  qt_leves_semi_iii numeric,
  qt_leves_usados_1 numeric,
  qt_leves_usados_2 numeric,
  qt_leves_usados_3 numeric,
  vol_leves numeric,
  vol_leves_perfil_cb numeric,
  vol_leves_novos numeric,
  vol_leves_semi_i numeric,
  vol_leves_semi_ii numeric,
  vol_leves_semi_iii numeric,
  vol_leves_usados_1 numeric,
  vol_leves_usados_2 numeric,
  vol_leves_usados_3 numeric,
  qt_leves_cb numeric,
  qt_leves_novos_cb numeric,
  qt_leves_semi_i_cb numeric,
  qt_leves_semi_ii_cb numeric,
  qt_leves_semi_iii_cb numeric,
  vol_leves_cb numeric,
  vol_leves_novos_cb numeric,
  vol_leves_semi_i_cb numeric,
  vol_leves_semi_ii_cb numeric,
  vol_leves_semi_iii_cb numeric,
  qt_leves_usados_perfil_cb numeric,
  qt_leves_usados_cb numeric,
  atualizado_em timestamptz not null default now()
);

comment on table public.potencial is 'Base de potencial/produção agregada por loja (arquivo Potencial.xlsx, aba sp1) - substituído por completo a cada upload';
create index idx_potencial_cnpj on public.potencial (cnpj_loja);
create index idx_potencial_filial on public.potencial (filial);

alter table public.potencial enable row level security;

-- Observação: "potencial" não tem coluna GCM própria — o filtro por GCM
-- para esta tabela é feito via JOIN com lojas (mesmo CNPJ).
create policy "potencial_select" on public.potencial
  for select to authenticated
  using (
    public.eh_admin()
    or exists (
      select 1 from public.lojas l
      where l.cnpj = public.potencial.cnpj_loja
        and l.gcm = public.meu_gcm()
    )
  );

create policy "potencial_admin_all" on public.potencial
  for all to authenticated using (public.eh_admin()) with check (public.eh_admin());


-- ---------------------------------------------------------------------
-- 3. Ajustar a tabela PRODUCAO: adicionar gcm e dn, remover quant
-- ---------------------------------------------------------------------
-- Colunas reais do arquivo de Produção mensal:
-- PAGAMENTO, CONTRATO, PROPOSTA, PESSOA, DEALER (código-nome grudados),
-- GRUPO, PLANO SPF, AUTO REPARO, DECISAO, APROV, VLR FINANCIADO, GCM.
--
-- O DEALER chega como "60441-EMILIO EDMOND TEBCHERANI AUTOMOVEIS" — o
-- sistema separa isso em duas colunas: dn (código) e dealer_nome (nome).

alter table public.producao add column if not exists dn text;
alter table public.producao add column if not exists dealer_nome text;
alter table public.producao add column if not exists gcm text;
alter table public.producao drop column if exists quant;

create index if not exists idx_producao_dn on public.producao (dn);
create index if not exists idx_producao_gcm on public.producao (gcm);

-- Atualiza a política de leitura de produção para usar o gcm direto da própria tabela
drop policy if exists "producao_select" on public.producao;
create policy "producao_select" on public.producao
  for select to authenticated
  using (
    public.eh_admin()
    or gcm = public.meu_gcm()
  );
