-- ============================================
-- FINACO - Correção de Políticas RLS e Functions
-- Execute este script no SQL Editor do Supabase
-- ============================================

-- 1. Adicionar política de INSERT para a tabela users
DROP POLICY IF EXISTS "Usuários podem inserir seu próprio perfil" ON public.users;
CREATE POLICY "Usuários podem inserir seu próprio perfil"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid()::text = id::text);

-- 2. Recriar função de categorias com SECURITY DEFINER
CREATE OR REPLACE FUNCTION create_default_categories(p_user_id UUID)
RETURNS void AS $$
BEGIN
  -- Categorias de Despesa
  INSERT INTO public.categories (user_id, nome, tipo, cor, icone) VALUES
    (p_user_id, 'Alimentação', 'despesa', '#EF4444', 'utensils'),
    (p_user_id, 'Transporte', 'despesa', '#F59E0B', 'car'),
    (p_user_id, 'Moradia', 'despesa', '#8B5CF6', 'home'),
    (p_user_id, 'Saúde', 'despesa', '#EC4899', 'heart'),
    (p_user_id, 'Educação', 'despesa', '#3B82F6', 'book'),
    (p_user_id, 'Lazer', 'despesa', '#10B981', 'smile'),
    (p_user_id, 'Compras', 'despesa', '#F97316', 'shopping-bag'),
    (p_user_id, 'Contas', 'despesa', '#6366F1', 'receipt'),
    (p_user_id, 'Outros', 'despesa', '#64748B', 'more-horizontal');

  -- Categorias de Receita
  INSERT INTO public.categories (user_id, nome, tipo, cor, icone) VALUES
    (p_user_id, 'Salário', 'receita', '#10B981', 'dollar-sign'),
    (p_user_id, 'Freelance', 'receita', '#3B82F6', 'briefcase'),
    (p_user_id, 'Investimentos', 'receita', '#8B5CF6', 'trending-up'),
    (p_user_id, 'Outros', 'receita', '#64748B', 'more-horizontal');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Recriar função handle_new_user com SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, nome)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  );
  
  -- Criar categorias padrão
  PERFORM create_default_categories(NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Recriar a trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 5. Verificar políticas
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  cmd as operation
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('users', 'categories')
ORDER BY tablename, cmd;
