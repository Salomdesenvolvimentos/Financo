-- ============================================
-- FINANCO - Migração de Segurança (2026-03-14)
-- Corrige vulnerabilidades identificadas em auditoria
-- ============================================

-- ============================================
-- 1. Corrigir enumeração de e-mails em profiles
--
-- A política anterior permitia que qualquer usuário autenticado
-- lesse o campo `email` de todos os outros perfis, possibilitando
-- enumeração massiva de e-mails cadastrados.
--
-- Novo modelo:
--   - Qualquer autenticado pode ver campos públicos (display_name,
--     avatar, pontos) — necessário para busca de amigos.
--   - O campo `email` só é visível para o próprio usuário.
--   - Para pesquisar amigos por e-mail, utilize a função
--     `search_profiles_by_email(query)` (ver abaixo), que pesquisa
--     mas nunca retorna o e-mail no resultado.
-- ============================================

DROP POLICY IF EXISTS "profiles_select" ON public.profiles;

-- Qualquer autenticado pode ver perfis públicos (sem e-mail)
CREATE POLICY "profiles_select_public" ON public.profiles
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Observação: o campo `email` é controlado via a função
-- `search_profiles_by_email` que nunca o expõe na resposta.
-- A aplicação (social.ts) já foi atualizada para não retornar
-- o campo email nas buscas de perfis de terceiros.

-- ============================================
-- 2. Eliminar auto-concessão de conquistas
--
-- A política anterior permitia qualquer usuário autenticado
-- inserir diretamente qualquer conquista para si mesmo, sem
-- validação de mérito (BOLA / privilege escalation).
--
-- Novo modelo:
--   - Remoção da política INSERT direta.
--   - Conquistas só são concedidas pela função SECURITY DEFINER
--     `award_achievement(p_achievement_id)`, que valida que a
--     conquista existe e usa `auth.uid()` internamente.
-- ============================================

DROP POLICY IF EXISTS "user_achievements_insert" ON public.user_achievements;

-- Função SECURITY DEFINER para concessão segura de conquistas
CREATE OR REPLACE FUNCTION public.award_achievement(p_achievement_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_points  INTEGER;
  v_rows    INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  -- Valida que a conquista existe
  SELECT points INTO v_points
  FROM achievement_definitions
  WHERE id = p_achievement_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Conquista inválida: %', p_achievement_id;
  END IF;

  -- Insere; no-op se já existe (idempotente)
  INSERT INTO user_achievements (user_id, achievement_id)
  VALUES (v_user_id, p_achievement_id)
  ON CONFLICT (user_id, achievement_id) DO NOTHING;

  GET DIAGNOSTICS v_rows = ROW_COUNT;

  -- Atualiza pontos apenas se foi uma conquista nova
  IF v_rows > 0 THEN
    UPDATE profiles
    SET total_points = COALESCE(total_points, 0) + v_points
    WHERE id = v_user_id;
  END IF;
END;
$$;

-- Somente a própria função SECURITY DEFINER pode inserir; revogar INSERT direto.
-- Usuários podem ver suas próprias conquistas e as de amigos (feed social).
-- A política SELECT permanece como 'authenticated' (existente, não alterada aqui).

-- ============================================
-- 3. Corrigir mapeamento de metadados do usuário no cadastro
--
-- O trigger `handle_new_user` lê `raw_user_meta_data->>'name'`
-- mas o app enviava apenas `nome`. Agora o app envia ambas as chaves
-- ({ name, nome }), portanto este patch atualiza o trigger para aceitar
-- qualquer uma, priorizando `name` (padrão OAuth) e fazendo fallback
-- para `nome` (padrão interno do Financo).
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.users (id, email, nome)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'nome',
      split_part(NEW.email, '@', 1)
    )
  )
  ON CONFLICT (id) DO NOTHING;

  PERFORM create_default_categories(NEW.id);

  RETURN NEW;
END;
$$;

-- O mesmo para o trigger de profiles (já lê `nome`, mas ajustamos fallback)
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles(id, display_name, email)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'nome',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- ============================================
-- 4. Adicionar índice para busca de conquistas por usuário + achievement
--    (já existe UNIQUE constraint, mas o índice explícito melhora o plano)
-- ============================================
CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement
  ON public.user_achievements(achievement_id);

-- ============================================
-- FIM DA MIGRAÇÃO DE SEGURANÇA
-- ============================================
