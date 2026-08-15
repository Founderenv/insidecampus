/*
# Migration 009: RPC functions for gossip/confession likes and additional features
*/

-- Increment/decrement gossip like count
CREATE OR REPLACE FUNCTION increment_gossip_likes(gossip_id_input uuid, delta int)
RETURNS void AS $$
BEGIN
  UPDATE gossip_posts SET like_count = GREATEST(like_count + delta, 0) WHERE id = gossip_id_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Increment/decrement confession like count
CREATE OR REPLACE FUNCTION increment_confession_likes(confession_id_input uuid, delta int)
RETURNS void AS $$
BEGIN
  UPDATE confessions SET like_count = GREATEST(like_count + delta, 0) WHERE id = confession_id_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Increment event interested count
CREATE OR REPLACE FUNCTION increment_event_interested(event_id_input uuid, delta int)
RETURNS void AS $$
BEGIN
  UPDATE events SET interested_count = GREATEST(interested_count + delta, 0) WHERE id = event_id_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Increment club member count
CREATE OR REPLACE FUNCTION increment_club_members(club_id_input uuid, delta int)
RETURNS void AS $$
BEGIN
  UPDATE clubs SET member_count = GREATEST(member_count + delta, 0) WHERE id = club_id_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
