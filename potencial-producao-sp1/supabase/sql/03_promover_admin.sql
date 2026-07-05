-- =====================================================================
-- PROMOVER UM USUÁRIO A ADMIN
-- =====================================================================
-- Use isso DEPOIS de criar sua conta no site (tela de cadastro).
-- Troque o e-mail abaixo pelo e-mail que você usou para se cadastrar.
-- Execute no SQL Editor do Supabase.
-- =====================================================================

update public.perfis
set papel = 'admin'
where email = 'SEU-EMAIL-AQUI@exemplo.com';

-- Para conferir se funcionou, rode também:
-- select email, papel from public.perfis;
