-- ============================================
-- FINACO - Teste de Criação de Usuário
-- Execute para testar se as funções funcionam
-- ============================================

-- 1. Ver os logs da função (execute depois de tentar criar conta)
-- No Supabase Dashboard > Database > Logs
-- Ou veja em Auth > Logs

-- 2. Teste manual da função handle_new_user
-- Primeiro, vamos criar um usuário de teste diretamente

-- Ver se a função tem SECURITY DEFINER
SELECT 
  proname as nome_funcao,
  prosecdef as security_definer,
  provolatile as volatility
FROM pg_proc 
WHERE proname IN ('handle_new_user', 'create_default_categories');

-- Ver todas as políticas de users
SELECT 
  policyname as nome_politica,
  cmd as operacao,
  permissive as permissiva,
  qual as expressao
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'users';

-- Ver todas as políticas de categories  
SELECT 
  policyname as nome_politica,
  cmd as operacao
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'categories';

-- Ver se a trigger existe
SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'users' 
  AND trigger_schema = 'auth';
