-- =====================================================================
-- MIGRAÇÃO: MPL (Meta por Loja), ATENDIMENTO e BASE DE FILIAL/REGIONAL
-- =====================================================================
-- Execute isto no SQL Editor do Supabase.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. MPL - Valor e MPL - Ctos (metas por loja), no Painel principal.
--    Mesma tabela/lógica da Meta CDC Prem já existente.
-- ---------------------------------------------------------------------
alter table public.metas_loja add column if not exists mpl_valor numeric;
alter table public.metas_loja add column if not exists mpl_ctos numeric;

-- ---------------------------------------------------------------------
-- 2. Coluna "Atendimento" no painel Mercado Potencial (ex-"Não cadastradas"):
--    nome do GCM responsável, editável, começa em branco se a planilha
--    não trouxer essa informação.
-- ---------------------------------------------------------------------
alter table public.lojas_nao_cadastradas add column if not exists atendimento text;

-- ---------------------------------------------------------------------
-- 3. Base para os perfis de visualização por Filial/Regional.
--    "filial" e "regional" ficam gravados na própria tabela "lojas"
--    (copiados do arquivo Potencial, colunas T e S) para a política de
--    segurança (RLS) poder filtrar sem precisar cruzar tabelas toda hora.
-- ---------------------------------------------------------------------
alter table public.lojas add column if not exists filial text;
alter table public.lojas add column if not exists regional text;

-- Nova coluna no perfil do usuário: a qual Filial (ou Regional) ele está
-- vinculado. Valores esperados (copie e cole exatamente, com acentos e tudo):
--   FILIAL GRANDE SP 1 | FILIAL GRANDE SP 2 | FILIAL CAMPINAS |
--   FILIAL JUNDIAI/VALE | REGIONAL 1
-- Deixe em branco (NULL) para quem não deve ter essa restrição extra
-- (ex: administradores, ou quem já usa a restrição antiga por GCM).
alter table public.perfis add column if not exists filial_atribuida text;

-- ---------------------------------------------------------------------
-- 4. Atualiza as políticas de segurança de "lojas", "potencial" e
--    "producao" para também liberar quem tiver uma Filial/Regional
--    atribuída no perfil — sem tirar o acesso de quem já usa o
--    mecanismo antigo (admin vê tudo; visualizador por GCM continua igual).
-- ---------------------------------------------------------------------
drop policy if exists "lojas_select" on public.lojas;
create policy "lojas_select" on public.lojas
  for select to authenticated using (
    public.eh_admin()
    or lojas.gcm = public.meu_gcm()
    or exists (
      select 1 from public.perfis pf
      where pf.id = auth.uid()
        and pf.filial_atribuida is not null
        and (
          (pf.filial_atribuida = 'REGIONAL 1' and lojas.regional = 'REGIONAL 1')
          or lojas.filial = pf.filial_atribuida
        )
    )
  );

drop policy if exists "potencial_select" on public.potencial;
create policy "potencial_select" on public.potencial
  for select to authenticated using (
    public.eh_admin()
    or exists (
      select 1 from public.lojas lj
      where regexp_replace(lj.cnpj, '\D', '', 'g') = regexp_replace(potencial.cnpj_loja, '\D', '', 'g')
        and lj.gcm = public.meu_gcm()
    )
    or exists (
      select 1 from public.perfis pf
      where pf.id = auth.uid()
        and pf.filial_atribuida is not null
        and (
          (pf.filial_atribuida = 'REGIONAL 1' and potencial.regional = 'REGIONAL 1')
          or potencial.filial = pf.filial_atribuida
        )
    )
  );

drop policy if exists "producao_select" on public.producao;
create policy "producao_select" on public.producao
  for select to authenticated using (
    public.eh_admin()
    or producao.gcm = public.meu_gcm()
    or exists (
      select 1 from public.lojas lj
      where lj.dn = producao.dn
        and (
          exists (
            select 1 from public.perfis pf
            where pf.id = auth.uid()
              and pf.filial_atribuida is not null
              and (
                (pf.filial_atribuida = 'REGIONAL 1' and lj.regional = 'REGIONAL 1')
                or lj.filial = pf.filial_atribuida
              )
          )
        )
    )
  );

-- ---------------------------------------------------------------------
-- 5. Exemplo de como vincular um usuário a uma Filial ou Regional.
--    Repita esse UPDATE trocando o e-mail e a filial pra cada pessoa.
--    (Rode um por vez, ou monte um bloco só com vários UPDATEs seguidos.)
-- ---------------------------------------------------------------------
-- update public.perfis set filial_atribuida = 'FILIAL GRANDE SP 1' where email = 'hermes.junior@vwfs.com';
-- update public.perfis set filial_atribuida = 'FILIAL GRANDE SP 2' where email = 'exemplo2@vwfs.com';
-- update public.perfis set filial_atribuida = 'FILIAL CAMPINAS'    where email = 'exemplo3@vwfs.com';
-- update public.perfis set filial_atribuida = 'FILIAL JUNDIAI/VALE' where email = 'exemplo4@vwfs.com';
-- update public.perfis set filial_atribuida = 'REGIONAL 1'         where email = 'exemplo5@vwfs.com';
