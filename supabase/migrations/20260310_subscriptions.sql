-- ============================================
-- FINANCO - Migração: Sistema de Planos
-- Adiciona suporte a planos Free / Premium
-- ============================================

-- 1. Adiciona coluna "plan" na tabela users
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free'
    CHECK (plan IN ('free', 'premium'));

-- 2. Tabela de assinaturas (rastreia pagamentos Stripe)
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id      TEXT,
  stripe_subscription_id  TEXT UNIQUE,
  status                  TEXT NOT NULL DEFAULT 'inactive'
    CHECK (status IN ('active', 'inactive', 'canceled', 'past_due', 'trialing')),
  plan                    TEXT NOT NULL DEFAULT 'free'
    CHECK (plan IN ('free', 'premium')),
  current_period_start    TIMESTAMPTZ,
  current_period_end      TIMESTAMPTZ,
  canceled_at             TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id
  ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id
  ON public.subscriptions(stripe_customer_id);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Usuário pode ver sua própria assinatura
DROP POLICY IF EXISTS "subscriptions_select" ON public.subscriptions;
CREATE POLICY "subscriptions_select" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- Apenas service role pode inserir/atualizar (via webhook Stripe)
-- Não criamos policies de INSERT/UPDATE/DELETE para usuários finais

-- Trigger updated_at
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
