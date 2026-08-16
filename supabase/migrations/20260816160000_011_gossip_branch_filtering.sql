/*
# Migration 011: Add branch_id to gossip_posts for department filtering
*/

-- Add nullable branch_id to gossip_posts
ALTER TABLE gossip_posts
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES branches(id) ON DELETE SET NULL;

-- Index for filtering by branch
CREATE INDEX IF NOT EXISTS idx_gossip_branch ON gossip_posts (branch_id) WHERE branch_id IS NOT NULL;

-- Composite index for common query pattern (branch + recent)
CREATE INDEX IF NOT EXISTS idx_gossip_branch_created ON gossip_posts (branch_id, created_at DESC) WHERE branch_id IS NOT NULL;
