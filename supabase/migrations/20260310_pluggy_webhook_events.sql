-- ============================================
-- FINACO - Migração: Tabela de eventos webhook Pluggy
-- ============================================

CREATE TABLE IF NOT EXISTS public.pluggy_webhook_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event       TEXT NOT NULL,
  item_id     TEXT,
  payload     JSONB,
  processed   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pluggy_webhook_events_processed
  ON public.pluggy_webhook_events(processed);

CREATE INDEX IF NOT EXISTS idx_pluggy_webhook_events_created_at
  ON public.pluggy_webhook_events(created_at DESC);

-- Apenas o service role pode acessar (sem RLS para usuários finais)
ALTER TABLE public.pluggy_webhook_events ENABLE ROW LEVEL SECURITY;

-- Sem políticas públicas — acesso apenas via service_role key
