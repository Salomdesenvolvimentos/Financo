-- ============================================
-- FINACO - Schema do Banco de Dados Supabase
-- Sistema de Controle Financeiro Inteligente
-- ============================================

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABELA: users (perfis de usuário)
-- ============================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  nome TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- ============================================
-- TABELA: categories (categorias de transações)
-- ============================================
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('receita', 'despesa')),
  cor TEXT DEFAULT '#3B82F6',
  icone TEXT DEFAULT 'circle',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(user_id, nome, tipo)
);

-- ============================================
-- TABELA: transactions (transações financeiras)
-- ============================================
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  numero SERIAL,
  descricao TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('receita', 'despesa')),
  categoria_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  responsavel TEXT,
  status TEXT NOT NULL DEFAULT 'andamento' CHECK (status IN ('pago', 'vencido', 'andamento')),
  valor DECIMAL(15, 2) NOT NULL,
  data_transacao DATE NOT NULL,
  data_vencimento DATE,
  forma_pagamento TEXT,
  parcelado BOOLEAN DEFAULT FALSE,
  total_parcelas INTEGER DEFAULT 1,
  parcela_atual INTEGER DEFAULT 1,
  grupo_parcela_id UUID,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- ============================================
-- TABELA: insights (análises inteligentes)
-- ============================================
CREATE TABLE IF NOT EXISTS public.insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  mensagem TEXT NOT NULL,
  nivel TEXT NOT NULL DEFAULT 'info' CHECK (nivel IN ('info', 'alerta', 'risco')),
  tipo TEXT,
  valor_referencia DECIMAL(15, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- ============================================
-- TABELA: learning_rules (aprendizado de máquina)
-- ============================================
CREATE TABLE IF NOT EXISTS public.learning_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  descricao_pattern TEXT NOT NULL,
  categoria_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('receita', 'despesa')),
  confianca INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(user_id, descricao_pattern)
);

-- ============================================
-- ÍNDICES para performance
-- ============================================
CREATE INDEX idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX idx_transactions_data_transacao ON public.transactions(data_transacao);
CREATE INDEX idx_transactions_tipo ON public.transactions(tipo);
CREATE INDEX idx_transactions_status ON public.transactions(status);
CREATE INDEX idx_transactions_grupo_parcela ON public.transactions(grupo_parcela_id);
CREATE INDEX idx_categories_user_id ON public.categories(user_id);
CREATE INDEX idx_insights_user_id ON public.insights(user_id);
CREATE INDEX idx_learning_rules_user_id ON public.learning_rules(user_id);

-- ============================================
-- FUNCTION: Atualizar updated_at automaticamente
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para transactions
CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger para users
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FUNCTION: Atualizar status de transações vencidas
-- ============================================
CREATE OR REPLACE FUNCTION update_overdue_transactions()
RETURNS void AS $$
BEGIN
  UPDATE public.transactions
  SET status = 'vencido'
  WHERE status = 'andamento'
    AND data_vencimento < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_rules ENABLE ROW LEVEL SECURITY;

-- Políticas para users
CREATE POLICY "Usuários podem ver seu próprio perfil"
  ON public.users FOR SELECT
  USING (auth.uid()::text = id::text);

CREATE POLICY "Usuários podem inserir seu próprio perfil"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid()::text = id::text);

CREATE POLICY "Usuários podem atualizar seu próprio perfil"
  ON public.users FOR UPDATE
  USING (auth.uid()::text = id::text);

-- Políticas para categories
CREATE POLICY "Usuários podem ver suas próprias categorias"
  ON public.categories FOR SELECT
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Usuários podem inserir suas próprias categorias"
  ON public.categories FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Usuários podem atualizar suas próprias categorias"
  ON public.categories FOR UPDATE
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Usuários podem deletar suas próprias categorias"
  ON public.categories FOR DELETE
  USING (auth.uid()::text = user_id::text);

-- Políticas para transactions
CREATE POLICY "Usuários podem ver suas próprias transações"
  ON public.transactions FOR SELECT
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Usuários podem inserir suas próprias transações"
  ON public.transactions FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Usuários podem atualizar suas próprias transações"
  ON public.transactions FOR UPDATE
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Usuários podem deletar suas próprias transações"
  ON public.transactions FOR DELETE
  USING (auth.uid()::text = user_id::text);

-- Políticas para insights
CREATE POLICY "Usuários podem ver seus próprios insights"
  ON public.insights FOR SELECT
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Usuários podem inserir seus próprios insights"
  ON public.insights FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Usuários podem deletar seus próprios insights"
  ON public.insights FOR DELETE
  USING (auth.uid()::text = user_id::text);

-- Políticas para learning_rules
CREATE POLICY "Usuários podem ver suas próprias regras"
  ON public.learning_rules FOR SELECT
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Usuários podem inserir suas próprias regras"
  ON public.learning_rules FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Usuários podem atualizar suas próprias regras"
  ON public.learning_rules FOR UPDATE
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Usuários podem deletar suas próprias regras"
  ON public.learning_rules FOR DELETE
  USING (auth.uid()::text = user_id::text);

-- ============================================
-- DADOS INICIAIS: Categorias padrão
-- ============================================
-- Nota: Essas categorias serão criadas para cada novo usuário
-- através de uma trigger ou durante o primeiro acesso

-- ============================================
-- FUNCTION: Criar categorias padrão para novo usuário
-- ============================================
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

-- ============================================
-- FUNCTION: Criar perfil de usuário no primeiro login
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, nome)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  );
  
  -- Criar categorias padrão
  PERFORM create_default_categories(NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para criar perfil automaticamente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- FIM DO SCHEMA
-- ============================================
