import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Settings as SettingsIcon, Share2, MoreHorizontal, Heart, FolderOpen,
  Trophy, Bookmark, UserPlus, UserCheck, X, MessageCircle, Flag, Ban,
  Sparkles, Plus, ShoppingBag, BookOpen, ExternalLink,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Avatar } from '@/components/Avatar'
import { PostCard } from '@/components/PostCard'
import { SkeletonProfile, SkeletonList } from '@/components/Skeleton'
import { EmptyState, ErrorState } from '@/components/States'
import { Sheet } from '@/components/Sheet'
import {
  fetchProfileByUsername, fetchProfilePosts, fetchProfileSkills, fetchSavedPosts,
  fetchIsFollowing, followUser, unfollowUser, fetchFollowers,
  fetchFollowing, fetchFollowRequests, acceptFollowRequest,
  declineFollowRequest, createOrGetConversation,
  blockUser, reportContent, fetchBranches, fetchUserRank,
  fetchMarketplace, fetchResources,
} from '@/lib/data'
import { formatNumber, yearLabel } from '@/lib/utils'
import type { Resource } from '@/lib/data'
import type { Profile as ProfileType, Post, Skill, Branch, MarketplaceListing } from '@/types'

type Tab = 'posts' | 'learn' | 'marketplace'
type ListSheet = 'followers' | 'following' | 'requests' | null

const RANK_ICONS = { popular: '👑', creator: '🔥' }

const CREATE_OPTIONS = [
  { label: 'Post', icon: '📝', path: '/create', identity: 'real' },
  { label: 'Marketplace', icon: '🛒', path: '/marketplace', identity: 'real' },
  { label: 'Lost Item', icon: '🔍', path: '/lost-found', identity: 'real' },
  { label: 'Found Item', icon: '✅', path: '/lost-found', identity: 'real' },
  { label: 'Project', icon: '🚀', path: '/projects', identity: 'real' },
]

