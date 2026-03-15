-- ============================================
-- FINANCO - Migração: premium_until + app_config
-- Controle de período premium e preço configurável
-- ============================================

-- 1. Coluna premium_until em public.users
--    NULL = permanente (sem expiração)
--    data futura = premium ativo até essa data
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS premium_until TIMESTAMPTZ;

-- 2. Tabela de configurações do app (admin-only writes, public reads)
CREATE TABLE IF NOT EXISTS public.app_config (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

-- Qualquer usuário autenticado (e anônimo se anon key) pode ler
DROP POLICY IF EXISTS "config_select" ON public.app_config;
CREATE POLICY "config_select" ON public.app_config
  FOR SELECT USING (true);

-- Somente service_role pode escrever (via Edge Function / API Route)
-- (INSERT/UPDATE/DELETE não têm policy → bloqueado para usuários normais)

-- 3. Valor padrão de preço
INSERT INTO public.app_config (key, value)
VALUES ('premium_price', '29.90')
ON CONFLICT (key) DO NOTHING;
