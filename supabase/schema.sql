-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE game_mode AS ENUM ('bullet', 'blitz', 'rapid');
CREATE TYPE game_result AS ENUM ('white_wins', 'black_wins', 'draw', 'abandoned');
CREATE TYPE transaction_type AS ENUM (
  'stake_reserve', 'stake_win', 'stake_loss',
  'purchase', 'coach_purchase', 'cosmetic_purchase',
  'streak_save', 'platform_fee', 'signup_bonus'
);
CREATE TYPE purchase_item AS ENUM (
  'ai_coach', 'board_classic', 'board_wood', 'board_neon', 'board_marble'
);

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE public.profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username     TEXT UNIQUE NOT NULL,
  email        TEXT UNIQUE NOT NULL,
  rating       INTEGER NOT NULL DEFAULT 1400,
  city         TEXT,
  country      TEXT,
  coins        INTEGER NOT NULL DEFAULT 50,
  avatar_url   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_profiles_rating  ON public.profiles(rating DESC);
CREATE INDEX idx_profiles_city    ON public.profiles(city);
CREATE INDEX idx_profiles_country ON public.profiles(country);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_all" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- ============================================================
-- GAMES
-- ============================================================
CREATE TABLE public.games (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  white_player_id       UUID REFERENCES public.profiles(id),
  black_player_id       UUID REFERENCES public.profiles(id),
  ai_level              INTEGER,
  mode                  game_mode NOT NULL,
  pgn                   TEXT,
  result                game_result,
  stake_amount          INTEGER NOT NULL DEFAULT 0,
  white_rating_before   INTEGER,
  black_rating_before   INTEGER,
  white_rating_after    INTEGER,
  black_rating_after    INTEGER,
  started_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at              TIMESTAMPTZ,
  realtime_channel      TEXT
);

CREATE INDEX idx_games_white   ON public.games(white_player_id, started_at DESC);
CREATE INDEX idx_games_black   ON public.games(black_player_id, started_at DESC);
CREATE INDEX idx_games_started ON public.games(started_at DESC);

ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "games_select_participants" ON public.games
  FOR SELECT USING (
    auth.uid() = white_player_id OR
    auth.uid() = black_player_id OR
    black_player_id IS NULL -- AI games are public for the white player
  );

CREATE POLICY "games_insert_auth" ON public.games
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "games_update_participants" ON public.games
  FOR UPDATE USING (
    auth.uid() = white_player_id OR auth.uid() = black_player_id
  );

-- ============================================================
-- RATING HISTORY
-- ============================================================
CREATE TABLE public.rating_history (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  game_id        UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  rating_before  INTEGER NOT NULL,
  rating_after   INTEGER NOT NULL,
  delta          INTEGER NOT NULL,
  recorded_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rating_history_user ON public.rating_history(user_id, recorded_at DESC);

ALTER TABLE public.rating_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rating_history_select_own" ON public.rating_history
  FOR SELECT USING (auth.uid() = user_id);

-- ============================================================
-- STREAKS
-- ============================================================
CREATE TABLE public.streaks (
  user_id         UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  current_streak  INTEGER NOT NULL DEFAULT 0,
  best_streak     INTEGER NOT NULL DEFAULT 0,
  last_game_date  DATE,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "streaks_select_all" ON public.streaks
  FOR SELECT USING (true);

-- ============================================================
-- BADGES
-- ============================================================
CREATE TABLE public.badges (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_key   TEXT NOT NULL,
  badge_label TEXT NOT NULL,
  earned_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_key)
);

CREATE INDEX idx_badges_user ON public.badges(user_id);

ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "badges_select_all" ON public.badges
  FOR SELECT USING (true);

-- ============================================================
-- COIN TRANSACTIONS
-- ============================================================
CREATE TABLE public.coin_transactions (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  game_id                  UUID REFERENCES public.games(id),
  type                     transaction_type NOT NULL,
  amount                   INTEGER NOT NULL,
  balance_after            INTEGER NOT NULL,
  stripe_payment_intent_id TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_coin_tx_user ON public.coin_transactions(user_id, created_at DESC);

ALTER TABLE public.coin_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coin_tx_select_own" ON public.coin_transactions
  FOR SELECT USING (auth.uid() = user_id);

-- ============================================================
-- PURCHASES
-- ============================================================
CREATE TABLE public.purchases (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  item         purchase_item NOT NULL,
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, item)
);

CREATE INDEX idx_purchases_user ON public.purchases(user_id);

ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "purchases_select_own" ON public.purchases
  FOR SELECT USING (auth.uid() = user_id);

-- ============================================================
-- AI COACH ANALYSES
-- ============================================================
CREATE TABLE public.ai_coach_analyses (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  game_id      UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  pgn          TEXT NOT NULL,
  blunders     JSONB,
  mistakes     JSONB,
  key_moments  JSONB,
  accuracy_white NUMERIC(5,2),
  accuracy_black NUMERIC(5,2),
  level        TEXT NOT NULL DEFAULT 'beginner',
  was_free     BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, game_id)
);

