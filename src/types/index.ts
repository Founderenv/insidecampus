export interface Profile {
  id: string
  full_name: string
  username: string | null
  avatar_url: string | null
  bio: string
  college_id: string | null
  branch_id: string | null
  year: number
  gender: string
  show_gender: boolean
  show_year: boolean
  is_private: boolean
  instagram: string | null
  phone: string | null
  email_visible: boolean
  aura_badges: string[]
  zeal_score: number
  smart_score: number
  game_xp: number
  game_level: number
  follower_count: number
  following_count: number
  post_count: number
  onboarding_completed: boolean
  is_admin: boolean
  is_banned: boolean
  created_at: string
}

export interface Branch {
  id: string
  name: string
  short_name: string
  college_id: string | null
  display_order: number
  is_active: boolean
}

export interface College {
  id: string
  name: string
  city: string | null
}

export interface HiddenProfile {
  id: string
  anonymous_code: string
  avatar_seed: string
  avatar_style: string
  nickname: string | null
  gender: string
  show_gender: boolean
  reputation: number
}

export interface Post {
  id: string
  author_id: string
  content: string
  post_type: string
  branch_id: string | null
  club_id: string | null
  like_count: number
  comment_count: number
  share_count: number
  save_count: number
  view_count: number
  created_at: string
  author?: Profile
  media?: PostMedia[]
  is_liked?: boolean
  is_saved?: boolean
  poll_options?: PollOption[]
  my_vote?: string
}

export interface PostMedia {
  id: string
  post_id: string
  media_url: string
  media_type: string
  position: number
}

export interface PollOption {
  id: string
  post_id: string
  label: string
  vote_count: number
  position: number
}

export interface Comment {
  id: string
  post_id: string
  author_id: string
  content: string
  parent_id: string | null
  like_count: number
  created_at: string
  author?: Profile
}

export interface Follow {
  id: string
  follower_id: string
  followee_id: string
  status: string
  created_at: string
}

export interface Skill {
  id: string
  name: string
}

export interface Interest {
  id: string
  name: string
  icon: string | null
}

export interface Club {
  id: string
  name: string
  slug: string
  description: string
  logo_url: string | null
  cover_url: string | null
  category: string | null
  member_count: number
  is_verified: boolean
}

export interface EventItem {
  id: string
  title: string
  description: string
  poster_url: string | null
  banner_url: string | null
  organizer: string | null
  club_id: string | null
  event_date: string
  start_time: string | null
  end_time: string | null
  end_date: string | null
  venue: string | null
  category: string | null
  interested_count: number
  registration_url: string | null
  instagram_url: string | null
  whatsapp_url: string | null
  contact_number: string | null
  created_by: string | null
}

export interface EventCommunityMessage {
  id: string
  event_id: string
  author_id: string
  content: string
  created_at: string
  author?: Profile
}

export interface EventResource {
  id: string
  event_id: string
  uploader_id: string
  title: string
  description: string
  resource_url: string
  resource_type: string
  created_at: string
  uploader?: Profile
}

export interface GossipPost {
  id: string
  hidden_profile_id: string
  content: string
  image_url: string | null
  category: string
  branch_id: string | null
  view_count: number
  like_count: number
  comment_count: number
  created_at: string
  hidden_profile?: HiddenProfile
}

export interface Confession {
  id: string
  hidden_profile_id: string
  content: string
  category: string
  like_count: number
  comment_count: number
  created_at: string
  hidden_profile?: HiddenProfile
}

export interface Teacher {
  id: string
  name: string
  department: string | null
  branch_id: string | null
  image_url: string | null
  avg_teaching: number
  avg_explanation: number
  avg_approachability: number
  avg_practical: number
  avg_overall: number
  review_count: number
}

export interface TeacherReview {
  id: string
  teacher_id: string
  hidden_profile_id: string
  rating_teaching: number
  rating_explanation: number
  rating_approachability: number
  rating_practical: number
  content: string
  helpful_count: number
  created_at: string
  hidden_profile?: HiddenProfile
}

export interface Project {
  id: string
  owner_id: string
  title: string
  description: string
  image_url: string | null
  technologies: string[]
  project_url: string | null
  github_url: string | null
  looking_for_teammates: boolean
  like_count: number
  owner?: Profile
}

export interface Achievement {
  id: string
  owner_id: string
  title: string
  description: string
  image_url: string | null
  category: string
  achievement_date: string | null
}

export interface MarketplaceListing {
  id: string
  seller_id: string
  title: string
  description: string
  image_url: string | null
  price: number
  condition: string
  category: string
  is_sold: boolean
  saved_count: number
  seller?: Profile
}

export interface LostFoundItem {
  id: string
  owner_id: string
  type: string
  item_name: string
  description: string
  image_url: string | null
  location: string | null
  item_date: string | null
  is_resolved: boolean
}

export interface Builder {
  id: string
  owner_id: string
  name: string
  description: string
  category: string
  logo_url: string | null
  cover_url: string | null
  founder_role: string
  follower_count: number
  is_trending: boolean
}

export interface ChatRoom {
  id: string
  name: string
  slug: string
  type: string
  branch_id: string | null
  icon: string | null
  member_count: number
}

export interface ChatMessage {
  id: string
  room_id: string
  author_id: string
  content: string
  reply_to: string | null
  image_url: string | null
  message_type: string
  attachment_path: string | null
  attachment_name: string | null
  attachment_mime: string | null
  attachment_size: number | null
  attachment_duration: number | null
  created_at: string
  author?: Profile
}

export interface Notification {
  id: string
  recipient_id: string
  actor_id: string | null
  type: string
  entity_type: string | null
  entity_id: string | null
  content: string | null
  is_read: boolean
  created_at: string
  actor?: Profile
}

export interface TeamRequest {
  id: string
  owner_id: string
  title: string
  description: string
  required_skills: string[]
  team_size: number
  deadline: string | null
  interested_count: number
  owner?: Profile
}

export interface SmartChallenge {
  id: string
  title: string
  description: string
  challenge_type: string
  category: string
  questions: any[]
  xp_reward: number
  is_daily: boolean
  scheduled_date: string | null
}

export interface GameScore {
  id: string
  user_id: string
  game_type: string
  best_score: number
  total_xp: number
  plays: number
}
