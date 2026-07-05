-- =====================================================================
-- MIGRAÇÃO: NOMES DE MÊS EM PORTUGUÊS (independente do locale do servidor)
-- =====================================================================
-- Execute isto DEPOIS do arquivo 06, no SQL Editor do Supabase.
--
-- Motivo: a função anterior usava to_char(..., 'TMMonth/YYYY'), que depende
-- do locale configurado no servidor Postgres. Como o servidor do Supabase
-- está em inglês, os rótulos saíam como "June/2026" em vez de "Junho/2026".
-- Esta versão usa um mapeamento fixo de número de mês para nome em
-- português, sem depender de configuração externa.
-- =====================================================================

create or replace function public.recalcular_rotulo_mes(p_mes_posicao text)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_mes_ano date;
  v_nomes_mes text[] := array[
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  v_rotulo text;
begin
  select date_trunc('month', pagamento)::date
    into v_mes_ano
    from public.producao
    where mes_posicao = p_mes_posicao and pagamento is not null
    group by date_trunc('month', pagamento)
    order by count(*) desc, date_trunc('month', pagamento) desc
    limit 1;

  if v_mes_ano is not null then
    v_rotulo := v_nomes_mes[extract(month from v_mes_ano)::int] || '/' || extract(year from v_mes_ano)::text;
  end if;

  update public.producao_meta
  set rotulo_mes = v_rotulo,
      atualizado_em = now()
  where mes_posicao = p_mes_posicao;
end;
$$;

comment on function public.recalcular_rotulo_mes is 'Recalcula o rótulo (ex: Abril/2026) de uma posição de mês a partir da data PAGAMENTO dos lançamentos, em português.';

-- Recalcula imediatamente os rótulos já existentes, para corrigir o que
-- já estava salvo em inglês (June/2026, May/2026, April/2026 etc.)
select public.recalcular_rotulo_mes('M1');
select public.recalcular_rotulo_mes('M2');
select public.recalcular_rotulo_mes('M3');
