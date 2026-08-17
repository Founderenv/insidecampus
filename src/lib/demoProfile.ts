import type { Profile } from '@/types'

export const DEMO_PROFILE: Profile = {
  id: 'demo-preview-000',
  full_name: 'Demo Student',
  username: 'insidezeal_demo',
  avatar_url: null,
  bio: 'Exploring InsideZeal 🚀',
  college_id: null,
  branch_id: 'demo-branch-comp',
  year: 2,
  gender: 'other',
  show_gender: false,
  show_year: true,
  is_private: false,
  instagram: null,
  phone: null,
  email_visible: false,
  show_rankings: true,
  aura_badges: ['Tech Builder', 'Problem Solver', 'Campus Creator'],
  zeal_score: 420,
  smart_score: 85,
  game_xp: 1200,
  game_level: 7,
  follower_count: 128,
  following_count: 94,
  post_count: 12,
  onboarding_completed: true,
  is_admin: false,
  is_banned: false,
  created_at: '2025-01-15T00:00:00Z',
}

export const DEMO_RANKS = {
  popular: 8,
  smart: 4,
  gamer: 15,
  creator: 10,
}

export const DEMO_BRANCH = {
  id: 'demo-branch-comp',
  name: 'Computer Engineering',
  short_name: 'Computer',
  college_id: null,
  program_group_id: null,
  display_order: 1,
  is_active: true,
}
