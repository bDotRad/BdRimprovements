CREATE TABLE IF NOT EXISTS t_problem_sources (
  id BIGSERIAL PRIMARY KEY,
  t00_problems_id BIGINT NOT NULL REFERENCES t00_problems(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,
  source_ref  TEXT,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE t_problem_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for anon" ON t_problem_sources FOR ALL TO anon USING (true) WITH CHECK (true);
