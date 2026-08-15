/*
# Competition schema: smart scores, daily challenges, game scores, leaderboard

1. New Tables
- smart_score_breakdown — per-category smart score (coding, problem_solving, knowledge, contribution, academic)
- smart_challenges — daily challenges (logic, coding MCQ, quiz, etc.)
- smart_attempts — user attempts on challenges
- game_scores — per-game high scores and sessions
- game_sessions — individual game play sessions with XP awarded
- daily_streaks — daily challenge streak tracking
2. Security
- All tables: owner can read/insert/update own; public read for leaderboard queries.
- smart_challenges: authenticated read; admin insert.
3. Notes
- Scores are never manually user-set; they come from challenge attempts and game sessions.
*/

-- Smart score breakdown
CREATE TABLE IF NOT EXISTS smart_score_breakdown (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  category text NOT NULL, -- coding | problem_solving | knowledge | contribution | academic
  score int DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, category)
);
CREATE INDEX IF NOT EXISTS idx_smart_breakdown_user ON smart_score_breakdown (user_id);

-- Smart challenges
CREATE TABLE IF NOT EXISTS smart_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  challenge_type text NOT NULL, -- logic | coding | mcq | quiz
  category text NOT NULL, -- coding | problem_solving | knowledge | contribution
  questions jsonb NOT NULL DEFAULT '[]',
  xp_reward int DEFAULT 10,
  is_daily boolean DEFAULT false,
  scheduled_date date,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Smart attempts
CREATE TABLE IF NOT EXISTS smart_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  challenge_id uuid NOT NULL REFERENCES smart_challenges(id) ON DELETE CASCADE,
  answers jsonb DEFAULT '{}',
  score int DEFAULT 0,
  xp_earned int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_smart_attempts_user ON smart_attempts (user_id);

-- Game scores (per game type best score)
CREATE TABLE IF NOT EXISTS game_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  game_type text NOT NULL, -- reaction | memory | quiz | typing | 2048 | college_quiz | tech_quiz
  best_score int DEFAULT 0,
  total_xp int DEFAULT 0,
  plays int DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, game_type)
);
CREATE INDEX IF NOT EXISTS idx_game_scores_type ON game_scores (game_type, best_score DESC);

-- Game sessions
CREATE TABLE IF NOT EXISTS game_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  game_type text NOT NULL,
  score int DEFAULT 0,
  xp_earned int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_game_sessions_user ON game_sessions (user_id, created_at DESC);

-- Daily streaks
CREATE TABLE IF NOT EXISTS daily_streaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  streak_type text NOT NULL DEFAULT 'smart', -- smart | game
  current_streak int DEFAULT 0,
  longest_streak int DEFAULT 0,
  last_active_date date,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, streak_type)
);

-- ===== RLS =====
ALTER TABLE smart_score_breakdown ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_smart_breakdown" ON smart_score_breakdown;
CREATE POLICY "read_smart_breakdown" ON smart_score_breakdown FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_own_smart_breakdown" ON smart_score_breakdown;
CREATE POLICY "insert_own_smart_breakdown" ON smart_score_breakdown FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_smart_breakdown" ON smart_score_breakdown;
CREATE POLICY "update_own_smart_breakdown" ON smart_score_breakdown FOR UPDATE TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE smart_challenges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_smart_challenges" ON smart_challenges;
CREATE POLICY "read_smart_challenges" ON smart_challenges FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_smart_challenges" ON smart_challenges;
CREATE POLICY "insert_smart_challenges" ON smart_challenges FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

ALTER TABLE smart_attempts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_own_smart_attempts" ON smart_attempts;
CREATE POLICY "read_own_smart_attempts" ON smart_attempts FOR SELECT TO authenticated
USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_smart_attempt" ON smart_attempts;
CREATE POLICY "insert_own_smart_attempt" ON smart_attempts FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

ALTER TABLE game_scores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_game_scores" ON game_scores;
CREATE POLICY "read_game_scores" ON game_scores FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_own_game_score" ON game_scores;
CREATE POLICY "insert_own_game_score" ON game_scores FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_game_score" ON game_scores;
CREATE POLICY "update_own_game_score" ON game_scores FOR UPDATE TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_own_game_sessions" ON game_sessions;
CREATE POLICY "read_own_game_sessions" ON game_sessions FOR SELECT TO authenticated
USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_game_session" ON game_sessions;
CREATE POLICY "insert_own_game_session" ON game_sessions FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

ALTER TABLE daily_streaks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_own_streaks" ON daily_streaks;
CREATE POLICY "read_own_streaks" ON daily_streaks FOR SELECT TO authenticated
USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_streak" ON daily_streaks;
CREATE POLICY "insert_own_streak" ON daily_streaks FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_streak" ON daily_streaks;
CREATE POLICY "update_own_streak" ON daily_streaks FOR UPDATE TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
