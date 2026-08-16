import { supabase } from '@/lib/supabase'
import type { Profile, Branch, Post, GossipPost, Confession, Teacher, EventItem, Club, Project, Achievement, MarketplaceListing, LostFoundItem, Builder, ChatRoom, ChatMessage, Notification, TeamRequest, Skill, Interest, HiddenProfile, TeacherReview } from '@/types'

// ========================================
// INPUT VALIDATION
// ========================================

const MAX_LENGTHS = {
  full_name: 100,
  username: 30,
  bio: 160,
  content: 2000,
  title: 200,
  description: 1000,
  nickname: 30,
  phone: 20,
  instagram: 30,
  item_name: 100,
  location: 200,
  reason: 200,
  details: 500,
  category: 30,
  answer: 500,
} as const

export function validateInput(value: string, fieldName: keyof typeof MAX_LENGTHS): { valid: boolean; error?: string } {
  if (typeof value !== 'string') return { valid: false, error: 'Invalid input type' }
  const trimmed = value.trim()
  if (trimmed.length === 0) return { valid: false, error: `${fieldName} cannot be empty` }
  const max = MAX_LENGTHS[fieldName] || 500
  if (trimmed.length > max) return { valid: false, error: `${fieldName} must be ${max} characters or less` }
  return { valid: true }
}

export function sanitizeText(value: string): string {
  return value.trim().replace(/\r\n/g, '\n')
}

// ========================================
// PROFILE FIELD WHITELIST
// ========================================

const PROFILE_UPDATE_WHITELIST = new Set([
  'full_name', 'username', 'bio', 'avatar_url',
  'branch_id', 'year', 'gender', 'show_gender', 'show_year',
  'instagram', 'phone', 'email_visible',
  'is_private', 'onboarding_completed', 'updated_at',
])

function filterProfileUpdates(updates: Record<string, unknown>): Record<string, unknown> {
  const safe: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(updates)) {
    if (PROFILE_UPDATE_WHITELIST.has(key)) {
      safe[key] = value
    }
  }
  return safe
}

// === Profiles ===
export async function fetchProfile(userId: string) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
  if (error) throw error
  return data as Profile | null
}

export async function fetchProfileByUsername(username: string) {
  const { data, error } = await supabase.from('profiles').select('*').ilike('username', username).maybeSingle()
  if (error) throw error
  return data as Profile | null
}

export async function updateProfile(userId: string, updates: Partial<Profile>) {
  const safeUpdates = filterProfileUpdates(updates as Record<string, unknown>)
  safeUpdates.updated_at = new Date().toISOString()
  const { data, error } = await supabase.from('profiles').update(safeUpdates).eq('id', userId).select().maybeSingle()
  if (error) throw error
  return data as Profile | null
}

export async function checkUsernameAvailability(username: string, currentUserId?: string) {
  let query = supabase.from('profiles').select('id').ilike('username', username)
  if (currentUserId) query = query.neq('id', currentUserId)
  const { data, error } = await query.maybeSingle()
  if (error) throw error
  return data === null
}

// === Config ===
export async function fetchBranches() {
  const { data, error } = await supabase.from('branches').select('*').eq('is_active', true).order('display_order')
  if (error) throw error
  return data as Branch[]
}

export async function fetchSkills() {
  const { data, error } = await supabase.from('skills').select('*').order('name')
  if (error) throw error
  return data as Skill[]
}

export async function fetchInterests() {
  const { data, error } = await supabase.from('interests').select('*').order('name')
  if (error) throw error
  return data as Interest[]
}

export async function fetchProfileSkills(profileId: string) {
  const { data, error } = await supabase
    .from('profile_skills')
    .select('skill_id, skills(id, name)')
    .eq('profile_id', profileId)
  if (error) throw error
  return data?.map((d: any) => d.skills) as Skill[] | []
}

export async function fetchProfileInterests(profileId: string) {
  const { data, error } = await supabase
    .from('profile_interests')
    .select('interest_id, interests(id, name, icon)')
    .eq('profile_id', profileId)
  if (error) throw error
  return data?.map((d: any) => d.interests) as Interest[] | []
}

// === Hidden Profile ===
export async function fetchMyHiddenProfile(userId: string) {
  const { data, error } = await supabase
    .from('hidden_profiles')
    .select('*')
    .eq('owner_id', userId)
    .maybeSingle()
  if (error) throw error
  return data as HiddenProfile | null
}

export async function createHiddenProfile(userId: string, code: string, avatarStyle: string, nickname?: string, gender?: string) {
  const { data, error } = await supabase
    .from('hidden_profiles')
    .insert({ owner_id: userId, anonymous_code: code, avatar_style: avatarStyle, nickname, gender })
    .select()
    .maybeSingle()
  if (error) throw error
  return data as HiddenProfile | null
}

// === Posts ===
export async function fetchFeedPosts(page = 0, limit = 10) {
  const from = page * limit
  const to = from + limit - 1
  const { data, error } = await supabase
    .from('posts')
    .select(`
      *,
      author:profiles!posts_author_id_fkey(*),
      media:post_media(*),
      poll_options:poll_options(*)
    `)
    .eq('is_hidden', false)
    .order('created_at', { ascending: false })
    .range(from, to)
  if (error) throw error
  return data as Post[]
}

export async function fetchProfilePosts(profileId: string, page = 0, limit = 10) {
  const from = page * limit
  const to = from + limit - 1
  const { data, error } = await supabase
    .from('posts')
    .select(`*, author:profiles!posts_author_id_fkey(*), media:post_media(*)`)
    .eq('author_id', profileId)
    .eq('is_hidden', false)
    .order('created_at', { ascending: false })
    .range(from, to)
  if (error) throw error
  return data as Post[]
}

