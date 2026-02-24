-- ============================================
-- FINACO - Solução Alternativa (Bypass RLS)
-- Execute este script se o anterior não funcionou
-- ============================================

-- Opção 1: Recriar funções com bypass completo de RLS
-- Isso permite que a trigger funcione sem problemas

-- 1. Recriar função de categorias que bypassa RLS
CREATE OR REPLACE FUNCTION create_default_categories(p_user_id UUID)
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
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
    (p_user_id, 'Outros', 'despesa', '#64748B', 'more-horizontal'),
    (p_user_id, 'Salário', 'receita', '#10B981', 'dollar-sign'),
    (p_user_id, 'Freelance', 'receita', '#3B82F6', 'briefcase'),
    (p_user_id, 'Investimentos', 'receita', '#8B5CF6', 'trending-up'),
    (p_user_id, 'Outros', 'receita', '#64748B', 'more-horizontal');
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Erro ao criar categorias: %', SQLERRM;
END;
$$;

-- 2. Recriar função handle_new_user mais robusta
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Inserir usuário
  INSERT INTO public.users (id, email, nome)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'nome',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    )
  );
  
  -- Criar categorias padrão
  PERFORM create_default_categories(NEW.id);
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Erro em handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- 3. Dar permissões explícitas ao postgres
-- (o usuário postgres do Supabase deve ser capaz de bypassar RLS)
ALTER FUNCTION create_default_categories(UUID) OWNER TO postgres;
ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

-- 4. Recriar trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Pronto! Tente criar a conta novamente
