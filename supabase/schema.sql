-- Enable UUID extension (not needed but good practice)
-- Drop existing tables if re-running (comment out in prod)

-- Lookup: Problem phases
CREATE TABLE IF NOT EXISTS lu11_problem_phase (
  id BIGSERIAL PRIMARY KEY,
  code VARCHAR(10) NOT NULL UNIQUE,
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
);

-- Lookup: Solution phases
CREATE TABLE IF NOT EXISTS lu11_solution_phase (
  id BIGSERIAL PRIMARY KEY,
  code VARCHAR(10) NOT NULL UNIQUE,
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
);

-- Lookup: Departments
CREATE TABLE IF NOT EXISTS lu22_department (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL
);

-- Lookup: People / Users
CREATE TABLE IF NOT EXISTS lu21_people (
  id BIGSERIAL PRIMARY KEY,
  lu22_department_id BIGINT REFERENCES lu22_department(id),
  first TEXT NOT NULL,
  last TEXT NOT NULL,
  email TEXT NOT NULL,
  is_approver BOOLEAN NOT NULL DEFAULT FALSE
);

-- Lookup: Roles
CREATE TABLE IF NOT EXISTS lu21_roles (
  id BIGSERIAL PRIMARY KEY,
  role TEXT NOT NULL,
  role_desc TEXT NOT NULL
);

-- Lookup: Locations
CREATE TABLE IF NOT EXISTS lu30_location (
  id BIGSERIAL PRIMARY KEY,
  loc_name TEXT NOT NULL UNIQUE
);

-- Lookup: Sub-locations
CREATE TABLE IF NOT EXISTS lu31_sub_location (
  id BIGSERIAL PRIMARY KEY,
  lu30_location_id BIGINT NOT NULL REFERENCES lu30_location(id),
  subloc_name TEXT NOT NULL
);

-- Lookup: Equipment
CREATE TABLE IF NOT EXISTS lu40_equipment (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL
);

-- Lookup: Cost scale
CREATE TABLE IF NOT EXISTS lu40_cost (
  id BIGSERIAL PRIMARY KEY,
  cost_val SMALLINT NOT NULL,
  cost_name TEXT NOT NULL
);

-- Lookup: Effort scale
CREATE TABLE IF NOT EXISTS lu40_effort (
  id BIGSERIAL PRIMARY KEY,
  effort_val SMALLINT NOT NULL,
  effort_name TEXT NOT NULL
);

-- Lookup: Reward/Benefit scale
CREATE TABLE IF NOT EXISTS lu40_reward (
  id BIGSERIAL PRIMARY KEY,
  reward_val SMALLINT NOT NULL,
  reward_name TEXT NOT NULL
);

-- Lookup: Consequence levels (for risk/compliance)
CREATE TABLE IF NOT EXISTS lu61_consequence_lvl (
  id BIGSERIAL PRIMARY KEY,
  cons_code TEXT NOT NULL,
  cons_name TEXT NOT NULL,
  cons_cat TEXT NOT NULL,
  cons_desc TEXT NOT NULL,
  cons_fact BIGINT
);

-- Lookup: Likelihood (for risk/compliance)
CREATE TABLE IF NOT EXISTS lu61_likelihood (
  id BIGSERIAL PRIMARY KEY,
  llh_code TEXT NOT NULL,
  llh_name TEXT NOT NULL,
  llh_desc TEXT NOT NULL,
  llh_freq TEXT NOT NULL,
  llh_prob TEXT NOT NULL,
  llh_fact BIGINT NOT NULL
);