export async function fetchPostById(postId: string) {
  const { data, error } = await supabase
    .from('posts')
    .select(`*, author:profiles!posts_author_id_fkey(*), media:post_media(*), poll_options:poll_options(*)`)
    .eq('id', postId)
    .maybeSingle()
  if (error) throw error
  return data as Post | null
}

export async function incrementPostViews(postId: string) {
  await supabase.rpc('increment_post_views', { post_id_input: postId })
}

// === Image Upload ===
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB

export function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_TYPES.includes(file.type)) return { valid: false, error: 'Only JPEG, PNG, and WebP images are allowed.' }
  if (file.size > MAX_FILE_SIZE) return { valid: false, error: 'Image must be 5 MB or less.' }
  return { valid: true }
}

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const validation = validateImageFile(file)
  if (!validation.valid) throw new Error(validation.error)
  const ext = file.name.split('.').pop() || 'jpg'
  const path = `${userId}/avatar-${Date.now()}.${ext}`
  const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
  if (error) throw error
  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  return data.publicUrl
}

export async function uploadPostImage(userId: string, file: File): Promise<string> {
  const validation = validateImageFile(file)
  if (!validation.valid) throw new Error(validation.error)
  const ext = file.name.split('.').pop() || 'jpg'
  const path = `${userId}/post-${Date.now()}.${ext}`
  const { error } = await supabase.storage.from('post-images').upload(path, file)
  if (error) throw error
  const { data } = supabase.storage.from('post-images').getPublicUrl(path)
  return data.publicUrl
}

export async function createPost(authorId: string, content: string, postType = 'text', branchId?: string) {
  const { data, error } = await supabase
    .from('posts')
    .insert({ author_id: authorId, content, post_type: postType, branch_id: branchId })
    .select()
    .maybeSingle()
  if (error) throw error
  return data
}

export async function createPostWithMedia(authorId: string, content: string, mediaUrl: string, postType = 'image') {
  const { data: post, error: postError } = await supabase
    .from('posts')
    .insert({ author_id: authorId, content, post_type: postType })
    .select()
    .maybeSingle()
  if (postError) throw postError
  const { error: mediaError } = await supabase
    .from('post_media')
    .insert({ post_id: post.id, media_url: mediaUrl, media_type: 'image', position: 0 })
  if (mediaError) throw mediaError
  return post
}

export async function createPollPost(authorId: string, content: string, options: string[]) {
  const { data: post, error: postError } = await supabase
    .from('posts')
    .insert({ author_id: authorId, content, post_type: 'poll' })
    .select()
    .maybeSingle()
  if (postError) throw postError
  const pollRows = options.map((label, i) => ({ post_id: post.id, label, position: i }))
  const { error: pollError } = await supabase.from('poll_options').insert(pollRows)
  if (pollError) throw pollError
  return post
}

export async function votePoll(postId: string, optionId: string, userId: string) {
  const { error } = await supabase.from('poll_votes').insert({ post_id: postId, option_id: optionId, voter_id: userId })
  if (error) throw error
}

export async function fetchPollVotes(postId: string) {
  const { data, error } = await supabase.from('poll_votes').select('option_id, voter_id').eq('post_id', postId)
  if (error) throw error
  return data || []
}

export async function toggleLike(postId: string, userId: string, isLiked: boolean) {
  if (isLiked) {
    await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', userId)
  } else {
    await supabase.from('post_likes').insert({ post_id: postId, user_id: userId })
  }
}

export async function toggleSave(postId: string, userId: string, isSaved: boolean) {
  if (isSaved) {
    await supabase.from('saved_posts').delete().eq('post_id', postId).eq('user_id', userId)
  } else {
    await supabase.from('saved_posts').insert({ post_id: postId, user_id: userId })
  }
}

export async function fetchSavedPosts(userId: string) {
  const { data, error } = await supabase
    .from('saved_posts')
    .select('post_id, posts(*, author:profiles!posts_author_id_fkey(*), media:post_media(*))')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data?.map((d: any) => d.posts) as Post[] | []
}

export async function fetchLikedPostIds(userId: string) {
  const { data, error } = await supabase.from('post_likes').select('post_id').eq('user_id', userId)
  if (error) throw error
  return new Set(data?.map(d => d.post_id) || [])
}

export async function fetchSavedPostIds(userId: string) {
  const { data, error } = await supabase.from('saved_posts').select('post_id').eq('user_id', userId)
  if (error) throw error
  return new Set(data?.map(d => d.post_id) || [])
}

