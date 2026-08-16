import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, Trophy, Bell, Menu, X, Flame, Calendar, ShoppingBag,
  MapPin, Users, Tag, Clock, Heart as HeartIcon, Bookmark, Eye,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Avatar } from '@/components/Avatar'
import { PostCard } from '@/components/PostCard'
import { SkeletonList } from '@/components/Skeleton'
import { EmptyState, ErrorState } from '@/components/States'
import { Sheet } from '@/components/Sheet'
import {
  fetchFeedPosts, fetchEvents, fetchLikedPostIds, fetchSavedPostIds,
  fetchBranches, fetchRankings, searchAll, fetchMarketplace, fetchLostFound,
} from '@/lib/data'
import { formatNumber, timeAgo } from '@/lib/utils'
import type { Post, EventItem, Branch, Profile, MarketplaceListing, LostFoundItem } from '@/types'

type HomeTab = 'feed' | 'events' | 'marketplace' | 'lost-found'

const HOME_TABS: { id: HomeTab; label: string }[] = [
  { id: 'feed', label: 'Feed' },
  { id: 'events', label: 'Events' },
  { id: 'marketplace', label: 'Marketplace' },
  { id: 'lost-found', label: 'Lost & Found' },
]

const RANK_LABELS: Record<string, { emoji: string; label: string }> = {
  popular: { emoji: '👑', label: 'Popular' },
  creator: { emoji: '🔥', label: 'Creator' },
}

function formatEventTime(timeStr: string): string {
  if (!timeStr) return ''
  const [h, m] = timeStr.split(':')
  const hour = parseInt(h || '0')
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const h12 = hour % 12 || 12
  return `${h12}:${m || '00'} ${ampm}`
}

function formatPrice(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
}

