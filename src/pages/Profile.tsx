import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Settings as SettingsIcon,
  Share2,
  MoreHorizontal,
  Heart,
  FolderOpen,
  Trophy,
  Bookmark,
  MapPin,
  UserPlus,
  UserCheck,
  X,
  MessageCircle,
  Flag,
  Ban,
  ExternalLink,
  Sparkles,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Avatar } from '@/components/Avatar'
import { PostCard } from '@/components/PostCard'
import { SkeletonProfile, SkeletonList } from '@/components/Skeleton'
import { EmptyState, ErrorState } from '@/components/States'
import { Sheet } from '@/components/Sheet'
import {
  fetchProfileByUsername,
  fetchProfilePosts,
  fetchProfileProjects,
  fetchProfileAchievements,
  fetchProfileSkills,
  fetchSavedPosts,
  fetchIsFollowing,
  followUser,
  unfollowUser,
  fetchFollowers,
  fetchFollowing,
  fetchFollowRequests,
  acceptFollowRequest,
  declineFollowRequest,
  removeFollower,
  createOrGetConversation,
  blockUser,
  reportContent,
  fetchBranches,
  fetchUserRank,
} from '@/lib/data'
import { formatNumber, yearLabel } from '@/lib/utils'
import type { Profile, Post, Project, Achievement, Skill, Branch } from '@/types'

type Tab = 'posts' | 'projects' | 'achievements' | 'saved'
type ListSheet = 'followers' | 'following' | 'requests' | null
type MoreMenu = 'report' | 'block' | null

const AURA_EMOJIS: Record<string, string> = {
  'creative': '🎨',
  'leader': '👑',
  'techie': '💻',
  'gamer': '🎮',
  'social': '🤝',
  'sporty': '⚽',
  'nerd': '🧠',
  'vibes': '✨',
  'mystic': '🔮',
}

const RANK_ICONS = {
  popular: '👑',
  smart: '🧠',
  gamer: '🎮',
  creator: '🔥',
}

