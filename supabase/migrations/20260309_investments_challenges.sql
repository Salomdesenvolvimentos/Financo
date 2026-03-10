-- ============================================
-- FINACO - Migração: Investimentos e Desafios
-- Migrar dados locais para Supabase
-- ============================================

-- ---- Colunas que faltam em transactions ----
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS is_fatura BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS modalidade_pagamento TEXT
    CHECK (modalidade_pagamento IN ('a_vista', 'credito'));

-- ============================================
-- TABELA: investments (carteira de investimentos)
-- ============================================
CREATE TABLE IF NOT EXISTS public.investments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome          TEXT NOT NULL,
  tipo          TEXT NOT NULL,
  instituicao   TEXT NOT NULL,
  valor_investido  DECIMAL(15, 2) NOT NULL DEFAULT 0,
  valor_atual      DECIMAL(15, 2) NOT NULL DEFAULT 0,
  data_inicio   DATE NOT NULL,
  vencimento    DATE,
  rentabilidade_anual DECIMAL(7, 4),
  notas         TEXT,
  ativo         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_investments_user_id ON public.investments(user_id);
CREATE INDEX IF NOT EXISTS idx_investments_ativo    ON public.investments(ativo);

ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "investments_select" ON public.investments
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "investments_insert" ON public.investments
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "investments_update" ON public.investments
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "investments_delete" ON public.investments
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger updated_at (reutiliza função existente do schema.sql)
CREATE TRIGGER update_investments_updated_at
  BEFORE UPDATE ON public.investments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TABELA: challenges (desafios de poupança)
-- ============================================
CREATE TABLE IF NOT EXISTS public.challenges (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id  TEXT NOT NULL,   -- e.g. 'no-delivery'
  title         TEXT NOT NULL,
  description   TEXT,
  emoji         TEXT,
  target        DECIMAL(12, 2) NOT NULL DEFAULT 0,
  category      TEXT,
  progress      DECIMAL(12, 2) NOT NULL DEFAULT 0,
  completed     BOOLEAN NOT NULL DEFAULT FALSE,
  started_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, challenge_id)
);

CREATE INDEX IF NOT EXISTS idx_challenges_user_id ON public.challenges(user_id);

ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "challenges_select" ON public.challenges
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "challenges_insert" ON public.challenges
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "challenges_update" ON public.challenges
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "challenges_delete" ON public.challenges
  FOR DELETE USING (auth.uid() = user_id);