export function Home() {
  const { profile, user } = useAuth()
  const navigate = useNavigate()

  const [posts, setPosts] = useState<Post[]>([])
  const [events, setEvents] = useState<EventItem[]>([])
  const [marketplace, setMarketplace] = useState<MarketplaceListing[]>([])
  const [lostFound, setLostFound] = useState<LostFoundItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [activeTab, setActiveTab] = useState<HomeTab>('feed')
  const [branches, setBranches] = useState<Branch[]>([])
  const [activeBranch, setActiveBranch] = useState<string | null>('campus') // 'campus' | dept id
  const [topRankers, setTopRankers] = useState<{ profile: Profile; category: string; emoji: string; rank: number }[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any>(null)
  const [searching, setSearching] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    Promise.all([
      fetchFeedPosts(0, 10),
      fetchEvents('upcoming'),
      user ? fetchLikedPostIds(user.id) : Promise.resolve(new Set<string>()),
      user ? fetchSavedPostIds(user.id) : Promise.resolve(new Set<string>()),
      fetchBranches().catch(() => []),
      Promise.all([
        fetchRankings('popular', undefined, 1).then(r => r[0] ? { profile: r[0], category: 'Popular', emoji: '👑', rank: 1 } : null).catch(() => null),
        fetchRankings('creator', undefined, 1).then(r => r[0] ? { profile: r[0], category: 'Creator', emoji: '🔥', rank: 1 } : null).catch(() => null),
      ]).then(results => results.filter(Boolean)),
    ]).then(([p, e, likedIds, savedIds, br, rankers]) => {
      setPosts(p.map(post => ({
        ...post,
        is_liked: likedIds.has(post.id),
        is_saved: savedIds.has(post.id),
      })))
      setEvents(e)
      setBranches(br)
      setTopRankers(rankers as any[])
    }).catch(() => setError(true)).finally(() => setLoading(false))
  }, [user])

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults(null); return }
    setSearching(true)
    const timer = setTimeout(async () => {
      try {
        const [core, ev, mp, lf] = await Promise.all([
          searchAll(searchQuery),
          fetchEvents().catch(() => []),
          fetchMarketplace().catch(() => []),
          fetchLostFound().catch(() => []),
        ])
        const q = searchQuery.toLowerCase()
        setSearchResults({
          users: core.users.slice(0, 5),
          posts: core.posts.slice(0, 5),
          events: (ev as EventItem[]).filter(e => e.title?.toLowerCase().includes(q)).slice(0, 3),
          marketplace: (mp as MarketplaceListing[]).filter(m => m.title?.toLowerCase().includes(q)).slice(0, 3),
        })
      } catch {} finally { setSearching(false) }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const loadTabData = useCallback(async (tab: HomeTab) => {
    if (tab === 'events') {
      try { const e = await fetchEvents('upcoming'); setEvents(e) } catch {}
    } else if (tab === 'marketplace') {
      try { const m = await fetchMarketplace(); setMarketplace(m) } catch {}
    } else if (tab === 'lost-found') {
      try { const l = await fetchLostFound(); setLostFound(l) } catch {}
    }
  }, [])

  useEffect(() => { loadTabData(activeTab) }, [activeTab, loadTabData])

  const filteredPosts = activeBranch === 'campus'
    ? posts
    : activeBranch
      ? posts.filter(p => p.branch_id === activeBranch)
      : posts

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-display font-bold text-white">InsideZeal</h1>
        <div className="flex items-center gap-1">
          <button onClick={() => navigate('/rankings')} className="p-2 rounded-xl hover:bg-ink-800 transition-colors">
            <Trophy className="w-5 h-5 text-gray-400" />
          </button>
          <button onClick={() => navigate('/notifications')} className="p-2 rounded-xl hover:bg-ink-800 transition-colors">
            <Bell className="w-5 h-5 text-gray-400" />
          </button>
          <button onClick={() => setMenuOpen(true)} className="p-2 rounded-xl hover:bg-ink-800 transition-colors">
            <Menu className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          className="input pl-10 pr-10 text-sm"
          placeholder="Search students, departments, posts, resources..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button onClick={() => { setSearchQuery(''); setSearchResults(null) }} className="absolute right-3.5 top-1/2 -translate-y-1/2">
            <X className="w-4 h-4 text-gray-500 hover:text-white" />
          </button>
        )}
      </div>

      {/* Search Results */}
      {searchQuery && searchResults && (
        <div className="space-y-4">
          {searching ? <SkeletonList count={2} /> : (
            <>
              {searchResults.users?.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-2">Students</p>
                  {searchResults.users.map((u: Profile) => (
                    <button key={u.id} onClick={() => { setSearchQuery(''); navigate(`/profile/${u.username}`) }}
                      className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-ink-800 transition-colors text-left">
                      <Avatar src={u.avatar_url} alt={u.full_name} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{u.full_name}</p>
                        <p className="text-xs text-gray-500">@{u.username}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {searchResults.events?.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-2">Events</p>
                  {searchResults.events.map((e: EventItem) => (
                    <button key={e.id} onClick={() => { setSearchQuery(''); navigate(`/events/${e.id}`) }}
                      className="w-full p-2.5 rounded-xl hover:bg-ink-800 transition-colors text-left">
                      <p className="text-sm font-semibold text-white">{e.title}</p>
                      <p className="text-xs text-gray-500">{e.venue || 'TBA'}</p>
                    </button>
                  ))}
                </div>
              )}
              {searchResults.marketplace?.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-2">Marketplace</p>
                  {searchResults.marketplace.map((m: MarketplaceListing) => (
                    <button key={m.id} onClick={() => { setSearchQuery(''); navigate('/marketplace') }}
                      className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-ink-800 transition-colors text-left">
                      <Tag className="w-4 h-4 text-gray-500" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{m.title}</p>
                        <p className="text-xs text-zeal-400">{formatPrice(m.price)}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {searchResults.users?.length === 0 && searchResults.events?.length === 0 && searchResults.marketplace?.length === 0 && (
                <EmptyState icon={<Search className="w-7 h-7" />} title="Nothing found" description="Try a different search." />
              )}
            </>
          )}
        </div>
      )}

      {/* Department Chips */}
      {!searchQuery && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 lg:mx-0 lg:px-0 scrollbar-none">
          <button
            onClick={() => setActiveBranch('campus')}
            className={`chip shrink-0 ${activeBranch === 'campus' ? 'chip-active' : ''}`}
          >
            Campus
          </button>
          {profile?.branch_id && (
            <button
              onClick={() => setActiveBranch(profile.branch_id)}
              className={`chip shrink-0 ${activeBranch === profile.branch_id ? 'chip-active' : ''}`}
            >
              {branches.find(b => b.id === profile.branch_id)?.short_name || 'My Department'}
            </button>
          )}
        </div>
      )}

      {/* Top Rankers Row */}
      {!searchQuery && topRankers.length > 0 && (
        <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4 lg:mx-0 lg:px-0 scrollbar-none">
          {topRankers.map(r => (
            <button
              key={`${r.category}-${r.profile.id}`}
              onClick={() => navigate(`/profile/${r.profile.username}`)}
              className="shrink-0 flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-ink-850 border border-ink-700 hover:border-ink-600 transition-all w-[80px]"
            >
              <div className="w-14 h-14 rounded-2xl overflow-hidden bg-ink-700 border-2 border-zeal-500/30">
                {r.profile.avatar_url ? (
                  <img src={r.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-lg text-gray-500">👤</div>
                )}
              </div>
              <p className="text-[10px] font-medium text-white truncate w-full text-center">{r.profile.full_name?.split(' ')[0]}</p>
              <span className="text-[9px] bg-zeal-500/15 text-zeal-400 px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap">{r.emoji} #{r.rank} {r.category}</span>
            </button>
          ))}
        </div>
      )}

      {/* Home Tabs */}
      {!searchQuery && (
        <div className="flex gap-1 border-b border-ink-800 overflow-x-auto scrollbar-none">
          {HOME_TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === t.id
                  ? 'border-zeal-500 text-zeal-500'
                  : 'border-transparent text-gray-500 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Tab Content */}
      {!searchQuery && (
        <>
          {activeTab === 'feed' && (
            loading ? <SkeletonList count={4} /> : error ? <ErrorState onRetry={() => window.location.reload()} /> :
            filteredPosts.length === 0 ? (
              <EmptyState icon={<Flame className="w-7 h-7" />} title="No posts yet" description="Be the first to post on InsideZeal." />
            ) : (
              <div className="space-y-3">
                {filteredPosts.map(p => <PostCard key={p.id} post={p} />)}
              </div>
            )
          )}

          {activeTab === 'events' && (
            events.length === 0 ? (
              <EmptyState icon={<Calendar className="w-7 h-7" />} title="No events" description="No upcoming events right now." />
            ) : (
              <div className="space-y-3">
                <div className="flex justify-end">
                  <button onClick={() => navigate('/events')} className="text-xs text-zeal-400 hover:text-zeal-300 font-medium">View All Events →</button>
                </div>
                {events.map(ev => {
                  const dept = ev.organizing_department || ev.organizer || ''
                  return (
                    <button key={ev.id} onClick={() => navigate(`/events/${ev.id}`)}
                      className="w-full text-left card overflow-hidden hover:bg-ink-800 transition-colors">
                      {(ev.banner_url || ev.poster_url) ? (
                        <img src={ev.banner_url || ev.poster_url!} alt={ev.title}
                          className="w-full h-32 object-cover" loading="lazy" />
                      ) : (
                        <div className="w-full h-20 bg-gradient-to-br from-zeal-500/20 to-ink-800 flex items-center justify-center">
                          <Calendar className="w-8 h-8 text-zeal-500/40" />
                        </div>
                      )}
                      <div className="p-3 space-y-1">
                        <div>
                          <h3 className="font-semibold text-white text-sm">{ev.title}</h3>
                          {dept && <p className="text-[11px] text-zeal-400 mt-0.5">{dept}</p>}
                        </div>
                        {ev.description && <p className="text-xs text-gray-400 line-clamp-2">{ev.description}</p>}
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(ev.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                          {ev.start_time && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatEventTime(ev.start_time)}</span>}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <HeartIcon className="w-3 h-3" /> {formatNumber(ev.interested_count)} interested
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )
          )}

          {activeTab === 'marketplace' && (
            marketplace.length === 0 ? (
              <EmptyState icon={<ShoppingBag className="w-7 h-7" />} title="No listings" description="No marketplace items yet." />
            ) : (
              <div className="space-y-3">
                {marketplace.slice(0, 10).map(m => (
                  <button key={m.id} onClick={() => navigate('/marketplace')}
                    className="w-full card p-4 text-left hover:bg-ink-800 transition-colors">
                    <div className="flex items-start gap-3">
                      {m.image_url ? (
                        <img src={m.image_url} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0" />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-ink-700 flex items-center justify-center shrink-0"><Tag className="w-5 h-5 text-gray-600" /></div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white text-sm truncate">{m.title}</p>
                        <p className="text-zeal-400 text-xs font-bold mt-0.5">{formatPrice(m.price)}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">{m.seller?.full_name}</p>
                      </div>
                      {m.is_sold && <span className="text-xs text-red-400 shrink-0">Sold</span>}
                    </div>
                  </button>
                ))}
              </div>
            )
          )}

          {activeTab === 'lost-found' && (
            lostFound.length === 0 ? (
              <EmptyState icon={<MapPin className="w-7 h-7" />} title="No items" description="No lost or found items yet." />
            ) : (
              <div className="space-y-3">
                {lostFound.slice(0, 10).map(item => (
                  <button key={item.id} onClick={() => navigate('/lost-found')}
                    className="w-full card p-4 text-left hover:bg-ink-800 transition-colors">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.type === 'lost' ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
                        {item.type === 'lost' ? 'Lost' : 'Found'}
                      </span>
                      <h3 className="font-semibold text-white text-sm truncate">{item.item_name}</h3>
                      {item.is_resolved && <span className="text-[10px] text-zeal-400">Resolved</span>}
                    </div>
                    {item.description && <p className="text-xs text-gray-400 line-clamp-1">{item.description}</p>}
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                      {item.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {item.location}</span>}
                      <span>{item.item_date ? timeAgo(item.item_date) : ''}</span>
                    </div>
                  </button>
                ))}
              </div>
            )
          )}
        </>
      )}

      {/* Secondary Menu Sheet */}
      <Sheet open={menuOpen} onClose={() => setMenuOpen(false)} title="Menu">
        <div className="space-y-1">
          {[
            { label: 'Projects', path: '/projects', icon: '🚀' },
            { label: 'Clubs', path: '/clubs', icon: '🎯' },
            { label: 'Smart League', path: '/smart', icon: '🧠' },
            { label: 'Games', path: '/games', icon: '🎮' },
            { label: 'Rankings', path: '/rankings', icon: '🏆' },
            { label: 'Builders', path: '/builders', icon: '🔧' },
            { label: 'Notifications', path: '/notifications', icon: '🔔' },
            { label: 'Settings', path: '/settings', icon: '⚙️' },
          ].map(item => (
            <button
              key={item.path}
              onClick={() => { setMenuOpen(false); navigate(item.path) }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-300 hover:bg-ink-800 hover:text-white transition-colors text-left"
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </button>
          ))}
          <div className="border-t border-ink-700 my-2" />
          <button
            onClick={() => { setMenuOpen(false); navigate('/settings') }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors text-left"
          >
            <span>🚪</span> Logout
          </button>
        </div>
      </Sheet>
    </div>
  )
}
