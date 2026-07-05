-- =====================================================================
-- PAINEL POTENCIAL x PRODUÇÃO - SCHEMA PRINCIPAL
-- =====================================================================
-- Execute este arquivo inteiro no SQL Editor do Supabase.
-- Painel > SQL Editor > New query > cole tudo > Run
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. PERFIS DE USUÁRIO (admin / visualizador)
-- ---------------------------------------------------------------------
-- Toda vez que alguém se cadastra no Supabase Auth, criamos
-- automaticamente um registro aqui com o papel "visualizador".
-- Você (admin) precisará promover manualmente o primeiro usuário admin.

create table if not exists public.perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  nome text,
  papel text not null default 'visualizador' check (papel in ('admin', 'visualizador')),
  criado_em timestamptz not null default now()
);

comment on table public.perfis is 'Perfis de acesso dos usuários: admin (faz upload) ou visualizador (apenas vê)';

-- Função e trigger: cria o perfil automaticamente quando um usuário se registra
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.perfis (id, email, papel)
  values (new.id, new.email, 'visualizador');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ---------------------------------------------------------------------
-- 2. LOJAS (cadastro / banco de dados das lojas)
-- ---------------------------------------------------------------------
create table if not exists public.lojas (
  id bigint generated always as identity primary key,
  cnpj_loja text,
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
  filial text,            -- código da loja (chave de ligação principal)
  status_loja text,
  expurgo_rj text,
  porte_loja text,
  gcm text,                -- usado como filtro principal no painel
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

comment on table public.lojas is 'Cadastro das lojas (banco de dados Lojas) - substituído por completo a cada upload';
create index if not exists idx_lojas_filial on public.lojas (filial);
create index if not exists idx_lojas_gcm on public.lojas (gcm);


-- ---------------------------------------------------------------------
-- 3. POTENCIAL (aba SP1)
-- ---------------------------------------------------------------------
create table if not exists public.potencial (
  id bigint generated always as identity primary key,
  dn text,                 -- código da loja (chave de ligação)
  razao_social text,
  endereco text,
  numero text,
  bairro text,
  cep text,
  zona text,
  gcm text,                -- usado como filtro principal no painel
  potencial numeric,
  mercado numeric,
  merc numeric,
  atualizado_em timestamptz not null default now()
);

comment on table public.potencial is 'Banco de potencial das lojas (aba SP1) - substituído por completo a cada upload';
create index if not exists idx_potencial_dn on public.potencial (dn);
create index if not exists idx_potencial_gcm on public.potencial (gcm);


-- ---------------------------------------------------------------------
-- 4. PRODUÇÃO (abas dos meses) - 3 posições rolantes: M1, M2, M3
-- ---------------------------------------------------------------------
-- mes_posicao: 'M1' = mês atual/mais recente, 'M2' = mês anterior, 'M3' = mês retrasado
-- Cada upload em M1 empurra automaticamente o conteúdo: M1 antigo -> M2, M2 antigo -> M3 (M3 antigo é descartado)
-- Isso é feito pela função rotacionar_producao() abaixo, chamada antes da inserção de um novo M1.

create table if not exists public.producao (
  id bigint generated always as identity primary key,
  mes_posicao text not null check (mes_posicao in ('M1', 'M2', 'M3')),
  rotulo_mes text,         -- ex: "Junho/2026" - preenchido no momento do upload
  pagamento date,          -- coluna A da planilha original
  dealer text,             -- código da loja (chave de ligação)
  vlr_financiado numeric,
  quant numeric,
  atualizado_em timestamptz not null default now()
);

comment on table public.producao is 'Dados de produção por posição de mês rolante (M1=atual, M2=anterior, M3=retrasado)';
create index if not exists idx_producao_dealer on public.producao (dealer);
create index if not exists idx_producao_mes_posicao on public.producao (mes_posicao);

-- Tabela auxiliar para guardar o rótulo de cada posição (o que é "M1" hoje, etc)
create table if not exists public.producao_meta (
  mes_posicao text primary key check (mes_posicao in ('M1', 'M2', 'M3')),
  rotulo_mes text,
  atualizado_em timestamptz not null default now()
);

insert into public.producao_meta (mes_posicao, rotulo_mes)
values ('M1', null), ('M2', null), ('M3', null)
on conflict (mes_posicao) do nothing;


-- ---------------------------------------------------------------------
-- 5. FUNÇÃO DE ROTAÇÃO: M1 -> M2 -> M3 (M3 antigo descartado)
-- ---------------------------------------------------------------------
-- Chamada pelo frontend (via RPC) ANTES de inserir o novo arquivo de M1.
-- Ela move os dados de produção e os rótulos de mês de uma posição para a próxima.

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

comment on function public.rotacionar_producao is 'Empurra M1->M2->M3 (descarta M3 antigo). Chamar antes de inserir novo upload em M1.';