CREATE INDEX idx_coach_user ON public.ai_coach_analyses(user_id, created_at DESC);

ALTER TABLE public.ai_coach_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coach_select_own" ON public.ai_coach_analyses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "coach_insert_own" ON public.ai_coach_analyses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- ANALYTICS EVENTS
-- ============================================================
CREATE TABLE public.analytics_events (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES public.profiles(id),
  event_name TEXT NOT NULL,
  properties JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_analytics_event ON public.analytics_events(event_name, created_at DESC);
CREATE INDEX idx_analytics_user  ON public.analytics_events(user_id, created_at DESC);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "analytics_insert_all" ON public.analytics_events
  FOR INSERT WITH CHECK (true);

-- ============================================================
-- ATOMIC COIN DEDUCTION RPC
-- ============================================================
CREATE OR REPLACE FUNCTION public.deduct_coins(p_user_id UUID, p_amount INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_balance INTEGER;
BEGIN
  SELECT coins INTO v_balance
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF v_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient coins: have %, need %', v_balance, p_amount;
  END IF;

  UPDATE public.profiles
  SET coins = coins - p_amount, updated_at = now()
  WHERE id = p_user_id;

  RETURN v_balance - p_amount;
END;
$$;

CREATE OR REPLACE FUNCTION public.add_coins(p_user_id UUID, p_amount INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_balance INTEGER;
BEGIN
  UPDATE public.profiles
  SET coins = coins + p_amount, updated_at = now()
  WHERE id = p_user_id
  RETURNING coins INTO v_balance;

  RETURN v_balance;
END;
$$;

-- ============================================================
-- TRIGGER: Auto-create profile, streak, and bonus on signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username, rating, coins)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    1400,
    50
  );

  INSERT INTO public.streaks (user_id)
  VALUES (NEW.id);

  INSERT INTO public.coin_transactions (user_id, type, amount, balance_after)
  VALUES (NEW.id, 'signup_bonus', 50, 50);

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER streaks_updated_at
  BEFORE UPDATE ON public.streaks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- ANALYTICS VIEWS
-- ============================================================
CREATE OR REPLACE VIEW public.dau_stats AS
SELECT
  DATE(created_at) AS date,
  COUNT(DISTINCT user_id) AS daily_active_users
FROM public.analytics_events
WHERE event_name = 'session_start'
GROUP BY DATE(created_at)
ORDER BY date DESC;

CREATE OR REPLACE VIEW public.games_per_user AS
SELECT
  user_id,
  COUNT(*) AS total_games,
  COUNT(*) FILTER (WHERE result IS NOT NULL) AS completed_games
FROM (
  SELECT white_player_id AS user_id, result FROM public.games
  UNION ALL
  SELECT black_player_id AS user_id, result FROM public.games WHERE black_player_id IS NOT NULL
) g
GROUP BY user_id;