export function Profile() {
  const { username } = useParams()
  const { profile: me, user } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<ProfileType | null>(null)
  const [branch, setBranch] = useState<Branch | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [tab, setTab] = useState<Tab>('posts')
  const [posts, setPosts] = useState<Post[]>([])
  const [savedPosts, setSavedPosts] = useState<Post[]>([])
  const [learnItems, setLearnItems] = useState<Resource[]>([])
  const [marketItems, setMarketItems] = useState<MarketplaceListing[]>([])
  const [skills, setSkills] = useState<Skill[]>([])
  const [followStatus, setFollowStatus] = useState<'none' | 'following' | 'requested'>('none')
  const [followLoading, setFollowLoading] = useState(false)
  const [tabLoading, setTabLoading] = useState(false)
  const [listSheet, setListSheet] = useState<ListSheet>(null)
  const [listItems, setListItems] = useState<ProfileType[]>([])
  const [listLoading, setListLoading] = useState(false)
  const [followRequests, setFollowRequests] = useState<any[]>([])
  const [moreMenu, setMoreMenu] = useState<'report' | 'block' | null>(null)
  const [reportReason, setReportReason] = useState('')
  const [reportSubmitting, setReportSubmitting] = useState(false)
  const [blockConfirm, setBlockConfirm] = useState(false)
  const [copied, setCopied] = useState(false)
  const [ranks, setRanks] = useState<Record<string, number>>({ popular: 0, creator: 0 })
  const [createMenuOpen, setCreateMenuOpen] = useState(false)

  const isOwnProfile = !username || username === 'me' || (me && username === me.username)

  useEffect(() => {
    setLoading(true); setError(false)
    if (isOwnProfile && me) { setProfile(me); setLoading(false) }
    else if (username) {
      fetchProfileByUsername(username).then(p => { if (!p) { setError(true); return }; setProfile(p) })
        .catch(() => setError(true)).finally(() => setLoading(false))
    } else { setLoading(false) }
  }, [username, me, isOwnProfile])

  useEffect(() => {
    if (profile?.branch_id) {
      fetchBranches().then(branches => setBranch(branches.find(br => br.id === profile.branch_id) || null)).catch(() => {})
    }
  }, [profile?.branch_id])

  useEffect(() => {
    if (!profile) return
    const pid = profile.id
    setTabLoading(true)
    Promise.all([
      fetchProfilePosts(pid), fetchProfileSkills(pid),
    ]).then(([p, s]) => { setPosts(p); setSkills(s) })
      .catch(() => {}).finally(() => setTabLoading(false))
    if (isOwnProfile) {
      fetchSavedPosts(pid).then(setSavedPosts).catch(() => {})
      fetchFollowRequests(pid).then(setFollowRequests).catch(() => {})
    }
    if (!isOwnProfile && user) {
      fetchIsFollowing(user.id, pid).then(setFollowStatus).catch(() => {})
    }
  }, [profile, isOwnProfile, user])

  useEffect(() => {
    if (!profile) return
    const pid = profile.id
    if (tab === 'learn') {
      fetchResources({}).then(items => setLearnItems(items.filter(i => i.uploader_id === pid))).catch(() => {})
    } else if (tab === 'marketplace') {
      fetchMarketplace().then(items => setMarketItems(items.filter(i => i.seller_id === pid))).catch(() => {})
    }
  }, [tab, profile])

  useEffect(() => {
    if (!profile) return
    const uid = profile.id
    Promise.all([
      fetchUserRank(uid, 'popular'), fetchUserRank(uid, 'creator'),
    ]).then(([p, c]) => setRanks({ popular: p, creator: c })).catch(() => {})
  }, [profile])

  const handleFollow = async () => {
    if (!user || !profile) return
    setFollowLoading(true)
    try {
      if (followStatus === 'following' || followStatus === 'requested') {
        await unfollowUser(user.id, profile.id); setFollowStatus('none')
      } else {
        const status = await followUser(user.id, profile.id, profile.is_private)
        setFollowStatus(status as 'following' | 'requested')
      }
    } finally { setFollowLoading(false) }
  }

  const handleMessage = async () => {
    if (!user || !profile) return
    try { await createOrGetConversation(user.id, profile.id); navigate(`/messages?with=${profile.id}`) } catch {}
  }

  const openList = async (type: ListSheet) => {
    if (!profile) return
    setListSheet(type); setListLoading(true)
    try {
      if (type === 'followers') { const items = await fetchFollowers(profile.id); setListItems(items) }
      else if (type === 'following') { const items = await fetchFollowing(profile.id); setListItems(items) }
    } catch {} finally { setListLoading(false) }
  }

  const handleAcceptRequest = async (rid: string) => {
    try { await acceptFollowRequest(rid); setFollowRequests(prev => prev.filter((r: any) => r.id !== rid)); if (profile) setProfile({ ...profile, follower_count: profile.follower_count + 1 }) } catch {}
  }
  const handleDeclineRequest = async (rid: string) => {
    try { await declineFollowRequest(rid); setFollowRequests(prev => prev.filter((r: any) => r.id !== rid)) } catch {}
  }

  const handleReport = async () => {
    if (!user || !profile || !reportReason.trim()) return
    setReportSubmitting(true)
    try { await reportContent(user.id, 'profile', profile.id, reportReason.trim()); setMoreMenu(null); setReportReason('') } catch {} finally { setReportSubmitting(false) }
  }
  const handleBlock = async () => {
    if (!user || !profile) return
    try { await blockUser(user.id, profile.id); setMoreMenu(null); setBlockConfirm(false) } catch {}
  }
  const handleShare = async () => {
    const url = `${window.location.origin}/profile/${profile?.username}`
    if (navigator.share) { try { await navigator.share({ title: `${profile?.full_name} on InsideZeal`, url }) } catch {} }
    else { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000) }
  }

  if (loading) return <SkeletonProfile />
  if (error || !profile) return <ErrorState title="Profile not found" description="This student may not exist." onRetry={() => navigate('/home')} />

  return (
    <div className="space-y-4">
      {/* Profile Header */}
      <div className="card p-5">
        <div className="flex items-start gap-4">
          <Avatar src={profile.avatar_url} alt={profile.full_name} size="xl" ring />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-display font-bold text-white truncate">{profile.full_name}</h1>
              {isOwnProfile && (
                <div className="flex items-center gap-1">
                  <button onClick={() => navigate('/settings')} className="p-1 rounded-lg hover:bg-ink-800 transition-colors">
                    <SettingsIcon className="w-4 h-4 text-gray-400" />
                  </button>
                  <button onClick={() => setCreateMenuOpen(true)} className="p-1 rounded-lg hover:bg-ink-800 transition-colors">
                    <Plus className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              )}
            </div>
            <p className="text-gray-500 text-sm">@{profile.username}</p>
            <div className="flex items-center gap-1.5 mt-0.5 text-xs text-gray-500">
              {branch && <span>{branch.name}</span>}
              {profile.show_year && branch && <span>·</span>}
              {profile.show_year && <span>{yearLabel(profile.year)}</span>}
            </div>
            {profile.bio && <p className="text-sm text-gray-300 mt-2 whitespace-pre-wrap line-clamp-3">{profile.bio}</p>}
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-6 mt-4">
          <button onClick={() => openList('followers')} className="text-left group">
            <p className="text-base font-bold text-white group-hover:text-zeal-400">{formatNumber(profile.follower_count)}</p>
            <p className="text-[11px] text-gray-500">Followers</p>
          </button>
          <button onClick={() => openList('following')} className="text-left group">
            <p className="text-base font-bold text-white group-hover:text-zeal-400">{formatNumber(profile.following_count)}</p>
            <p className="text-[11px] text-gray-500">Following</p>
          </button>
          <div>
            <p className="text-base font-bold text-white">{profile.post_count}</p>
            <p className="text-[11px] text-gray-500">Posts</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-4">
          {isOwnProfile ? (
            <>
              <button onClick={() => navigate('/edit-profile')} className="btn-primary text-sm flex-1 flex items-center justify-center gap-2">
                <SettingsIcon className="w-4 h-4" /> Edit Profile
              </button>
              <button onClick={handleShare} className="btn-secondary text-sm flex items-center gap-2">
                <Share2 className="w-4 h-4" /> {copied ? 'Copied!' : 'Share'}
              </button>
            </>
          ) : (
            <>
              <button onClick={handleFollow} disabled={followLoading}
                className={`${followStatus !== 'none' ? 'btn-secondary' : 'btn-primary'} text-sm flex-1`}>
                {followStatus === 'following' ? 'Following' : followStatus === 'requested' ? 'Requested' : profile.is_private ? 'Request Follow' : 'Follow'}
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

      {/* Follow Requests */}
      {isOwnProfile && followRequests.length > 0 && (
        <div className="card p-4">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-2">
            <UserPlus className="w-3.5 h-3.5" /> Follow Requests ({followRequests.length})
          </h2>
          <div className="space-y-2">
            {followRequests.map((req: any) => (
              <div key={req.id} className="flex items-center gap-2.5 p-2 rounded-xl bg-ink-800 border border-ink-700">
                <button onClick={() => navigate(`/profile/${req.follower?.username}`)}>
                  <Avatar src={req.follower?.avatar_url} alt={req.follower?.full_name || ''} size="sm" />
                </button>
                <div className="flex-1 min-w-0">
                  <button onClick={() => navigate(`/profile/${req.follower?.username}`)} className="font-semibold text-white text-sm hover:underline truncate block">{req.follower?.full_name}</button>
                  <p className="text-[10px] text-gray-500">@{req.follower?.username}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleAcceptRequest(req.id)} className="p-1.5 rounded-lg bg-zeal-500 text-ink-950"><UserCheck className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleDeclineRequest(req.id)} className="p-1.5 rounded-lg bg-ink-700 text-gray-400"><X className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rankings */}
      {profile.show_rankings && (
        <div className="card p-4">
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(RANK_ICONS).map(([type, emoji]) => (
              <button key={type} onClick={() => navigate('/rankings')}
                className="flex flex-col items-center gap-0.5 p-2 rounded-xl hover:bg-ink-800 transition-colors">
                <span className="text-base">{emoji}</span>
                <span className="text-[10px] font-medium text-gray-400 capitalize">{type}</span>
                <span className="text-xs font-bold text-zeal-400">#{ranks[type] > 0 ? ranks[type] : '—'}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Anonymous Identity (own profile) */}
      {isOwnProfile && (
        <button
          onClick={() => navigate('/anon')}
          className="w-full card p-4 flex items-center gap-3 hover:bg-ink-800 transition-colors text-left"
        >
          <div className="w-11 h-11 rounded-2xl bg-ink-800 flex items-center justify-center text-xl shrink-0">🎭</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">Anonymous ID</p>
            <p className="text-xs text-gray-500">Hidden identity, confessions & Zeal Match</p>
          </div>
          <ExternalLink className="w-4 h-4 text-gray-600" />
        </button>
      )}

      {/* Profile Tabs */}
      <div className="flex gap-1 border-b border-ink-800">
        {([
          { id: 'posts' as Tab, label: 'Posts', icon: Heart },
          { id: 'learn' as Tab, label: 'Learn', icon: BookOpen },
          { id: 'marketplace' as Tab, label: 'Marketplace', icon: ShoppingBag },
        ]).map(t => {
          const Icon = t.icon
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                tab === t.id ? 'border-zeal-500 text-zeal-500' : 'border-transparent text-gray-500 hover:text-white'
              }`}>
              <Icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      {tabLoading ? <SkeletonList count={3} /> : (
        <>
          {tab === 'posts' && (
            posts.length > 0 ? (
              <div className="space-y-3">{posts.map(p => <PostCard key={p.id} post={p} />)}</div>
            ) : (
              <EmptyState icon={<Heart className="w-7 h-7" />} title="No posts yet"
                description={isOwnProfile ? 'Share your first post.' : "This student hasn't posted yet."} />
            )
          )}
          {tab === 'learn' && (
            learnItems.length > 0 ? (
              <div className="space-y-2">
                {learnItems.map(r => (
                  <div key={r.id} className="card p-3">
                    <h3 className="text-sm font-semibold text-white">{r.title}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">{r.subject} · {r.resource_type}</p>
                    {r.external_url && <a href={r.external_url} target="_blank" rel="noopener noreferrer" className="text-xs text-zeal-400 hover:underline mt-1 inline-block">Open ↗</a>}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={<BookOpen className="w-7 h-7" />} title="No resources" description="No resources shared yet." />
            )
          )}
          {tab === 'marketplace' && (
            marketItems.length > 0 ? (
              <div className="space-y-2">
                {marketItems.map(m => (
                  <div key={m.id} className="card p-3 flex items-center gap-3">
                    {m.image_url ? <img src={m.image_url} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0" />
                      : <div className="w-12 h-12 rounded-xl bg-ink-700 flex items-center justify-center shrink-0"><ShoppingBag className="w-5 h-5 text-gray-600" /></div>}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-white truncate">{m.title}</h3>
                      <p className="text-xs text-zeal-400 font-bold">₹{m.price}</p>
                    </div>
                    {m.is_sold && <span className="text-[10px] text-red-400">Sold</span>}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={<ShoppingBag className="w-7 h-7" />} title="No listings" description="No marketplace items yet." />
            )
          )}
        </>
      )}

      {/* Create Menu Sheet */}
      <Sheet open={createMenuOpen} onClose={() => setCreateMenuOpen(false)} title="Create">
        <div className="space-y-1">
          {CREATE_OPTIONS.map(opt => (
            <button
              key={opt.label}
              onClick={() => { setCreateMenuOpen(false); navigate(opt.path) }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-300 hover:bg-ink-800 hover:text-white transition-colors text-left"
            >
              <span className="text-base">{opt.icon}</span>
              <div className="flex-1">
                <p>{opt.label}</p>
                <p className="text-[10px] text-gray-600">{opt.identity === 'hidden' ? 'Anonymous' : 'Real identity'}</p>
              </div>
            </button>
          ))}
        </div>
      </Sheet>

      {/* Followers/Following Sheet */}
      <Sheet open={!!listSheet} onClose={() => { setListSheet(null); setListItems([]) }}
        title={listSheet ? listSheet.charAt(0).toUpperCase() + listSheet.slice(1) : ''}>
        {listLoading ? <SkeletonList count={4} /> : listItems.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">No {listSheet} yet</p>
        ) : (
          <div className="space-y-2">
            {listItems.map((p: ProfileType) => (
              <div key={p.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-ink-800 transition-colors">
                <button onClick={() => { setListSheet(null); navigate(`/profile/${p.username}`) }} className="flex items-center gap-3 flex-1 min-w-0">
                  <Avatar src={p.avatar_url} alt={p.full_name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-sm truncate">{p.full_name}</p>
                    <p className="text-xs text-gray-500">@{p.username}</p>
                  </div>
                </button>
              </div>
            ))}
          </div>
        )}
      </Sheet>

      {/* More Menu */}
      <Sheet open={!!moreMenu} onClose={() => { setMoreMenu(null); setReportReason(''); setBlockConfirm(false) }} title="More Options">
        {moreMenu === 'report' && (
          <div className="space-y-3">
            {blockConfirm ? (
              <>
                <p className="text-sm text-gray-300">Block <strong className="text-white">{profile.full_name}</strong>?</p>
                <div className="flex gap-2">
                  <button onClick={handleBlock} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-medium text-sm">Block</button>
                  <button onClick={() => setBlockConfirm(false)} className="flex-1 py-2.5 rounded-xl bg-ink-800 border border-ink-700 text-gray-300 font-medium text-sm">Cancel</button>
                </div>
              </>
            ) : (
              <>
                {['spam', 'harassment', 'inappropriate', 'other'].map(reason => (
                  <button key={reason} onClick={() => setReportReason(reason)}
                    className={`w-full text-left px-4 py-3 rounded-xl text-sm capitalize transition-colors ${
                      reportReason === reason ? 'bg-zeal-500/10 text-zeal-400 border border-zeal-500/30' : 'bg-ink-800 border border-ink-700 text-gray-300 hover:text-white'
                    }`}>{reason}</button>
                ))}
                {reportReason && (
                  <button onClick={handleReport} disabled={reportSubmitting}
                    className="w-full py-2.5 rounded-xl bg-zeal-500 text-white font-medium text-sm disabled:opacity-50">
                    {reportSubmitting ? 'Submitting...' : 'Submit Report'}
                  </button>
                )}
                <div className="border-t border-ink-700 pt-3">
                  <button onClick={() => setBlockConfirm(true)}
                    className="w-full text-left px-4 py-3 rounded-xl text-sm text-red-400 bg-ink-800 border border-ink-700 flex items-center gap-2">
                    <Ban className="w-4 h-4" /> Block {profile.full_name}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </Sheet>
    </div>
  )
}