-- Main: Problems
CREATE TABLE IF NOT EXISTS t00_problems (
  id BIGSERIAL PRIMARY KEY,
  prob_code TEXT NOT NULL UNIQUE,
  title TEXT,
  prob_statement TEXT,
  prob_type TEXT CHECK (prob_type IN ('Incident', 'Hazard', 'Risk', 'Delay', 'EWR', 'Idea')),
  lu30_location_id BIGINT REFERENCES lu30_location(id),
  lu31_sub_location_id BIGINT REFERENCES lu31_sub_location(id),
  lu40_equipment_id BIGINT REFERENCES lu40_equipment(id),
  one_drive_link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Problem status history (current = latest row)
CREATE TABLE IF NOT EXISTS lu10_problem_status (
  id BIGSERIAL PRIMARY KEY,
  t00_problems_id BIGINT NOT NULL REFERENCES t00_problems(id) ON DELETE CASCADE,
  lu11_problem_phase_id BIGINT NOT NULL REFERENCES lu11_problem_phase(id),
  comm TEXT,
  changed_by BIGINT REFERENCES lu21_people(id),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Main: Solutions (linked to a problem)
CREATE TABLE IF NOT EXISTS t02_solutions (
  id BIGSERIAL PRIMARY KEY,
  t00_problems_id BIGINT NOT NULL REFERENCES t00_problems(id) ON DELETE CASCADE,
  sol_num BIGINT NOT NULL,
  title TEXT,
  descr TEXT,
  lu40_cost_id BIGINT REFERENCES lu40_cost(id),
  lu40_effort_id BIGINT REFERENCES lu40_effort(id),
  lu40_reward_id BIGINT REFERENCES lu40_reward(id),
  design_bud_k BIGINT,
  exec_bud_k BIGINT,
  moc INT,
  one_drive_link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Solution status history (current = latest row)
CREATE TABLE IF NOT EXISTS lu10_solution_status (
  id BIGSERIAL PRIMARY KEY,
  t02_solutions_id BIGINT NOT NULL REFERENCES t02_solutions(id) ON DELETE CASCADE,
  lu11_solution_phase_id BIGINT NOT NULL REFERENCES lu11_solution_phase(id),
  comm TEXT,
  changed_by BIGINT REFERENCES lu21_people(id),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Problem role assignments
CREATE TABLE IF NOT EXISTS lu20_prob_roles (
  id BIGSERIAL PRIMARY KEY,
  t00_problems_id BIGINT NOT NULL REFERENCES t00_problems(id) ON DELETE CASCADE,
  lu21_people_id BIGINT NOT NULL REFERENCES lu21_people(id),
  lu21_roles_id BIGINT NOT NULL REFERENCES lu21_roles(id)
);

-- Solution role assignments
CREATE TABLE IF NOT EXISTS lu20_sol_roles (
  id BIGSERIAL PRIMARY KEY,
  t02_solutions_id BIGINT NOT NULL REFERENCES t02_solutions(id) ON DELETE CASCADE,
  lu21_people_id BIGINT NOT NULL REFERENCES lu21_people(id),
  lu21_roles_id BIGINT NOT NULL REFERENCES lu21_roles(id)
);

-- Options (alternative solutions at concept stage)
CREATE TABLE IF NOT EXISTS t01_options (
  id BIGSERIAL PRIMARY KEY,
  t00_problems_id BIGINT NOT NULL REFERENCES t00_problems(id) ON DELETE CASCADE,
  opt_num INT NOT NULL,
  title TEXT,
  descr TEXT,
  lu40_cost_id BIGINT REFERENCES lu40_cost(id),
  lu40_effort_id BIGINT REFERENCES lu40_effort(id),
  lu40_reward_id BIGINT REFERENCES lu40_reward(id),
  one_drive_link TEXT
);

-- Images (linked to problem or solution)
CREATE TABLE IF NOT EXISTS t_images (
  id BIGSERIAL PRIMARY KEY,
  image_number INT NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  description TEXT,
  storage_path TEXT NOT NULL,
  t00_problems_id BIGINT REFERENCES t00_problems(id) ON DELETE CASCADE,
  t02_solutions_id BIGINT REFERENCES t02_solutions(id) ON DELETE CASCADE,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Risk details
CREATE TABLE IF NOT EXISTS lu60_risk (
  id BIGSERIAL PRIMARY KEY,
  t00_problems_id BIGINT NOT NULL REFERENCES t00_problems(id) ON DELETE CASCADE,
  lu61_consequence_lvl_id BIGINT REFERENCES lu61_consequence_lvl(id),
  lu61_likelihood_id BIGINT REFERENCES lu61_likelihood(id),
  description TEXT,
  attachments TEXT
);

-- Legal compliance details
CREATE TABLE IF NOT EXISTS lu60_legal_compliance (
  id BIGSERIAL PRIMARY KEY,
  t00_problems_id BIGINT NOT NULL REFERENCES t00_problems(id) ON DELETE CASCADE,
  lu61_consequence_lvl_id BIGINT REFERENCES lu61_consequence_lvl(id),
  lu61_likelihood_id BIGINT REFERENCES lu61_likelihood(id),
  description TEXT,
  attachments TEXT
);

-- Sustainability details
CREATE TABLE IF NOT EXISTS lu60_sustainability (
  id BIGSERIAL PRIMARY KEY,
  t00_problems_id BIGINT NOT NULL REFERENCES t00_problems(id) ON DELETE CASCADE,
  description TEXT,
  costk_curr BIGINT,
  costk_est BIGINT,
  timeh_curr BIGINT,
  timeh_est BIGINT,
  attachments TEXT
);

-- Improvement details
CREATE TABLE IF NOT EXISTS lu60_improvement (
  id BIGSERIAL PRIMARY KEY,
  t00_problems_id BIGINT NOT NULL REFERENCES t00_problems(id) ON DELETE CASCADE,
  imp_det TEXT,
  attachments TEXT
);

-- Audit log
CREATE TABLE IF NOT EXISTS audit_log (
  id BIGSERIAL PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id BIGINT NOT NULL,
  field_changed TEXT,
  value_before TEXT,
  value_after TEXT,
  action_desc TEXT,
  changed_by BIGINT REFERENCES lu21_people(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- View: current problem status (latest status per problem)
CREATE OR REPLACE VIEW v_problem_current_status AS
SELECT DISTINCT ON (ps.t00_problems_id)
  ps.t00_problems_id,
  ps.id AS status_id,
  ps.lu11_problem_phase_id,
  pp.code AS phase_code,
  pp.name AS phase_name,
  pp.sort_order,
  ps.timestamp,
  ps.comm,
  ps.changed_by
FROM lu10_problem_status ps
JOIN lu11_problem_phase pp ON pp.id = ps.lu11_problem_phase_id
ORDER BY ps.t00_problems_id, ps.timestamp DESC;

-- View: current solution status (latest status per solution)
CREATE OR REPLACE VIEW v_solution_current_status AS
SELECT DISTINCT ON (ss.t02_solutions_id)
  ss.t02_solutions_id,
  ss.id AS status_id,
  ss.lu11_solution_phase_id,
  sp.code AS phase_code,
  sp.name AS phase_name,
  sp.sort_order,
  ss.timestamp,
  ss.comm,
  ss.changed_by
FROM lu10_solution_status ss
JOIN lu11_solution_phase sp ON sp.id = ss.lu11_solution_phase_id
ORDER BY ss.t02_solutions_id, ss.timestamp DESC;

-- Enable RLS on all tables
ALTER TABLE lu11_problem_phase ENABLE ROW LEVEL SECURITY;
ALTER TABLE lu11_solution_phase ENABLE ROW LEVEL SECURITY;
ALTER TABLE lu22_department ENABLE ROW LEVEL SECURITY;
ALTER TABLE lu21_people ENABLE ROW LEVEL SECURITY;
ALTER TABLE lu21_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE lu30_location ENABLE ROW LEVEL SECURITY;
ALTER TABLE lu31_sub_location ENABLE ROW LEVEL SECURITY;
ALTER TABLE lu40_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE lu40_cost ENABLE ROW LEVEL SECURITY;
ALTER TABLE lu40_effort ENABLE ROW LEVEL SECURITY;
ALTER TABLE lu40_reward ENABLE ROW LEVEL SECURITY;
ALTER TABLE lu61_consequence_lvl ENABLE ROW LEVEL SECURITY;
ALTER TABLE lu61_likelihood ENABLE ROW LEVEL SECURITY;
ALTER TABLE t00_problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE lu10_problem_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE t02_solutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lu10_solution_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE lu20_prob_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE lu20_sol_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE t01_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE t_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE lu60_risk ENABLE ROW LEVEL SECURITY;
ALTER TABLE lu60_legal_compliance ENABLE ROW LEVEL SECURITY;
ALTER TABLE lu60_sustainability ENABLE ROW LEVEL SECURITY;
ALTER TABLE lu60_improvement ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Allow all operations for anon (no auth for now)
CREATE POLICY "Allow all for anon" ON lu11_problem_phase FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON lu11_solution_phase FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON lu22_department FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON lu21_people FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON lu21_roles FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON lu30_location FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON lu31_sub_location FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON lu40_equipment FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON lu40_cost FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON lu40_effort FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON lu40_reward FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON lu61_consequence_lvl FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON lu61_likelihood FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON t00_problems FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON lu10_problem_status FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON t02_solutions FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON lu10_solution_status FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON lu20_prob_roles FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON lu20_sol_roles FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON t01_options FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON t_images FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON lu60_risk FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON lu60_legal_compliance FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON lu60_sustainability FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON lu60_improvement FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON audit_log FOR ALL TO anon USING (true) WITH CHECK (true);
