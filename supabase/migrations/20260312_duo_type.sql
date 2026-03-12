-- ============================================
-- Adiciona coluna duo_type em duo_challenges
-- Tipos: 'challenge' (competitivo) ou 'cooperative' (cooperativo)
-- ============================================

ALTER TABLE public.duo_challenges
  ADD COLUMN IF NOT EXISTS duo_type TEXT NOT NULL DEFAULT 'challenge'
    CHECK (duo_type IN ('challenge', 'cooperative'));
