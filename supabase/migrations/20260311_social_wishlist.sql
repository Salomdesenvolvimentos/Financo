-- ============================================
-- FINACO - Migração: Sistema Social + Lista de Desejos
-- Amigos, Conquistas, Desafios em Dupla, Metas
-- ============================================

-- ============================================
-- TABELA: profiles (perfil público dos usuários)
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name  TEXT NOT NULL,
  avatar_emoji  TEXT NOT NULL DEFAULT '😊',
  bio           TEXT,
  total_points  INTEGER NOT NULL DEFAULT 0,
  email         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Qualquer autenticado pode ler (necessário para busca de amigos)
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "profiles_insert" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Função: criar perfil automaticamente ao registrar um usuário
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles(id, display_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();

-- Trigger updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TABELA: friendships (solicitações de amizade)
-- ============================================
CREATE TABLE IF NOT EXISTS public.friendships (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addressee_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(requester_id, addressee_id),
  CHECK(requester_id <> addressee_id)
);

CREATE INDEX IF NOT EXISTS idx_friendships_requester ON public.friendships(requester_id);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON public.friendships(addressee_id);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "friendships_select" ON public.friendships
  FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE POLICY "friendships_insert" ON public.friendships
  FOR INSERT WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "friendships_update" ON public.friendships
  FOR UPDATE USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE POLICY "friendships_delete" ON public.friendships
  FOR DELETE USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE TRIGGER update_friendships_updated_at
  BEFORE UPDATE ON public.friendships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TABELA: achievement_definitions (conquistas disponíveis – global)
-- ============================================
CREATE TABLE IF NOT EXISTS public.achievement_definitions (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT NOT NULL,
  emoji       TEXT NOT NULL,
  category    TEXT NOT NULL,
  points      INTEGER NOT NULL DEFAULT 10
);

-- Seed das conquistas
INSERT INTO public.achievement_definitions (id, title, description, emoji, category, points) VALUES
  ('no-delivery-30',   'Chef em Casa',             'Mês completo sem pedir delivery!',               '🍳', 'Alimentação',    50),
  ('weeks-52',         'Poupador das 52 Semanas',  'Completou o lendário desafio das 52 semanas.',   '💰', 'Poupança',      200),
  ('no-impulse-30',    'Guardião',                 '30 dias resistindo às compras por impulso.',     '🛑', 'Consumo',        50),
  ('coffee-30',        'Barista em Casa',          '30 dias preparando café em casa.',               '☕', 'Alimentação',    30),
  ('transport-30',     'Mobilidade Urbana',        'Um mês usando transporte público.',              '🚌', 'Transporte',     30),
  ('streaming-cut',    'Digital Detox',            'Cancelou pelo menos um serviço de streaming.',   '📺', 'Lazer',          20),
  ('wishlist-first',   'Primeiro Objetivo',        'Criou sua primeira meta na lista de desejos.',   '🎯', 'Metas',          20),
  ('wishlist-done',    'Meta Atingida!',            'Concluiu um objetivo da lista de desejos.',      '🏆', 'Metas',         100),
  ('duo-win',          'Parceiro Financeiro',       'Completou um desafio em dupla com um amigo.',    '🤝', 'Social',         80),
  ('first-challenge',  'Primeiro Passo',           'Aceitou seu primeiro desafio de poupança.',      '🚀', 'Desafios',       10),
  ('five-challenges',  'Campeão de Desafios',      'Concluiu 5 desafios.',                           '🌟', 'Desafios',      100),
  ('first-friend',     'Networker',                'Adicionou seu primeiro amigo no Financo.',       '👥', 'Social',         15),
  ('first-investment', 'Investidor Estreante',     'Registrou seu primeiro investimento.',           '📈', 'Investimentos',  50),
  ('savings-1000',     'R$1000 Economizados',      'Atingiu R$1.000 em metas concluídas.',           '💵', 'Poupança',       75),
  ('streak-7',         'Sequência de 7 Dias',      'Usou o Financo por 7 dias seguidos.',            '🔥', 'Engajamento',    25),
  ('zero-debt',        'Sem Dívidas',              'Ficou um mês inteiro sem transações vencidas.',  '✨', 'Finanças',       60)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- TABELA: user_achievements (conquistas ganhas)
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL REFERENCES public.achievement_definitions(id),
  earned_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON public.user_achievements(user_id);

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- Qualquer autenticado pode visualizar conquistas (feed social)
CREATE POLICY "user_achievements_select" ON public.user_achievements
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "user_achievements_insert" ON public.user_achievements
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_achievements_delete" ON public.user_achievements
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- TABELA: wishlist_goals (lista de desejos / metas financeiras)
-- ============================================
CREATE TABLE IF NOT EXISTS public.wishlist_goals (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  description    TEXT,
  emoji          TEXT NOT NULL DEFAULT '🎯',
  target_amount  DECIMAL(15, 2) NOT NULL,
  current_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  deadline       DATE,
  category       TEXT NOT NULL DEFAULT 'Geral',
  completed      BOOLEAN NOT NULL DEFAULT FALSE,
  priority       INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wishlist_goals_user ON public.wishlist_goals(user_id);

ALTER TABLE public.wishlist_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wishlist_goals_select" ON public.wishlist_goals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "wishlist_goals_insert" ON public.wishlist_goals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "wishlist_goals_update" ON public.wishlist_goals
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "wishlist_goals_delete" ON public.wishlist_goals
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_wishlist_goals_updated_at
  BEFORE UPDATE ON public.wishlist_goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TABELA: duo_challenges (desafios entre dois usuários)
-- ============================================
CREATE TABLE IF NOT EXISTS public.duo_challenges (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id         TEXT NOT NULL,
  title                TEXT NOT NULL,
  description          TEXT,
  emoji                TEXT NOT NULL DEFAULT '🤝',
  target               DECIMAL(12, 2) NOT NULL DEFAULT 30,
  category             TEXT NOT NULL DEFAULT 'Geral',
  requester_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addressee_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requester_progress   DECIMAL(12, 2) NOT NULL DEFAULT 0,
  addressee_progress   DECIMAL(12, 2) NOT NULL DEFAULT 0,
  requester_completed  BOOLEAN NOT NULL DEFAULT FALSE,
  addressee_completed  BOOLEAN NOT NULL DEFAULT FALSE,
  status               TEXT NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending', 'accepted', 'declined', 'active', 'completed')),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK(requester_id <> addressee_id)
);

CREATE INDEX IF NOT EXISTS idx_duo_challenges_requester ON public.duo_challenges(requester_id);
CREATE INDEX IF NOT EXISTS idx_duo_challenges_addressee ON public.duo_challenges(addressee_id);

ALTER TABLE public.duo_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "duo_challenges_select" ON public.duo_challenges
  FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE POLICY "duo_challenges_insert" ON public.duo_challenges
  FOR INSERT WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "duo_challenges_update" ON public.duo_challenges
  FOR UPDATE USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE TRIGGER update_duo_challenges_updated_at
  BEFORE UPDATE ON public.duo_challenges
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
