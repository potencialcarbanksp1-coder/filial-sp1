-- =====================================================================
-- MIGRAÇÃO: RÓTULO AUTOMÁTICO DO MÊS + BOTÃO "NOVO MÊS" SEPARADO
-- =====================================================================
-- Execute isto DEPOIS dos arquivos 01, 02, 03, 04 e 05, no SQL Editor do Supabase.
--
-- Mudança de comportamento:
--   - Os botões "Produção M1", "Produção M2" e "Produção M3" agora SÓ
--     substituem o conteúdo da própria posição (sem empurrar nada).
--   - Um novo botão "Novo mês" é quem dispara a rotação: M1 atual -> M2,
--     M2 atual -> M3 (M3 antigo é descartado), e o arquivo novo entra como M1.
--   - O rótulo de cada posição (ex: "Abril/2026") deixa de ser digitado
--     manualmente: agora é calculado automaticamente a partir da data
--     mais frequente na coluna PAGAMENTO dos lançamentos daquela posição.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Função: recalcula o rótulo de uma posição de mês a partir dos
--    próprios dados de produção (usa o mês/ano mais frequente entre os
--    lançamentos daquela posição).
-- ---------------------------------------------------------------------
create or replace function public.recalcular_rotulo_mes(p_mes_posicao text)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_rotulo text;
begin
  select to_char(pagamento, 'TMMonth/YYYY')
    into v_rotulo
    from public.producao
    where mes_posicao = p_mes_posicao and pagamento is not null
    group by to_char(pagamento, 'TMMonth/YYYY'), date_trunc('month', pagamento)
    order by count(*) desc, date_trunc('month', pagamento) desc
    limit 1;

  update public.producao_meta
  set rotulo_mes = initcap(v_rotulo),
      atualizado_em = now()
  where mes_posicao = p_mes_posicao;
end;
$$;

comment on function public.recalcular_rotulo_mes is 'Recalcula o rótulo (ex: Abril/2026) de uma posição de mês a partir da data PAGAMENTO dos lançamentos.';

-- ---------------------------------------------------------------------
-- 2. Função: rotaciona M1->M2->M3 SEM inserir dados novos.
--    (a inserção do novo arquivo em M1 é feita separadamente pelo
--    frontend, depois de chamar esta função)
-- ---------------------------------------------------------------------
create or replace function public.rotacionar_producao()
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  -- Apaga M3 (mês mais antigo, sai do painel)
  delete from public.producao where mes_posicao = 'M3';

  -- M2 -> M3
  update public.producao set mes_posicao = 'M3' where mes_posicao = 'M2';

  -- M1 -> M2
  update public.producao set mes_posicao = 'M2' where mes_posicao = 'M1';

  -- Rótulos seguem a mesma rotação
  update public.producao_meta set rotulo_mes = (select rotulo_mes from public.producao_meta where mes_posicao = 'M2'), atualizado_em = now()
    where mes_posicao = 'M3';
  update public.producao_meta set rotulo_mes = (select rotulo_mes from public.producao_meta where mes_posicao = 'M1'), atualizado_em = now()
    where mes_posicao = 'M2';
  update public.producao_meta set rotulo_mes = null, atualizado_em = now()
    where mes_posicao = 'M1';
end;
$$;

comment on function public.rotacionar_producao is 'Empurra M1->M2->M3 (descarta M3 antigo). Usado pelo botão "Novo mês" antes de inserir o arquivo novo em M1.';
