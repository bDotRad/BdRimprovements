-- Problem phases
INSERT INTO lu11_problem_phase (code, name, sort_order) VALUES
  ('P00', 'Data Entry', 0),
  ('P10', 'Problem Assessed', 10),
  ('P15', 'Problem on Hold', 15),
  ('P19', 'Cancelled', 19),
  ('P20', 'Confirm Problem', 20),
  ('P30', 'Develop Solutions', 30),
  ('P40', 'Review Problem', 40),
  ('P50', 'Closed', 50)
ON CONFLICT (code) DO NOTHING;

-- Solution phases
INSERT INTO lu11_solution_phase (code, name, sort_order) VALUES
  ('S10', 'Concept', 10),
  ('S20', 'Solution Review', 20),
  ('S25', 'Solution on Hold', 25),
  ('S30', 'Complete Design', 30),
  ('S40', 'Execution Scope', 40),
  ('S50', 'Approve Execution', 50),
  ('S59', 'Cancelled', 59),
  ('S60', 'Execute Works', 60),
  ('S70', 'Solution Complete', 70)
ON CONFLICT (code) DO NOTHING;

-- Cost scale
INSERT INTO lu40_cost (cost_val, cost_name) VALUES
  (1, 'Very Low (<$1K)'),
  (2, 'Low ($1K-$10K)'),
  (3, 'Medium ($10K-$50K)'),
  (4, 'High ($50K-$200K)'),
  (5, 'Very High ($200K-$500K)'),
  (6, 'Major ($500K-$1M)'),
  (7, 'Extreme (>$1M)');

-- Effort scale
INSERT INTO lu40_effort (effort_val, effort_name) VALUES
  (1, 'Minimal (<1 week)'),
  (2, 'Low (1-4 weeks)'),
  (3, 'Medium (1-3 months)'),
  (4, 'High (3-6 months)'),
  (5, 'Very High (>6 months)');

-- Reward scale
INSERT INTO lu40_reward (reward_val, reward_name) VALUES
  (1, 'Minimal'),
  (2, 'Low'),
  (3, 'Medium'),
  (4, 'High'),
  (5, 'Very High');

-- Default roles
INSERT INTO lu21_roles (role, role_desc) VALUES
  ('Owner', 'Problem/Solution owner responsible for progress'),
  ('Approver', 'Has authority to approve workflow gates'),
  ('Contributor', 'Contributing to the solution'),
  ('Reviewer', 'Assigned to review at milestones'),
  ('Stakeholder', 'Interested party informed of progress');

-- Default department
INSERT INTO lu22_department (name) VALUES ('Engineering');

-- Consequence levels
INSERT INTO lu61_consequence_lvl (cons_code, cons_name, cons_cat, cons_desc, cons_fact) VALUES
  ('C1', 'Negligible', 'Safety', 'No injury, minor first aid', 1),
  ('C2', 'Minor', 'Safety', 'Minor injury, medical treatment', 2),
  ('C3', 'Moderate', 'Safety', 'Lost time injury, hospitalisation', 4),
  ('C4', 'Major', 'Safety', 'Permanent disability', 8),
  ('C5', 'Catastrophic', 'Safety', 'Fatality or multiple serious injuries', 16);

-- Likelihood
INSERT INTO lu61_likelihood (llh_code, llh_name, llh_desc, llh_freq, llh_prob, llh_fact) VALUES
  ('L1', 'Rare', 'May occur in exceptional circumstances', 'Once in 10+ years', '<1%', 1),
  ('L2', 'Unlikely', 'Could occur at some time', 'Once in 5-10 years', '1-10%', 2),
  ('L3', 'Possible', 'Might occur at some time', 'Once per year', '10-50%', 4),
  ('L4', 'Likely', 'Will probably occur in most circumstances', 'Monthly', '50-90%', 8),
  ('L5', 'Almost Certain', 'Expected to occur in most circumstances', 'Weekly or more', '>90%', 16);
