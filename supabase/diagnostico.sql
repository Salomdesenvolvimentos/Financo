-- ============================================
-- FINACO - Diagnóstico do Banco de Dados
-- Execute para verificar o estado atual
-- ============================================

-- 1. Verificar políticas da tabela users
SELECT 
  tablename, 
  policyname, 
  cmd as operation,
  qual as using_expression
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'users';

-- 2. Verificar funções existentes
SELECT 
  proname as function_name,
  prosecdef as is_security_definer
FROM pg_proc 
WHERE proname IN ('handle_new_user', 'create_default_categories');

-- 3. Verificar se a trigger existe
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- 4. Verificar tabelas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('users', 'categories', 'transactions');
