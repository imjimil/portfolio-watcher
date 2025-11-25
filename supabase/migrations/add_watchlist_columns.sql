-- Add price_when_added and category columns to watchlist table
ALTER TABLE watchlist 
ADD COLUMN IF NOT EXISTS price_when_added DECIMAL(15, 4),
ADD COLUMN IF NOT EXISTS category TEXT;