export function Profile() {
  const { username } = useParams()
  const { profile: me, user } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [branch, setBranch] = useState<Branch | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [tab, setTab] = useState<Tab>('posts')
  const [posts, setPosts] = useState<Post[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [savedPosts, setSavedPosts] = useState<Post[]>([])
  const [skills, setSkills] = useState<Skill[]>([])
  const [followStatus, setFollowStatus] = useState<'none' | 'following' | 'requested'>('none')
  const [followLoading, setFollowLoading] = useState(false)
  const [tabLoading, setTabLoading] = useState(false)
  const [listSheet, setListSheet] = useState<ListSheet>(null)
  const [listItems, setListItems] = useState<Profile[]>([])
  const [listLoading, setListLoading] = useState(false)
  const [followRequests, setFollowRequests] = useState<any[]>([])
  const [moreMenu, setMoreMenu] = useState<MoreMenu>(null)
  const [reportReason, setReportReason] = useState('')
  const [reportSubmitting, setReportSubmitting] = useState(false)
  const [blockConfirm, setBlockConfirm] = useState(false)
  const [copied, setCopied] = useState(false)
  const [ranks, setRanks] = useState<Record<string, number>>({popular: 0, smart: 0, gamer: 0, creator: 0})

  const isOwnProfile = !username || username === 'me' || (me && username === me.username)

  useEffect(() => {
    setLoading(true)
    setError(false)
    if (isOwnProfile && me) {
      setProfile(me)
      setLoading(false)
    } else if (username) {
      fetchProfileByUsername(username)
        .then(p => {
          if (!p) { setError(true); return }
          setProfile(p)
        })
        .catch(() => setError(true))
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [username, me, isOwnProfile])

  useEffect(() => {
    if (profile?.branch_id) {
      fetchBranches()
        .then(branches => {
          const b = branches.find(br => br.id === profile.branch_id)
          setBranch(b || null)
        })
        .catch(() => {})
    }
  }, [profile?.branch_id])

  useEffect(() => {
    if (!profile) return
    const pid = profile.id
    setTabLoading(true)
    Promise.all([
      fetchProfilePosts(pid),
      fetchProfileProjects(pid),
      fetchProfileAchievements(pid),
      fetchProfileSkills(pid),
    ])
      .then(([p, pr, a, s]) => {
        setPosts(p)
        setProjects(pr)
        setAchievements(a)
        setSkills(s)
      })
      .catch(() => {})
      .finally(() => setTabLoading(false))

    if (isOwnProfile) {
      fetchSavedPosts(pid).then(setSavedPosts).catch(() => {})
      fetchFollowRequests(pid).then(setFollowRequests).catch(() => {})
    }

    if (!isOwnProfile && user) {
      fetchIsFollowing(user.id, pid).then(setFollowStatus).catch(() => {})
    }
  }, [profile, isOwnProfile, user])

  useEffect(() => {
    if (!profile || !isOwnProfile) return
    const uid = profile.id
    Promise.all([
      fetchUserRank(uid, 'popular'),
      fetchUserRank(uid, 'smart'),
      fetchUserRank(uid, 'gamer'),
      fetchUserRank(uid, 'creator'),
    ]).then(([p, s, g, c]) => setRanks({popular: p, smart: s, gamer: g, creator: c})).catch(() => {})
  }, [profile, isOwnProfile])

  const handleFollow = async () => {
    if (!user || !profile) return
    setFollowLoading(true)
    try {
      if (followStatus === 'following' || followStatus === 'requested') {
        await unfollowUser(user.id, profile.id)
        setFollowStatus('none')
      } else {
        const status = await followUser(user.id, profile.id, profile.is_private)
        setFollowStatus(status as 'following' | 'requested')
      }
    } finally {
      setFollowLoading(false)
    }
  }

  const handleMessage = async () => {
    if (!user || !profile) return
    try {
      const conversationId = await createOrGetConversation(user.id, profile.id)
      navigate(`/chat/${conversationId}`)
    } catch {}
  }

  const openList = async (type: ListSheet) => {
    if (!profile) return
    setListSheet(type)
    setListLoading(true)
    try {
      if (type === 'followers') {
        const items = await fetchFollowers(profile.id)
        setListItems(items)
      } else if (type === 'following') {
        const items = await fetchFollowing(profile.id)
        setListItems(items)
      }
    } catch {} finally {
      setListLoading(false)
    }
  }

  const handleAcceptRequest = async (requestId: string) => {
    try {
      await acceptFollowRequest(requestId)
      setFollowRequests(prev => prev.filter((r: any) => r.id !== requestId))
      if (profile) {
        setProfile({ ...profile, follower_count: profile.follower_count + 1 })
      }
    } catch {}
  }

  const handleDeclineRequest = async (requestId: string) => {
    try {
      await declineFollowRequest(requestId)
      setFollowRequests(prev => prev.filter((r: any) => r.id !== requestId))
    } catch {}
  }

  const handleRemoveFollower = async (followerId: string) => {
    if (!profile) return
    try {
      await removeFollower(followerId, profile.id)
      setListItems(prev => prev.filter(p => p.id !== followerId))
      setProfile({ ...profile, follower_count: Math.max(0, profile.follower_count - 1) })
    } catch {}
  }

  const handleReport = async () => {
    if (!user || !profile || !reportReason.trim()) return
    setReportSubmitting(true)
    try {
      await reportContent(user.id, 'profile', profile.id, reportReason.trim())
      setMoreMenu(null)
      setReportReason('')
    } catch {} finally {
      setReportSubmitting(false)
    }
  }

  const handleBlock = async () => {
    if (!user || !profile) return
    try {
      await blockUser(user.id, profile.id)
      setMoreMenu(null)
      setBlockConfirm(false)
    } catch {}
  }

  const handleShare = async () => {
    const url = `${window.location.origin}/profile/${profile?.username}`
    if (navigator.share) {
      try { await navigator.share({ title: `${profile?.full_name} on InsideZeal`, url }) } catch {}
    } else {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (loading) return <SkeletonProfile />
  if (error || !profile)
    return (
      <ErrorState
        title="Profile not found"
        description="This student may not exist or has a private profile."
        onRetry={() => navigate('/explore')}
      />
    )

  const auraBadges = (profile.aura_badges || []).slice(0, 3)

  const tabs: { id: Tab; label: string; icon: typeof Heart }[] = isOwnProfile
    ? [
        { id: 'posts', label: 'Posts', icon: Heart },
        { id: 'projects', label: 'Projects', icon: FolderOpen },
        { id: 'achievements', label: 'Achievements', icon: Trophy },
        { id: 'saved', label: 'Saved', icon: Bookmark },
      ]
    : [
        { id: 'posts', label: 'Posts', icon: Heart },
        { id: 'projects', label: 'Projects', icon: FolderOpen },
        { id: 'achievements', label: 'Achievements', icon: Trophy },
      ]

  return (
    <div className="space-y-5">
      {/* Profile Header */}
      <div className="card p-6">
        <div className="flex items-start gap-4">
          <Avatar src={profile.avatar_url} alt={profile.full_name} size="xl" ring />
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-display font-bold text-white truncate">{profile.full_name}</h1>
            <p className="text-gray-500 text-sm">@{profile.username}</p>
            <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
              {profile.show_year && <span>{yearLabel(profile.year)}</span>}
              {branch && (
                <>
                  <span>·</span>
                  <span>{branch.name}</span>
                </>
              )}
              {profile.instagram && (
                <>
                  <span>·</span>
                  <a
                    href={`https://instagram.com/${profile.instagram}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-zeal-400 hover:underline"
                  >
                    @{profile.instagram}
                  </a>
                </>
              )}
            </div>
            {profile.bio && <p className="text-sm text-gray-300 mt-2 whitespace-pre-wrap">{profile.bio}</p>}
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-6 mt-5">
          <button onClick={() => openList('followers')} className="text-left group">
            <p className="text-lg font-bold text-white group-hover:text-zeal-400 transition-colors">
              {formatNumber(profile.follower_count)}
            </p>
            <p className="text-xs text-gray-500">Followers</p>
          </button>
          <button onClick={() => openList('following')} className="text-left group">
            <p className="text-lg font-bold text-white group-hover:text-zeal-400 transition-colors">
              {formatNumber(profile.following_count)}
            </p>
            <p className="text-xs text-gray-500">Following</p>
          </button>
          <div>
            <p className="text-lg font-bold text-white">{profile.post_count}</p>
            <p className="text-xs text-gray-500">Posts</p>
          </div>
          <div>
            <p className="text-lg font-bold text-zeal-500">{profile.zeal_score}</p>
            <p className="text-xs text-gray-500">Zeal Score</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-5 flex-wrap">
          {isOwnProfile ? (
            <>
              <button onClick={() => navigate('/edit-profile')} className="btn-primary text-sm flex items-center gap-2">
                <SettingsIcon className="w-4 h-4" /> Edit Profile
              </button>
              <button onClick={() => navigate('/settings')} className="btn-secondary text-sm flex items-center gap-2">
                Settings
              </button>
              <button onClick={handleShare} className="btn-secondary text-sm flex items-center gap-2">
                <Share2 className="w-4 h-4" /> {copied ? 'Copied!' : 'Share'}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleFollow}
                disabled={followLoading}
                className={
                  followStatus === 'following' || followStatus === 'requested'
                    ? 'btn-secondary text-sm'
                    : 'btn-primary text-sm'
                }
              >
                {followStatus === 'following'
                  ? 'Following'
                  : followStatus === 'requested'
                  ? 'Requested'
                  : profile.is_private
                  ? 'Request Follow'
                  : 'Follow'}
              </button>
              <button onClick={handleMessage} className="btn-secondary text-sm flex items-center gap-2">
                <MessageCircle className="w-4 h-4" /> Message
              </button>
              <button onClick={() => setMoreMenu('report')} className="btn-ghost text-sm p-2.5">
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Follow Requests (own profile only) */}
      {isOwnProfile && followRequests.length > 0 && (
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
            <UserPlus className="w-4 h-4" /> Follow Requests ({followRequests.length})
          </h2>
          <div className="space-y-2">
            {followRequests.map((req: any) => (
              <div key={req.id} className="flex items-center gap-3 p-2 rounded-xl bg-ink-800 border border-ink-700">
                <button onClick={() => navigate(`/profile/${req.follower?.username}`)}>
                  <Avatar src={req.follower?.avatar_url} alt={req.follower?.full_name || ''} size="sm" />
                </button>
                <div className="flex-1 min-w-0">
                  <button
                    onClick={() => navigate(`/profile/${req.follower?.username}`)}
                    className="font-semibold text-white text-sm hover:underline truncate block"
                  >
                    {req.follower?.full_name}
                  </button>
                  <p className="text-xs text-gray-500">@{req.follower?.username}</p>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => handleAcceptRequest(req.id)}
                    className="p-2 rounded-lg bg-zeal-500 text-ink-950 hover:bg-zeal-400 active:scale-95 transition-all"
                  >
                    <UserCheck className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeclineRequest(req.id)}
                    className="p-2 rounded-lg bg-ink-700 text-gray-400 hover:text-white hover:bg-ink-600 active:scale-95 transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Aura Badges */}
      {auraBadges.length > 0 && (
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-zeal-500" /> Aura
          </h2>
          <div className="flex flex-wrap gap-2">
            {auraBadges.map(badge => (
              <span key={badge} className="chip chip-active gap-1.5">
                <span>{AURA_EMOJIS[badge.toLowerCase()] || '✨'}</span>
                {badge}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Campus Rankings */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Campus Rankings</h2>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300 flex items-center gap-2">
              {RANK_ICONS.popular} Popular
            </span>
            <button onClick={() => navigate('/rankings')} className="text-sm font-semibold text-zeal-500 hover:text-zeal-400">
              #{ranks.popular || '—'} College
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300 flex items-center gap-2">
              {RANK_ICONS.smart} Smart
            </span>
            <button onClick={() => navigate('/rankings')} className="text-sm font-semibold text-zeal-500 hover:text-zeal-400">
              #{ranks.smart || '—'} College
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300 flex items-center gap-2">
              {RANK_ICONS.gamer} Gamer
            </span>
            <button onClick={() => navigate('/rankings')} className="text-sm font-semibold text-zeal-500 hover:text-zeal-400">
              #{ranks.gamer || '—'} College
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300 flex items-center gap-2">
              {RANK_ICONS.creator} Creator
            </span>
            <button onClick={() => navigate('/rankings')} className="text-sm font-semibold text-zeal-500 hover:text-zeal-400">
              #{ranks.creator || '—'} College
            </button>
          </div>
        </div>
      </div>

      {/* Skills */}
      {skills.length > 0 && (
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Skills</h2>
          <div className="flex flex-wrap gap-2">
            {skills.map(s => (
              <span key={s.id} className="chip">
                {s.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Projects Preview */}
      {projects.length > 0 && tab !== 'projects' && (
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
            <FolderOpen className="w-4 h-4" /> Projects
          </h2>
          <div className="space-y-2">
            {projects.slice(0, 2).map(p => (
              <div key={p.id} className="p-3 rounded-xl bg-ink-800 border border-ink-700">
                <p className="font-semibold text-white text-sm">{p.title}</p>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{p.description}</p>
                {p.technologies.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {p.technologies.slice(0, 4).map(t => (
                      <span key={t} className="px-2 py-0.5 rounded-full bg-ink-700 text-gray-400 text-xs">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Achievements Preview */}
      {achievements.length > 0 && tab !== 'achievements' && (
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" /> Achievements
          </h2>
          <div className="space-y-2">
            {achievements.slice(0, 2).map(a => (
              <div key={a.id} className="flex items-center gap-3 p-2 rounded-xl bg-ink-800 border border-ink-700">
                <div className="w-10 h-10 rounded-xl bg-zeal-500/10 flex items-center justify-center shrink-0">
                  <Trophy className="w-5 h-5 text-zeal-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white text-sm truncate">{a.title}</p>
                  <p className="text-xs text-gray-500 truncate">{a.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Building Section */}
      {(profile as any).business_links && (
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Building</h2>
          <p className="text-sm text-gray-300 mb-3">
            {typeof (profile as any).business_links === 'string'
              ? (profile as any).business_links
              : JSON.stringify((profile as any).business_links)}
          </p>
          <a
            href="https://founderenv.in"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-zeal-500 hover:text-zeal-400 transition-colors"
          >
            <ExternalLink className="w-4 h-4" /> View on Founder.env
          </a>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-ink-800 overflow-x-auto scrollbar-none">
        {tabs.map(t => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-zeal-500 text-zeal-500'
                  : 'border-transparent text-gray-500 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      {tabLoading ? (
        <SkeletonList count={3} />
      ) : tab === 'posts' ? (
        posts.length > 0 ? (
          <div className="space-y-3">
            {posts.map(p => (
              <PostCard key={p.id} post={p} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Heart className="w-7 h-7" />}
            title="No posts yet"
            description={isOwnProfile ? 'Share your first post with campus.' : "This student hasn't posted yet."}
          />
        )
      ) : tab === 'projects' ? (
        projects.length > 0 ? (
          <div className="space-y-3">
            {projects.map(p => (
              <div key={p.id} className="card p-4">
                <p className="font-semibold text-white">{p.title}</p>
                <p className="text-sm text-gray-400 mt-1">{p.description}</p>
                {p.technologies.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {p.technologies.map(t => (
                      <span key={t} className="chip text-xs">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex gap-3 mt-3 text-xs text-gray-500">
                  {p.project_url && (
                    <a href={p.project_url} target="_blank" rel="noreferrer" className="text-zeal-500 hover:underline">
                      Live
                    </a>
                  )}
                  {p.github_url && (
                    <a href={p.github_url} target="_blank" rel="noreferrer" className="text-zeal-500 hover:underline">
                      GitHub
                    </a>
                  )}
                  {p.looking_for_teammates && <span className="text-amber-400">Looking for teammates</span>}
                  <span className="ml-auto">❤️ {p.like_count}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<FolderOpen className="w-7 h-7" />}
            title="No projects"
            description={isOwnProfile ? 'Add your first project to showcase your work.' : 'No projects yet.'}
          />
        )
      ) : tab === 'achievements' ? (
        achievements.length > 0 ? (
          <div className="space-y-3">
            {achievements.map(a => (
              <div key={a.id} className="card p-4 flex gap-3">
                <div className="w-12 h-12 rounded-xl bg-zeal-500/10 flex items-center justify-center shrink-0">
                  <Trophy className="w-6 h-6 text-zeal-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white text-sm">{a.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{a.description}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-xs text-gray-600">{a.category}</span>
                    {a.achievement_date && <span className="text-xs text-gray-600">· {a.achievement_date}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Trophy className="w-7 h-7" />}
            title="No achievements"
            description={
              isOwnProfile
                ? 'Showcase your hackathon wins, certifications, and more.'
                : 'No achievements yet.'
            }
          />
        )
      ) : tab === 'saved' && isOwnProfile ? (
        savedPosts.length > 0 ? (
          <div className="space-y-3">
            {savedPosts.map(p => (
              <PostCard key={p.id} post={p} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Bookmark className="w-7 h-7" />}
            title="Nothing saved"
            description="Bookmark posts to find them here later. Only you can see this."
          />
        )
      ) : null}

      {/* Followers/Following List Sheet */}
      <Sheet open={!!listSheet} onClose={() => { setListSheet(null); setListItems([]) }} title={listSheet === 'requests' ? 'Follow Requests' : listSheet ? listSheet.charAt(0).toUpperCase() + listSheet.slice(1) : ''}>
        {listLoading ? (
          <SkeletonList count={4} />
        ) : listSheet === 'requests' ? (
          followRequests.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No pending requests</p>
          ) : (
            <div className="space-y-2">
              {followRequests.map((req: any) => (
                <div key={req.id} className="flex items-center gap-3 p-2 rounded-xl bg-ink-800 border border-ink-700">
                  <button onClick={() => { setListSheet(null); navigate(`/profile/${req.follower?.username}`) }}>
                    <Avatar src={req.follower?.avatar_url} alt={req.follower?.full_name || ''} size="sm" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-sm truncate">{req.follower?.full_name}</p>
                    <p className="text-xs text-gray-500">@{req.follower?.username}</p>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleAcceptRequest(req.id)}
                      className="p-2 rounded-lg bg-zeal-500 text-ink-950 hover:bg-zeal-400 active:scale-95 transition-all"
                    >
                      <UserCheck className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeclineRequest(req.id)}
                      className="p-2 rounded-lg bg-ink-700 text-gray-400 hover:text-white hover:bg-ink-600 active:scale-95 transition-all"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : listItems.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">No {listSheet} yet</p>
        ) : (
          <div className="space-y-2">
            {listItems.map((p: Profile) => (
              <div key={p.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-ink-800 transition-colors">
                <button
                  onClick={() => { setListSheet(null); navigate(`/profile/${p.username}`) }}
                  className="flex items-center gap-3 flex-1 min-w-0"
                >
                  <Avatar src={p.avatar_url} alt={p.full_name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-sm truncate">{p.full_name}</p>
                    <p className="text-xs text-gray-500">@{p.username}</p>
                  </div>
                </button>
                {isOwnProfile && listSheet === 'followers' && user && p.id !== user.id && (
                  <button
                    onClick={() => handleRemoveFollower(p.id)}
                    className="btn-ghost text-xs text-rose-400"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </Sheet>

      {/* More Menu (Report/Block) */}
      <Sheet open={!!moreMenu} onClose={() => { setMoreMenu(null); setReportReason(''); setBlockConfirm(false) }} title="More Options">
        {moreMenu === 'report' && (
          <div className="space-y-4">
            {blockConfirm ? (
              <>
                <p className="text-sm text-gray-300">
                  Are you sure you want to block <strong className="text-white">{profile.full_name}</strong>?
                  They won't be able to see your profile or interact with you.
                </p>
                <div className="flex gap-2">
                  <button onClick={handleBlock} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-medium text-sm hover:bg-red-600 transition-colors">
                    Block
                  </button>
                  <button
                    onClick={() => setBlockConfirm(false)}
                    className="flex-1 py-2.5 rounded-xl bg-ink-800 border border-ink-700 text-gray-300 font-medium text-sm hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <button
                  onClick={() => setReportReason('spam')}
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-colors ${
                    reportReason === 'spam' ? 'bg-zeal-500/10 text-zeal-400 border border-zeal-500/30' : 'bg-ink-800 border border-ink-700 text-gray-300 hover:text-white'
                  }`}
                >
                  Spam or fake content
                </button>
                <button
                  onClick={() => setReportReason('harassment')}
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-colors ${
                    reportReason === 'harassment' ? 'bg-zeal-500/10 text-zeal-400 border border-zeal-500/30' : 'bg-ink-800 border border-ink-700 text-gray-300 hover:text-white'
                  }`}
                >
                  Harassment or bullying
                </button>
                <button
                  onClick={() => setReportReason('inappropriate')}
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-colors ${
                    reportReason === 'inappropriate' ? 'bg-zeal-500/10 text-zeal-400 border border-zeal-500/30' : 'bg-ink-800 border border-ink-700 text-gray-300 hover:text-white'
                  }`}
                >
                  Inappropriate content
                </button>
                <button
                  onClick={() => setReportReason('other')}
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-colors ${
                    reportReason === 'other' ? 'bg-zeal-500/10 text-zeal-400 border border-zeal-500/30' : 'bg-ink-800 border border-ink-700 text-gray-300 hover:text-white'
                  }`}
                >
                  Other
                </button>
                {reportReason && (
                  <button
                    onClick={handleReport}
                    disabled={reportSubmitting}
                    className="w-full py-2.5 rounded-xl bg-zeal-500 text-white font-medium text-sm hover:bg-zeal-600 transition-colors disabled:opacity-50"
                  >
                    {reportSubmitting ? 'Submitting...' : 'Submit Report'}
                  </button>
                )}
                <div className="border-t border-ink-700 pt-4">
                  <button
                    onClick={() => setBlockConfirm(true)}
                    className="w-full text-left px-4 py-3 rounded-xl text-sm text-red-400 bg-ink-800 border border-ink-700 hover:bg-ink-750 transition-colors flex items-center gap-2"
                  >
                    <Ban className="w-4 h-4" /> Block {profile.full_name}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
        {moreMenu === 'block' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-300">
              Are you sure you want to block <strong className="text-white">{profile.full_name}</strong>?
            </p>
            <div className="flex gap-2">
              <button onClick={handleBlock} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-medium text-sm hover:bg-red-600 transition-colors">
                Block
              </button>
              <button
                onClick={() => setMoreMenu(null)}
                className="flex-1 py-2.5 rounded-xl bg-ink-800 border border-ink-700 text-gray-300 font-medium text-sm hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </Sheet>
    </div>
  )
}
