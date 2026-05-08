-- Add Problem Source and Raised By Name fields
ALTER TABLE t00_problems ADD COLUMN IF NOT EXISTS prob_source TEXT;
ALTER TABLE t00_problems ADD COLUMN IF NOT EXISTS raised_by_name TEXT;
