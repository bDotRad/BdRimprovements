-- Add P15 (Confirm Problem - test/trial) which was missing
INSERT INTO lu11_problem_phase (code, name, sort_order)
VALUES ('P15', 'Confirm Problem', 15)
ON CONFLICT (code) DO UPDATE SET name = 'Confirm Problem', sort_order = 15;

-- P20 is now "Problem Assessed" (not Confirm Problem)
UPDATE lu11_problem_phase SET name = 'Problem Assessed', sort_order = 20 WHERE code = 'P20';
