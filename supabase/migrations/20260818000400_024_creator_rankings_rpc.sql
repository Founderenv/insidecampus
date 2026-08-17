-- =====================================================================
-- 024: REAL CREATOR RANKINGS RPC
-- =====================================================================
-- The client has always called rpc('get_creator_rankings') but the
-- function never existed, so the "Creator" tab silently used a fallback
-- ordered by post_count. This creates the real RPC: ranks students by
-- total likes on their posts (counted from post_likes), then by number
-- of posts. SECURITY DEFINER + pinned search_path; row-level privacy is
-- enforced in SQL (completed, non-banned, non-private profiles only).

CREATE OR REPLACE FUNCTION public.get_creator_rankings(p_branch_id uuid DEFAULT NULL, p_limit integer DEFAULT 20)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(jsonb_agg(x.t ORDER BY x.total_likes DESC, x.post_count DESC, x.created_at ASC), '[]'::jsonb)
  FROM (
    SELECT
      jsonb_build_object(
        'id', p.id,
        'full_name', p.full_name,
        'username', p.username,
        'avatar_url', p.avatar_url,
        'bio', p.bio,
        'college_id', p.college_id,
        'branch_id', p.branch_id,
        'year', p.year,
        'gender', p.gender,
        'show_gender', p.show_gender,
        'show_year', p.show_year,
        'is_private', p.is_private,
        'instagram', p.instagram,
        'email_visible', p.email_visible,
        'aura_badges', p.aura_badges,
        'show_rankings', p.show_rankings,
        'zeal_score', p.zeal_score,
        'smart_score', p.smart_score,
        'game_xp', p.game_xp,
        'game_level', p.game_level,
        'follower_count', p.follower_count,
        'following_count', p.following_count,
        'post_count', p.post_count,
        'onboarding_completed', p.onboarding_completed,
        'is_admin', p.is_admin,
        'is_banned', p.is_banned,
        'created_at', p.created_at,
        'total_likes', COUNT(pl.id)::bigint
      ) AS t,
      COUNT(pl.id) AS total_likes,
      COUNT(DISTINCT po.id) AS post_count,
      p.post_count AS stored_post_count,
      p.created_at
    FROM public.profiles p
    LEFT JOIN public.posts po     ON po.author_id = p.id
    LEFT JOIN public.post_likes pl ON pl.post_id = po.id
    WHERE p.onboarding_completed = true
      AND p.is_banned = false
      AND p.is_private = false
      AND (p_branch_id IS NULL OR p.branch_id = p_branch_id)
    GROUP BY p.id
    ORDER BY total_likes DESC, stored_post_count DESC, p.created_at ASC
    LIMIT p_limit
  ) x;
$$;

REVOKE ALL ON FUNCTION public.get_creator_rankings(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_creator_rankings(uuid, integer) TO authenticated;