// === Comments ===
export async function fetchComments(postId: string) {
  const { data, error } = await supabase
    .from('comments')
    .select('*, author:profiles!comments_author_id_fkey(*)')
    .eq('post_id', postId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data as any[]
}

export async function createComment(postId: string, authorId: string, content: string) {
  const { data, error } = await supabase
    .from('comments')
    .insert({ post_id: postId, author_id: authorId, content })
    .select('*, author:profiles!comments_author_id_fkey(*)')
    .maybeSingle()
  if (error) throw error
  return data
}

// === Follows ===
export async function fetchIsFollowing(followerId: string, followeeId: string) {
  const { data } = await supabase
    .from('follows')
    .select('id, status')
    .eq('follower_id', followerId)
    .eq('followee_id', followeeId)
    .maybeSingle()
  return data?.status === 'accepted' ? 'following' : data?.status === 'pending' ? 'requested' : 'none'
}

export async function followUser(followerId: string, followeeId: string, isPrivate: boolean) {
  if (isPrivate) {
    await supabase.from('follow_requests').insert({ sender_id: followerId, receiver_id: followeeId })
    return 'requested'
  } else {
    await supabase.from('follows').insert({ follower_id: followerId, followee_id: followeeId, status: 'accepted' })
    return 'following'
  }
}

export async function unfollowUser(followerId: string, followeeId: string) {
  await supabase.from('follows').delete().eq('follower_id', followerId).eq('followee_id', followeeId)
  await supabase.from('follow_requests').delete().eq('sender_id', followerId).eq('receiver_id', followeeId)
}

export async function fetchFollowers(profileId: string) {
  const { data, error } = await supabase
    .from('follows')
    .select('follower_id, follower:profiles!follows_follower_id_fkey(*)')
    .eq('followee_id', profileId)
    .eq('status', 'accepted')
  if (error) throw error
  return data?.map((d: any) => d.follower) as Profile[] | []
}

export async function fetchFollowing(profileId: string) {
  const { data, error } = await supabase
    .from('follows')
    .select('followee_id, followee:profiles!follows_followee_id_fkey(*)')
    .eq('follower_id', profileId)
    .eq('status', 'accepted')
  if (error) throw error
  return data?.map((d: any) => d.followee) as Profile[] | []
}

export async function fetchFollowRequests(userId: string) {
  const { data, error } = await supabase
    .from('follows')
    .select('id, follower_id, created_at, follower:profiles!follows_follower_id_fkey(*)')
    .eq('followee_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as any[]
}

export async function acceptFollowRequest(requestId: string) {
  const { data: req, error: fetchError } = await supabase
    .from('follows')
    .select('follower_id, followee_id')
    .eq('id', requestId)
    .maybeSingle()
  if (fetchError || !req) throw fetchError || new Error('Request not found')
  const { error } = await supabase
    .from('follows')
    .update({ status: 'accepted' })
    .eq('id', requestId)
  if (error) throw error
}

export async function declineFollowRequest(requestId: string) {
  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('id', requestId)
  if (error) throw error
}

export async function removeFollower(followerId: string, followeeId: string) {
  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', followerId)
    .eq('followee_id', followeeId)
  if (error) throw error
}

// === Search ===
export async function searchAll(query: string) {
  if (!query.trim()) return { users: [], posts: [], projects: [], clubs: [] }
  const [usersRes, postsRes, projectsRes, clubsRes] = await Promise.all([
    supabase.from('profiles').select('*').ilike('username', `%${query}%`).or(`full_name.ilike.%${query}%`).limit(10),
    supabase.from('posts').select('*, author:profiles!posts_author_id_fkey(*)').ilike('content', `%${query}%`).limit(10),
    supabase.from('projects').select('*').ilike('title', `%${query}%`).limit(5),
    supabase.from('clubs').select('*').ilike('name', `%${query}%`).limit(5),
  ])
  return {
    users: usersRes.data as Profile[] || [],
    posts: postsRes.data as Post[] || [],
    projects: projectsRes.data as Project[] || [],
    clubs: clubsRes.data as Club[] || [],
  }
}

// === Gossip ===
export async function fetchGossip(category?: string, sortBy: 'latest' | 'trending' = 'latest', limit = 20, branchId?: string | null) {
  let query = supabase
    .from('gossip_posts')
    .select('*, hidden_profile:safe_hidden_profiles(id, anonymous_code, avatar_seed, avatar_style, nickname, gender, show_gender, reputation)')
    .eq('is_hidden', false)
    .limit(limit)
  if (category && category !== 'all') query = query.eq('category', category)
  if (branchId === 'campus' || branchId === null || branchId === undefined) {
    // show campus-only (branch_id IS NULL)
  } else if (branchId) {
    query = query.eq('branch_id', branchId)
  }
  if (sortBy === 'trending') {
    query = query.order('like_count', { ascending: false })
  } else {
    query = query.order('created_at', { ascending: false })
  }
  const { data, error } = await query
  if (error) throw error
  return data as GossipPost[]
}

export async function createGossipPost(hiddenProfileId: string, content: string, category: string, imageUrl?: string, branchId?: string | null) {
  const { data, error } = await supabase
    .from('gossip_posts')
    .insert({ hidden_profile_id: hiddenProfileId, content, category, image_url: imageUrl || null, branch_id: branchId || null })
    .select('*, hidden_profile:safe_hidden_profiles(id, anonymous_code, avatar_seed, avatar_style, nickname, gender, show_gender, reputation)')
    .maybeSingle()
  if (error) throw error
  return data as GossipPost
}

export async function toggleGossipLike(gossipId: string, userId: string, isLiked: boolean) {
  if (isLiked) {
    await supabase.from('gossip_likes').delete().eq('gossip_id', gossipId).eq('user_id', userId)
    await supabase.rpc('increment_gossip_likes', { gossip_id_input: gossipId, delta: -1 })
  } else {
    await supabase.from('gossip_likes').insert({ gossip_id: gossipId, user_id: userId })
    await supabase.rpc('increment_gossip_likes', { gossip_id_input: gossipId, delta: 1 })
  }
}

export async function fetchGossipLikeIds(userId: string) {
  const { data } = await supabase.from('gossip_likes').select('gossip_id').eq('user_id', userId)
  return new Set(data?.map(d => d.gossip_id) || [])
}

// === Confessions ===
export async function fetchConfessions(category?: string, sortBy: 'latest' | 'trending' = 'latest', limit = 20) {
  let query = supabase
    .from('confessions')
    .select('*, hidden_profile:safe_hidden_profiles(id, anonymous_code, avatar_seed, avatar_style, nickname, gender, show_gender, reputation)')
    .eq('is_hidden', false)
    .limit(limit)
  if (category && category !== 'all') query = query.eq('category', category)
  if (sortBy === 'trending') {
    query = query.order('like_count', { ascending: false })
  } else {
    query = query.order('created_at', { ascending: false })
  }
  const { data, error } = await query
  if (error) throw error
  return data as Confession[]
}

export async function createConfession(hiddenProfileId: string, content: string, category: string) {
  const { data, error } = await supabase
    .from('confessions')
    .insert({ hidden_profile_id: hiddenProfileId, content, category })
    .select('*, hidden_profile:safe_hidden_profiles(id, anonymous_code, avatar_seed, avatar_style, nickname, gender, show_gender, reputation)')
    .maybeSingle()
  if (error) throw error
  return data as Confession
}

export async function toggleConfessionLike(confessionId: string, userId: string, isLiked: boolean) {
  if (isLiked) {
    await supabase.from('confession_likes').delete().eq('confession_id', confessionId).eq('user_id', userId)
  } else {
    await supabase.from('confession_likes').insert({ confession_id: confessionId, user_id: userId })
  }
}

export async function fetchConfessionLikeIds(userId: string) {
  const { data } = await supabase.from('confession_likes').select('confession_id').eq('user_id', userId)
  return new Set(data?.map(d => d.confession_id) || [])
}

// === Teachers ===
export async function fetchTeachers(branchId?: string) {
  let query = supabase.from('teachers').select('*').order('avg_overall', { ascending: false })
  if (branchId) query = query.eq('branch_id', branchId)
  const { data, error } = await query
  if (error) throw error
  return data as Teacher[]
}

export async function fetchTeacherReviews(teacherId: string) {
  const { data, error } = await supabase
    .from('teacher_reviews')
    .select('*, hidden_profile:safe_hidden_profiles(id, anonymous_code, avatar_seed, avatar_style, nickname, gender, show_gender, reputation)')
    .eq('teacher_id', teacherId)
    .eq('is_hidden', false)
    .order('helpful_count', { ascending: false })
  if (error) throw error
  return data as TeacherReview[]
}

export async function createTeacherReview(
  teacherId: string,
  hiddenProfileId: string,
  ratings: { teaching: number; explanation: number; approachability: number; practical: number },
  content: string
) {
  const { data, error } = await supabase
    .from('teacher_reviews')
    .insert({
      teacher_id: teacherId,
      hidden_profile_id: hiddenProfileId,
      rating_teaching: ratings.teaching,
      rating_explanation: ratings.explanation,
      rating_approachability: ratings.approachability,
      rating_practical: ratings.practical,
      content,
    })
    .select('*, hidden_profile:safe_hidden_profiles(id, anonymous_code, avatar_seed, avatar_style, nickname, gender, show_gender, reputation)')
    .maybeSingle()
  if (error) throw error
  // Update teacher averages
  const { data: reviews } = await supabase.from('teacher_reviews').select('rating_teaching, rating_explanation, rating_approachability, rating_practical').eq('teacher_id', teacherId).eq('is_hidden', false)
  if (reviews && reviews.length > 0) {
    const n = reviews.length
    const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / n
    await supabase.from('teachers').update({
      avg_teaching: avg(reviews.map(r => r.rating_teaching)),
      avg_explanation: avg(reviews.map(r => r.rating_explanation)),
      avg_approachability: avg(reviews.map(r => r.rating_approachability)),
      avg_practical: avg(reviews.map(r => r.rating_practical)),
      avg_overall: avg(reviews.map(r => (r.rating_teaching + r.rating_explanation + r.rating_approachability + r.rating_practical) / 4)),
      review_count: n,
    }).eq('id', teacherId)
  }
  return data as TeacherReview
}

export async function toggleReviewLike(reviewId: string, userId: string, isLiked: boolean) {
  if (isLiked) {
    await supabase.from('review_likes').delete().eq('review_id', reviewId).eq('user_id', userId)
  } else {
    await supabase.from('review_likes').insert({ review_id: reviewId, user_id: userId })
  }
}

export async function fetchReviewLikeIds(userId: string) {
  const { data } = await supabase.from('review_likes').select('review_id').eq('user_id', userId)
  return new Set(data?.map(d => d.review_id) || [])
}

// === DMs ===
export async function createOrGetConversation(userId1: string, userId2: string) {
  // Check if conversation already exists
  const { data: myParts } = await supabase.from('dm_participants').select('conversation_id').eq('user_id', userId1)
  if (myParts && myParts.length > 0) {
    const convIds = myParts.map(p => p.conversation_id)
    const { data: otherParts } = await supabase.from('dm_participants').select('conversation_id').in('conversation_id', convIds).eq('user_id', userId2)
    if (otherParts && otherParts.length > 0) {
      return otherParts[0].conversation_id as string
    }
  }
  // Create new conversation
  const { data: conv, error: convError } = await supabase.from('dm_conversations').insert({}).select().maybeSingle()
  if (convError) throw convError
  await supabase.from('dm_participants').insert([
    { conversation_id: conv.id, user_id: userId1 },
    { conversation_id: conv.id, user_id: userId2 },
  ])
  return conv.id as string
}

export async function sendDmMessage(conversationId: string, senderId: string, content: string) {
  const { data, error } = await supabase
    .from('dm_messages')
    .insert({ conversation_id: conversationId, sender_id: senderId, content })
    .select('*, sender:profiles!dm_messages_sender_id_fkey(*)')
    .maybeSingle()
  if (error) throw error
  return data
}

export async function fetchDmMessages(conversationId: string, limit = 50) {
  const { data, error } = await supabase
    .from('dm_messages')
    .select('*, sender:profiles!dm_messages_sender_id_fkey(*)')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data || []).reverse()
}

// === Zeal Match ===
export async function findMatch(hiddenProfileId: string, intention: string) {
  // Find a compatible hidden profile that's not the user's own
  const { data: existingMatches } = await supabase
    .from('hidden_matches')
    .select('hidden_profile_1, hidden_profile_2')
    .or(`hidden_profile_1.eq.${hiddenProfileId},hidden_profile_2.eq.${hiddenProfileId}`)
    .eq('status', 'active')
  const matchedIds = new Set<string>()
  existingMatches?.forEach(m => {
    matchedIds.add(m.hidden_profile_1)
    matchedIds.add(m.hidden_profile_2)
  })
  matchedIds.delete(hiddenProfileId)

  let query = supabase
    .from('hidden_profiles')
    .select('id, anonymous_code, avatar_seed, avatar_style, nickname, gender, show_gender')
    .neq('id', hiddenProfileId)
  if (matchedIds.size > 0) {
    query = query.not('id', 'in', `(${Array.from(matchedIds).join(',')})`)
  }
  const { data: candidates } = await query.limit(10)
  if (!candidates || candidates.length === 0) return null
  const candidate = candidates[Math.floor(Math.random() * candidates.length)]

  // Create match
  const { data: match, error } = await supabase
    .from('hidden_matches')
    .insert({
      hidden_profile_1: hiddenProfileId,
      hidden_profile_2: candidate.id,
      intention,
    })
    .select()
    .maybeSingle()
  if (error) throw error
  return { match, partner: candidate }
}

export async function fetchMyMatches(hiddenProfileId: string) {
  const { data, error } = await supabase
    .from('hidden_matches')
    .select('*')
    .or(`hidden_profile_1.eq.${hiddenProfileId},hidden_profile_2.eq.${hiddenProfileId}`)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function sendHiddenMessage(matchId: string, senderHiddenId: string, content: string) {
  const { data, error } = await supabase
    .from('hidden_messages')
    .insert({ match_id: matchId, sender_hidden_id: senderHiddenId, content })
    .select()
    .maybeSingle()
  if (error) throw error
  return data
}

export async function fetchHiddenMessages(matchId: string) {
  const { data, error } = await supabase
    .from('hidden_messages')
    .select('*')
    .eq('match_id', matchId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data || []
}

export async function requestReveal(matchId: string, requesterHiddenId: string) {
  const { data: existing } = await supabase.from('reveal_requests').select('*').eq('match_id', matchId).maybeSingle()
  if (existing) {
    const isRequester1 = existing.requester_hidden_id === requesterHiddenId
    const updateField = isRequester1 ? 'approved_1' : 'approved_2'
    await supabase.from('reveal_requests').update({ [updateField]: true }).eq('id', existing.id)
    // Check if both approved
    const { data: updated } = await supabase.from('reveal_requests').select('*').eq('id', existing.id).maybeSingle()
    if (updated?.approved_1 && updated?.approved_2) {
      await supabase.from('hidden_matches').update({ revealed: true }).eq('id', matchId)
      await supabase.from('reveal_requests').update({ status: 'approved' }).eq('id', existing.id)
      return { revealed: true }
    }
    return { revealed: false }
  } else {
    const { data, error } = await supabase
      .from('reveal_requests')
      .insert({ match_id: matchId, requester_hidden_id: requesterHiddenId, approved_1: true })
      .select()
      .maybeSingle()
    if (error) throw error
    return { revealed: false, request: data }
  }
}

export async function endMatch(matchId: string) {
  await supabase.from('hidden_matches').update({ status: 'ended' }).eq('id', matchId)
}

// === Smart League ===
export async function fetchSmartProfile(userId: string) {
  const { data: breakdown } = await supabase.from('smart_score_breakdown').select('*').eq('user_id', userId)
  const { data: attempts } = await supabase.from('smart_attempts').select('*, challenge:smart_challenges(*)').eq('user_id', userId).order('created_at', { ascending: false }).limit(10)
  const { data: streak } = await supabase.from('daily_streaks').select('*').eq('user_id', userId).eq('streak_type', 'smart').maybeSingle()
  return { breakdown: breakdown || [], attempts: attempts || [], streak }
}

export async function submitChallengeAttempt(userId: string, challengeId: string, answers: Record<number, number>, score: number, xpEarned: number, category: string) {
  const { data, error } = await supabase
    .from('smart_attempts')
    .insert({ user_id: userId, challenge_id: challengeId, answers, score, xp_earned: xpEarned })
    .select()
    .maybeSingle()
  if (error) throw error
  // Update smart score breakdown
  await supabase.from('smart_score_breakdown').upsert({
    user_id: userId,
    category,
    score: score * 10,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,category' })
  // Update profile smart_score
  const { data: breakdown } = await supabase.from('smart_score_breakdown').select('score').eq('user_id', userId)
  if (breakdown) {
    const totalScore = breakdown.reduce((sum, b) => sum + (b.score || 0), 0)
    await supabase.from('profiles').update({ smart_score: totalScore }).eq('id', userId)
  }
  // Update streak
  const today = new Date().toISOString().split('T')[0]
  await supabase.from('daily_streaks').upsert({
    user_id: userId,
    streak_type: 'smart',
    current_streak: 1,
    last_active_date: today,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,streak_type' })
  return data
}

export async function fetchSmartLeaderboard(branchId?: string, limit = 20) {
  let query = supabase.from('profiles').select('*').eq('is_banned', false).order('smart_score', { ascending: false }).limit(limit)
  if (branchId) query = query.eq('branch_id', branchId)
  const { data, error } = await query
  if (error) throw error
  return data as Profile[]
}

// === Games ===
export async function saveGameScore(userId: string, gameType: string, score: number, xpEarned: number) {
  const { data: existing } = await supabase.from('game_scores').select('*').eq('user_id', userId).eq('game_type', gameType).maybeSingle()
  if (existing) {
    if (score > existing.best_score) {
      await supabase.from('game_scores').update({ best_score: score, total_xp: existing.total_xp + xpEarned, plays: existing.plays + 1, updated_at: new Date().toISOString() }).eq('id', existing.id)
    } else {
      await supabase.from('game_scores').update({ total_xp: existing.total_xp + xpEarned, plays: existing.plays + 1, updated_at: new Date().toISOString() }).eq('id', existing.id)
    }
  } else {
    await supabase.from('game_scores').insert({ user_id: userId, game_type: gameType, best_score: score, total_xp: xpEarned, plays: 1 })
  }
  // Update profile game_xp
  const { data: scores } = await supabase.from('game_scores').select('total_xp').eq('user_id', userId)
  if (scores) {
    const totalXp = scores.reduce((sum, s) => sum + (s.total_xp || 0), 0)
    const newLevel = Math.floor(totalXp / 500) + 1
    await supabase.from('profiles').update({ game_xp: totalXp, game_level: newLevel }).eq('id', userId)
  }
}

export async function fetchGameScores(userId: string) {
  const { data, error } = await supabase.from('game_scores').select('*').eq('user_id', userId)
  if (error) throw error
  return data || []
}

// === Events ===
export async function toggleEventAttend(eventId: string, userId: string) {
  const { data: existing } = await supabase.from('event_attendees').select('id').eq('event_id', eventId).eq('user_id', userId).maybeSingle()
  if (existing) {
    await supabase.from('event_attendees').delete().eq('id', existing.id)
    return false
  } else {
    await supabase.from('event_attendees').insert({ event_id: eventId, user_id: userId })
    return true
  }
}

export async function fetchEventAttendeeIds(eventId: string) {
  const { data } = await supabase.from('event_attendees').select('user_id').eq('event_id', eventId)
  return new Set(data?.map(d => d.user_id) || [])
}

// === Clubs ===
export async function toggleClubJoin(clubId: string, userId: string) {
  const { data: existing } = await supabase.from('club_members').select('id').eq('club_id', clubId).eq('user_id', userId).maybeSingle()
  if (existing) {
    await supabase.from('club_members').delete().eq('id', existing.id)
    return false
  } else {
    await supabase.from('club_members').insert({ club_id: clubId, user_id: userId })
    return true
  }
}

export async function fetchClubMemberIds(clubId: string) {
  const { data } = await supabase.from('club_members').select('user_id').eq('club_id', clubId)
  return new Set(data?.map(d => d.user_id) || [])
}

// === Projects ===
export async function createProject(ownerId: string, title: string, description: string, technologies: string[], projectUrl?: string, githubUrl?: string, lookingForTeammates = false) {
  const { data, error } = await supabase
    .from('projects')
    .insert({ owner_id: ownerId, title, description, technologies, project_url: projectUrl || null, github_url: githubUrl || null, looking_for_teammates: lookingForTeammates })
    .select('*, owner:profiles!projects_owner_id_fkey(*)')
    .maybeSingle()
  if (error) throw error
  return data as Project
}

export async function expressProjectInterest(projectId: string, userId: string, message?: string) {
  const { error } = await supabase.from('project_interests').insert({ project_id: projectId, user_id: userId, message })
  if (error) throw error
}

// === Marketplace ===
export async function createMarketplaceListing(sellerId: string, title: string, description: string, price: number, condition: string, category: string, imageUrl?: string) {
  const { data, error } = await supabase
    .from('marketplace_listings')
    .insert({ seller_id: sellerId, title, description, price, condition, category, image_url: imageUrl || null })
    .select('*, seller:profiles!marketplace_listings_seller_id_fkey(*)')
    .maybeSingle()
  if (error) throw error
  return data as MarketplaceListing
}

export async function toggleMarketplaceSave(listingId: string, userId: string) {
  const { data: existing } = await supabase.from('marketplace_saves').select('id').eq('listing_id', listingId).eq('user_id', userId).maybeSingle()
  if (existing) {
    await supabase.from('marketplace_saves').delete().eq('id', existing.id)
    return false
  } else {
    await supabase.from('marketplace_saves').insert({ listing_id: listingId, user_id: userId })
    return true
  }
}

export async function fetchMarketplaceSaveIds(userId: string) {
  const { data } = await supabase.from('marketplace_saves').select('listing_id').eq('user_id', userId)
  return new Set(data?.map(d => d.listing_id) || [])
}

export async function markListingSold(listingId: string, sellerId: string) {
  await supabase.from('marketplace_listings').update({ is_sold: true }).eq('id', listingId).eq('seller_id', sellerId)
}

// === Lost & Found ===
export async function createLostFoundItem(ownerId: string, type: string, itemName: string, description: string, location?: string, itemDate?: string, imageUrl?: string) {
  const { data, error } = await supabase
    .from('lost_found_items')
    .insert({ owner_id: ownerId, type, item_name: itemName, description, location, item_date: itemDate || null, image_url: imageUrl || null })
    .select()
    .maybeSingle()
  if (error) throw error
  return data as LostFoundItem
}

export async function markLostFoundResolved(itemId: string, ownerId: string) {
  await supabase.from('lost_found_items').update({ is_resolved: true }).eq('id', itemId).eq('owner_id', ownerId)
}

// === Builders ===
export async function createBuilder(ownerId: string, name: string, description: string, category: string, founderRole: string, logoUrl?: string) {
  const { data, error } = await supabase
    .from('builders')
    .insert({ owner_id: ownerId, name, description, category, founder_role: founderRole, logo_url: logoUrl || null })
    .select()
    .maybeSingle()
  if (error) throw error
  return data as Builder
}

// === Rankings (extended) ===
export async function fetchRankings(type: 'popular' | 'smart' | 'gamer' | 'creator', branchId?: string, limit = 20) {
  let query = supabase.from('profiles').select('*').eq('is_banned', false).limit(limit)
  if (branchId) query = query.eq('branch_id', branchId)
  switch (type) {
    case 'popular': query = query.order('follower_count', { ascending: false }); break
    case 'smart': query = query.order('smart_score', { ascending: false }); break
    case 'gamer': query = query.order('game_xp', { ascending: false }); break
    case 'creator': query = query.order('post_count', { ascending: false }); break
  }
  const { data, error } = await query
  if (error) throw error
  return data as Profile[]
}

// === Events ===
export async function fetchEvents(filter?: string) {
  let query = supabase.from('events').select('*').order('event_date', { ascending: true })
  const now = new Date().toISOString()
  if (filter === 'today') {
    const end = new Date(); end.setHours(23, 59, 59)
    query = query.gte('event_date', now).lte('event_date', end.toISOString())
  } else if (filter === 'week') {
    const weekEnd = new Date(); weekEnd.setDate(weekEnd.getDate() + 7)
    query = query.gte('event_date', now).lte('event_date', weekEnd.toISOString())
  } else if (filter === 'upcoming') {
    query = query.gte('event_date', now)
  }
  const { data, error } = await query
  if (error) throw error
  return data as EventItem[]
}

// === Clubs ===
export async function fetchClubs() {
  const { data, error } = await supabase.from('clubs').select('*').order('member_count', { ascending: false })
  if (error) throw error
  return data as Club[]
}

// === Projects ===
export async function fetchProjects(limit = 20) {
  const { data, error } = await supabase
    .from('projects')
    .select('*, owner:profiles!projects_owner_id_fkey(*)')
    .order('like_count', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data as Project[]
}

export async function fetchProfileProjects(profileId: string) {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('owner_id', profileId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as Project[]
}

// === Achievements ===
export async function fetchProfileAchievements(profileId: string) {
  const { data, error } = await supabase.from('achievements').select('*').eq('owner_id', profileId).order('achievement_date', { ascending: false })
  if (error) throw error
  return data as Achievement[]
}

// === Marketplace ===
export async function fetchMarketplace(category?: string) {
  let query = supabase.from('marketplace_listings').select('*, seller:profiles!marketplace_listings_seller_id_fkey(*)').order('created_at', { ascending: false })
  if (category && category !== 'all') query = query.eq('category', category)
  const { data, error } = await query
  if (error) throw error
  return data as MarketplaceListing[]
}

// === Lost & Found ===
export async function fetchLostFound(type?: string) {
  let query = supabase.from('lost_found_items').select('*').order('created_at', { ascending: false })
  if (type && type !== 'all') query = query.eq('type', type)
  const { data, error } = await query
  if (error) throw error
  return data as LostFoundItem[]
}

// === Builders ===
export async function fetchBuilders(category?: string) {
  let query = supabase.from('builders').select('*').order('follower_count', { ascending: false })
  if (category && category !== 'all') query = query.eq('category', category)
  const { data, error } = await query
  if (error) throw error
  return data as Builder[]
}

// === Chat Rooms ===
export async function fetchChatRooms() {
  const { data, error } = await supabase.from('chat_rooms').select('*').eq('is_active', true).order('name')
  if (error) throw error
  return data as ChatRoom[]
}

export async function fetchCampusRooms(userId: string) {
  const { data, error } = await supabase.rpc('get_campus_rooms', { p_user_id: userId })
  if (error) {
    // Fallback: fetch campus room manually if RPC not applied yet
    const { data: fallback, error: fbErr } = await supabase
      .from('chat_rooms')
      .select('*')
      .eq('is_active', true)
      .in('slug', ['campus', 'everyone'])
      .limit(1)
    if (fbErr) throw fbErr
    return (fallback || []) as ChatRoom[]
  }
  return (data || []) as ChatRoom[]
}

export async function fetchChatMessages(roomId: string, limit = 50) {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*, author:profiles!chat_messages_author_id_fkey(*)')
    .eq('room_id', roomId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data as ChatMessage[]).reverse()
}

export async function sendChatMessage(roomId: string, authorId: string, content: string) {
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({ room_id: roomId, author_id: authorId, content })
    .select('*, author:profiles!chat_messages_author_id_fkey(*)')
    .maybeSingle()
  if (error) throw error
  return data as ChatMessage
}

// === Team Requests ===
export async function fetchTeamRequests() {
  const { data, error } = await supabase
    .from('team_requests')
    .select('*, owner:profiles!team_requests_owner_id_fkey(*)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as TeamRequest[]
}

// === Notifications ===
export async function fetchNotifications(userId: string) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*, actor:profiles!notifications_actor_id_fkey(*)')
    .eq('recipient_id', userId)
    .order('created_at', { ascending: false })
    .limit(30)
  if (error) throw error
  return data as Notification[]
}

export async function markNotificationsRead(userId: string) {
  await supabase.from('notifications').update({ is_read: true }).eq('recipient_id', userId).eq('is_read', false)
}

export async function markNotificationRead(notificationId: string) {
  await supabase.from('notifications').update({ is_read: true }).eq('id', notificationId)
}

// === Reports ===
export async function reportContent(reporterId: string, entityType: string, entityId: string, reason: string, details?: string) {
  const { error } = await supabase
    .from('reports')
    .insert({ reporter_id: reporterId, entity_type: entityType, entity_id: entityId, reason, details })
  if (error) throw error
}

// === Blocks ===
export async function blockUser(blockerId: string, blockedId: string) {
  await supabase.from('blocks').insert({ blocker_id: blockerId, blocked_id: blockedId })
}

export async function fetchBlockedUsers(userId: string) {
  const { data, error } = await supabase
    .from('blocks')
    .select('blocked_id, blocked:profiles!blocks_blocked_id_fkey(*)')
    .eq('blocker_id', userId)
  if (error) throw error
  return data?.map((d: any) => d.blocked) as Profile[] | []
}

// === Leaderboards ===
export async function fetchLeaderboard(sortBy: 'follower_count' | 'smart_score' | 'game_xp', branchId?: string, limit = 20) {
  let query = supabase.from('profiles').select('*').eq('is_banned', false).order(sortBy, { ascending: false }).limit(limit)
  if (branchId) query = query.eq('branch_id', branchId)
  const { data, error } = await query
  if (error) throw error
  return data as Profile[]
}

// === Rank calculation ===
export async function fetchUserRank(userId: string, type: 'popular' | 'smart' | 'gamer' | 'creator') {
  const col = type === 'popular' ? 'follower_count' : type === 'smart' ? 'smart_score' : type === 'gamer' ? 'game_xp' : 'post_count'
  const { count } = await supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('is_banned', false).gt(col, 0)
  const { data: me } = await supabase.from('profiles').select(col).eq('id', userId).maybeSingle()
  if (!me) return (count || 0) + 1
  const { count: higherCount } = await supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('is_banned', false).gt(col, (me as any)[col] || 0)
  return (higherCount || 0) + 1
}

// === Resources ===
export interface Resource {
  id: string
  uploader_id: string
  title: string
  description: string
  subject: string
  resource_type: string
  branch_id: string | null
  semester: number | null
  external_url: string | null
  useful_count: number
  created_at: string
  uploader?: Profile
  branch?: Branch
}

export async function fetchResources(filters?: { subject?: string; type?: string; branchId?: string; search?: string }, page = 0, limit = 20) {
  const from = page * limit
  const to = from + limit - 1
  let query = supabase
    .from('resources')
    .select('*, uploader:profiles!resources_uploader_id_fkey(*), branch:branches(*)')
    .order('created_at', { ascending: false })
    .range(from, to)
  if (filters?.subject) query = query.eq('subject', filters.subject)
  if (filters?.type && filters.type !== 'all') query = query.eq('resource_type', filters.type)
  if (filters?.branchId) query = query.eq('branch_id', filters.branchId)
  if (filters?.search) query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%,subject.ilike.%${filters.search}%`)
  const { data, error } = await query
  if (error) throw error
  return data as Resource[]
}

export async function createResource(uploaderId: string, title: string, description: string, subject: string, resourceType: string, branchId?: string, semester?: number, externalUrl?: string) {
  const { data, error } = await supabase
    .from('resources')
    .insert({
      uploader_id: uploaderId, title, description, subject, resource_type: resourceType,
      branch_id: branchId || null, semester: semester || null, external_url: externalUrl || null,
    })
    .select('*, uploader:profiles!resources_uploader_id_fkey(*), branch:branches(*)')
    .maybeSingle()
  if (error) throw error
  return data as Resource
}

export async function toggleResourceUseful(resourceId: string, userId: string, isUseful: boolean) {
  if (isUseful) {
    await supabase.from('resource_useful').delete().eq('resource_id', resourceId).eq('user_id', userId)
    await supabase.rpc('increment_resource_useful', { resource_id_input: resourceId, delta: -1 })
  } else {
    await supabase.from('resource_useful').insert({ resource_id: resourceId, user_id: userId })
    await supabase.rpc('increment_resource_useful', { resource_id_input: resourceId, delta: 1 })
  }
}

export async function fetchResourceUsefulIds(userId: string) {
  const { data } = await supabase.from('resource_useful').select('resource_id').eq('user_id', userId)
  return new Set(data?.map(d => d.resource_id) || [])
}

export async function toggleResourceSave(resourceId: string, userId: string, isSaved: boolean) {
  if (isSaved) {
    await supabase.from('resource_saves').delete().eq('resource_id', resourceId).eq('user_id', userId)
  } else {
    await supabase.from('resource_saves').insert({ resource_id: resourceId, user_id: userId })
  }
}

export async function fetchResourceSaveIds(userId: string) {
  const { data } = await supabase.from('resource_saves').select('resource_id').eq('user_id', userId)
  return new Set(data?.map(d => d.resource_id) || [])
}

export async function fetchResourceSubjects() {
  const { data } = await supabase.from('resources').select('subject').order('subject')
  const subjects = [...new Set(data?.map(d => d.subject) || [])]
  return subjects
}
