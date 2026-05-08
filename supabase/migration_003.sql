-- Rename P15 → P25 (Solution Development On Hold)
UPDATE lu11_problem_phase SET code = 'P25', name = 'Solution Dev On Hold', sort_order = 25 WHERE code = 'P15';

-- Rename P19 → P29 (Problem Cancelled)
UPDATE lu11_problem_phase SET code = 'P29', name = 'Problem Cancelled', sort_order = 29 WHERE code = 'P19';

-- Update phase names to match new diagram
UPDATE lu11_problem_phase SET name = 'Assess Problem'                WHERE code = 'P10';
UPDATE lu11_problem_phase SET name = 'Confirm Problem'               WHERE code = 'P20';
UPDATE lu11_problem_phase SET name = 'Develop & Execute Solutions'   WHERE code = 'P30';
UPDATE lu11_problem_phase SET name = 'Review Problem & Solutions'    WHERE code = 'P40';
