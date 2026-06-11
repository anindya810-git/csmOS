-- Add go-live date field to accounts
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS golive_date DATE;
