-- =====================================================================
-- MIGRAÇÃO: AJUSTE DE COLUNAS - LOJAS NÃO CADASTRADAS
-- =====================================================================
-- Execute isto DEPOIS do arquivo 08_lojas_nao_cadastradas.sql, no SQL
-- Editor do Supabase.
--
-- Motivo: a planilha real de "Lojas não cadastradas" usa a mesma
-- estrutura do arquivo Potencial (colunas B, C, H, I, K, L, N, P, U, W,
-- AJ, BB), que inclui CIDADE, MICRORREGIAO e STATUS_LOJA — campos que
-- não existiam ainda na tabela.
-- =====================================================================

alter table public.lojas_nao_cadastradas add column if not exists cidade text;
alter table public.lojas_nao_cadastradas add column if not exists microrregiao text;
alter table public.lojas_nao_cadastradas add column if not exists status_loja text;
