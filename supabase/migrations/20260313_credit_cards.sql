-- ============================================
-- FINACO - Migração: Cartões de Crédito e Faturas
-- ============================================

-- TABELA: credit_cards (cartões de crédito do usuário)
CREATE TABLE IF NOT EXISTS public.credit_cards (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome             TEXT NOT NULL,
  banco            TEXT,
  limite           DECIMAL(12,2) NOT NULL DEFAULT 0,
  dia_fechamento   INTEGER NOT NULL DEFAULT 1 CHECK (dia_fechamento BETWEEN 1 AND 31),
  dia_vencimento   INTEGER NOT NULL DEFAULT 10 CHECK (dia_vencimento BETWEEN 1 AND 31),
  cor              TEXT DEFAULT '#6366F1',
  ativo            BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_cards_user_id ON public.credit_cards(user_id);

ALTER TABLE public.credit_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "credit_cards_select" ON public.credit_cards
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "credit_cards_insert" ON public.credit_cards
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "credit_cards_update" ON public.credit_cards
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "credit_cards_delete" ON public.credit_cards
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger updated_at
CREATE OR REPLACE TRIGGER update_credit_cards_updated_at
  BEFORE UPDATE ON public.credit_cards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- Adicionar cartao_id nas transações
-- ============================================
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS cartao_id UUID REFERENCES public.credit_cards(id) ON DELETE SET NULL;

-- ============================================
-- Adicionar categoria_id em rendas fixas
-- ============================================
ALTER TABLE public.fixed_income
  ADD COLUMN IF NOT EXISTS categoria_id UUID REFERENCES public.categories(id) ON DELETE SET NULL;

-- ============================================
-- Adicionar avatar_url em perfis
-- ============================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;
