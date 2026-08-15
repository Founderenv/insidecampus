import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  X,
  Users,
  FileText,
  Rocket,
  Building2,
  Calendar,
  ShoppingBag,
  TrendingUp,
  Tag,
  MapPin,
  Clock,
  Flame,
} from 'lucide-react'
import { Avatar } from '@/components/Avatar'
import { SkeletonList } from '@/components/Skeleton'
import { EmptyState } from '@/components/States'
import {
  fetchBranches,
  searchAll,
  fetchEvents,
  fetchMarketplace,
  fetchBuilders,
  fetchProjects,
  fetchGossip,
} from '@/lib/data'
import { formatNumber, timeAgo } from '@/lib/utils'
import type { Branch, Profile, Post, Project, Club, EventItem, MarketplaceListing, Builder } from '@/types'

interface SearchResults {
  users: Profile[]
  posts: Post[]
  projects: Project[]
  clubs: Club[]
  events: EventItem[]
  marketplace: MarketplaceListing[]
  builders: Builder[]
}

export function Explore() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResults | null>(null)
  const [loading, setLoading] = useState(false)
  const [branches, setBranches] = useState<Branch[]>([])
  const [activeBranch, setActiveBranch] = useState<string | null>(null)
  const [recentSearches, setRecentSearches] = useState<string[]>([])

  const [trendingProjects, setTrendingProjects] = useState<Project[]>([])
  const [trendingEvents, setTrendingEvents] = useState<EventItem[]>([])
  const [trendingMarketplace, setTrendingMarketplace] = useState<MarketplaceListing[]>([])
  const [trendingBuilders, setTrendingBuilders] = useState<Builder[]>([])
  const [trendingGossip, setTrendingGossip] = useState<any[]>([])
  const [trendingLoading, setTrendingLoading] = useState(true)

  useEffect(() => {
    fetchBranches().then(setBranches).catch(() => {})
    const stored = localStorage.getItem('iz_recent_searches')
    if (stored) setRecentSearches(JSON.parse(stored))
  }, [])

  useEffect(() => {
    if (!query.trim()) {
      setTrendingLoading(true)
      Promise.all([
        fetchProjects(5).catch(() => []),
        fetchEvents('upcoming').catch(() => []),
        fetchMarketplace().catch(() => []),
        fetchBuilders().catch(() => []),
        fetchGossip('all', 'trending', 5).catch(() => []),
      ])
        .then(([projects, events, marketplace, builders, gossip]) => {
          setTrendingProjects(projects.slice(0, 5))
          setTrendingEvents(events.slice(0, 5))
          setTrendingMarketplace(marketplace.slice(0, 5))
          setTrendingBuilders(builders.slice(0, 5))
          setTrendingGossip(gossip.slice(0, 3))
        })
        .catch(() => {})
        .finally(() => setTrendingLoading(false))
    }
  }, [])

  const doSearch = useCallback(
    async (q: string) => {
      if (!q.trim()) {
        setResults(null)
        return
      }
      setLoading(true)
      try {
        const [core, events, marketplace, builders] = await Promise.all([
          searchAll(q),
          fetchEvents().catch(() => []),
          fetchMarketplace().catch(() => []),
          fetchBuilders().catch(() => []),
        ])
        const lowerQ = q.toLowerCase()
        setResults({
          users: core.users,
          posts: core.posts,
          projects: core.projects,
          clubs: core.clubs,
          events: (events as EventItem[]).filter(
            e => e.title?.toLowerCase().includes(lowerQ) || e.description?.toLowerCase().includes(lowerQ) || e.venue?.toLowerCase().includes(lowerQ)
          ),
          marketplace: (marketplace as MarketplaceListing[]).filter(
            m => m.title?.toLowerCase().includes(lowerQ) || m.description?.toLowerCase().includes(lowerQ)
          ),
          builders: (builders as Builder[]).filter(
            b => b.name?.toLowerCase().includes(lowerQ) || b.description?.toLowerCase().includes(lowerQ)
          ),
        })
        const updated = [q, ...recentSearches.filter(s => s !== q)].slice(0, 5)
        setRecentSearches(updated)
        localStorage.setItem('iz_recent_searches', JSON.stringify(updated))
      } catch {
        setResults({ users: [], posts: [], projects: [], clubs: [], events: [], marketplace: [], builders: [] })
      } finally {
        setLoading(false)
      }
    },
    [recentSearches]
  )

  useEffect(() => {
    const timer = setTimeout(() => doSearch(query), 300)
    return () => clearTimeout(timer)
  }, [query, doSearch])

  const hasResults =
    results &&
    (results.users.length > 0 ||
      results.posts.length > 0 ||
      results.projects.length > 0 ||
      results.clubs.length > 0 ||
      results.events.length > 0 ||
      results.marketplace.length > 0 ||
      results.builders.length > 0)

  const formatPrice = (n: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  const filteredBranches = activeBranch
    ? branches.filter(b => b.id === activeBranch)
    : branches

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-display font-bold text-white mb-1">Discover InsideZeal</h1>
        <p className="text-gray-500 text-sm">Find students, campus conversations, events and more.</p>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
        <input
          className="input pl-12 pr-12 text-base"
          placeholder="Search students, branches, skills, events, gossip..."
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setResults(null) }}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Branch filters */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 lg:mx-0 lg:px-0">
        <button
          onClick={() => setActiveBranch(null)}
          className={`chip shrink-0 ${!activeBranch ? 'chip-active' : ''}`}
        >
          All
        </button>
        {branches.map(b => (
          <button
            key={b.id}
            onClick={() => setActiveBranch(b.id)}
            className={`chip shrink-0 ${activeBranch === b.id ? 'chip-active' : ''}`}
          >
            {b.short_name}
          </button>
        ))}
      </div>

      {/* Recent searches */}
      {!query && recentSearches.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Recent searches</p>
          <div className="flex flex-wrap gap-2">
            {recentSearches.map(s => (
              <button key={s} onClick={() => setQuery(s)} className="chip">
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {loading ? (
        <SkeletonList count={3} />
      ) : query && !hasResults ? (
        <EmptyState
          icon={<Search className="w-7 h-7" />}
          title="Nothing found"
          description="Try another search or explore a different branch."
        />
      ) : results && hasResults ? (
        <div className="space-y-6">
          {/* Users */}
          {results.users.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                <Users className="w-4 h-4" /> Students
              </h2>
              <div className="space-y-2">
                {results.users.map(u => (
                  <button
                    key={u.id}
                    onClick={() => navigate(`/profile/${u.username}`)}
                    className="w-full flex items-center gap-3 p-3 card card-hover text-left"
                  >
                    <Avatar src={u.avatar_url} alt={u.full_name} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-sm truncate">{u.full_name}</p>
                      <p className="text-xs text-gray-500">
                        @{u.username} · {formatNumber(u.follower_count)} followers
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Posts */}
          {results.posts.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" /> Posts
              </h2>
              <div className="space-y-2">
                {results.posts.slice(0, 5).map(p => (
                  <button
                    key={p.id}
                    onClick={() => navigate(`/post/${p.id}`)}
                    className="w-full p-3 card card-hover text-left"
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <Avatar src={p.author?.avatar_url} alt={p.author?.full_name || ''} size="xs" />
                      <span className="text-xs text-gray-500">@{p.author?.username}</span>
                    </div>
                    <p className="text-sm text-gray-300 line-clamp-2">{p.content}</p>
                    <p className="text-xs text-gray-600 mt-1">{timeAgo(p.created_at)}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Projects */}
          {results.projects.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                <Rocket className="w-4 h-4" /> Projects
              </h2>
              <div className="space-y-2">
                {results.projects.map(p => (
                  <div key={p.id} className="p-3 card">
                    <p className="font-semibold text-white text-sm">{p.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{p.description}</p>
                    {p.technologies.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {p.technologies.slice(0, 4).map(t => (
                          <span key={t} className="chip text-xs py-1">
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

          {/* Clubs */}
          {results.clubs.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                <Building2 className="w-4 h-4" /> Clubs
              </h2>
              <div className="space-y-2">
                {results.clubs.map(c => (
                  <button
                    key={c.id}
                    onClick={() => navigate('/clubs')}
                    className="w-full flex items-center gap-3 p-3 card card-hover text-left"
                  >
                    <div className="w-11 h-11 rounded-xl bg-ink-700 flex items-center justify-center text-xl overflow-hidden">
                      {c.logo_url ? (
                        <img src={c.logo_url} alt={c.name} className="w-full h-full object-cover" />
                      ) : (
                        '🎯'
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-sm truncate">{c.name}</p>
                      <p className="text-xs text-gray-500">{formatNumber(c.member_count)} members</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Events */}
          {results.events.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Events
              </h2>
              <div className="space-y-2">
                {results.events.slice(0, 5).map(e => (
                  <button
                    key={e.id}
                    onClick={() => navigate('/events')}
                    className="w-full p-3 card card-hover text-left"
                  >
                    <p className="font-semibold text-white text-sm">{e.title}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {formatDate(e.event_date)}
                      </span>
                      {e.venue && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {e.venue}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Marketplace */}
          {results.marketplace.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                <ShoppingBag className="w-4 h-4" /> Marketplace
              </h2>
              <div className="space-y-2">
                {results.marketplace.slice(0, 5).map(m => (
                  <button
                    key={m.id}
                    onClick={() => navigate('/marketplace')}
                    className="w-full flex items-center gap-3 p-3 card card-hover text-left"
                  >
                    <div className="w-11 h-11 rounded-xl bg-ink-700 border border-ink-700 flex items-center justify-center shrink-0 overflow-hidden">
                      {m.image_url ? (
                        <img src={m.image_url} alt={m.title} className="w-full h-full object-cover" />
                      ) : (
                        <Tag className="w-5 h-5 text-gray-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-sm truncate">{m.title}</p>
                      <p className="text-xs text-zeal-400 font-medium">{formatPrice(m.price)}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Builders */}
          {results.builders.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                <Rocket className="w-4 h-4" /> Builders
              </h2>
              <div className="space-y-2">
                {results.builders.slice(0, 5).map(b => (
                  <button
                    key={b.id}
                    onClick={() => navigate('/builders')}
                    className="w-full flex items-center gap-3 p-3 card card-hover text-left"
                  >
                    <Avatar src={b.logo_url} alt={b.name} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-sm truncate">{b.name}</p>
                      <p className="text-xs text-gray-500">{b.category} · {b.founder_role}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : !query ? (
        /* Trending / Popular content when no search query */
        <div className="space-y-6">
          {trendingLoading ? (
            <SkeletonList count={3} />
          ) : (
            <>
              {/* Trending Gossip */}
              {trendingGossip.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <Flame className="w-4 h-4 text-zeal-500" /> Trending
                  </h2>
                  <div className="space-y-2">
                    {trendingGossip.map((g: any) => (
                      <button
                        key={g.id}
                        onClick={() => navigate('/gossip')}
                        className="w-full p-3 card card-hover text-left"
                      >
                        <p className="text-sm text-gray-300 line-clamp-2">{g.content}</p>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Flame className="w-3 h-3 text-zeal-500" /> {formatNumber(g.like_count)}
                          </span>
                          <span>{timeAgo(g.created_at)}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Popular Projects */}
              {trendingProjects.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <Rocket className="w-4 h-4" /> Popular Projects
                  </h2>
                  <div className="space-y-2">
                    {trendingProjects.map(p => (
                      <button
                        key={p.id}
                        onClick={() => navigate('/projects')}
                        className="w-full p-3 card card-hover text-left"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Avatar src={p.owner?.avatar_url} alt={p.owner?.full_name || ''} size="xs" />
                          <span className="text-xs text-gray-500">{p.owner?.full_name}</span>
                        </div>
                        <p className="font-semibold text-white text-sm">{p.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{p.description}</p>
                        {p.technologies.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {p.technologies.slice(0, 3).map(t => (
                              <span key={t} className="chip text-xs py-0.5">
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Upcoming Events */}
              {trendingEvents.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <Calendar className="w-4 h-4" /> Upcoming Events
                  </h2>
                  <div className="space-y-2">
                    {trendingEvents.map(e => (
                      <button
                        key={e.id}
                        onClick={() => navigate('/events')}
                        className="w-full p-3 card card-hover text-left"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-white text-sm">{e.title}</p>
                            <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> {formatDate(e.event_date)}
                              </span>
                              {e.venue && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" /> {e.venue}
                                </span>
                              )}
                            </div>
                          </div>
                          {e.category && (
                            <span className="px-2 py-0.5 rounded-full bg-zeal-500/10 text-zeal-400 text-xs font-medium shrink-0">
                              {e.category}
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Marketplace Picks */}
              {trendingMarketplace.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4" /> Marketplace
                  </h2>
                  <div className="space-y-2">
                    {trendingMarketplace.map(m => (
                      <button
                        key={m.id}
                        onClick={() => navigate('/marketplace')}
                        className="w-full flex items-center gap-3 p-3 card card-hover text-left"
                      >
                        <div className="w-11 h-11 rounded-xl bg-ink-700 border border-ink-700 flex items-center justify-center shrink-0 overflow-hidden">
                          {m.image_url ? (
                            <img src={m.image_url} alt={m.title} className="w-full h-full object-cover" />
                          ) : (
                            <Tag className="w-5 h-5 text-gray-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-white text-sm truncate">{m.title}</p>
                          <p className="text-xs text-zeal-400 font-medium">{formatPrice(m.price)}</p>
                        </div>
                        {m.is_sold && (
                          <span className="text-xs text-red-400 shrink-0">Sold</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Builders */}
              {trendingBuilders.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" /> Builders
                  </h2>
                  <div className="space-y-2">
                    {trendingBuilders.map(b => (
                      <button
                        key={b.id}
                        onClick={() => navigate('/builders')}
                        className="w-full flex items-center gap-3 p-3 card card-hover text-left"
                      >
                        <Avatar src={b.logo_url} alt={b.name} size="md" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-white text-sm truncate">{b.name}</p>
                            {b.is_trending && (
                              <span className="flex items-center gap-0.5 text-xs text-orange-400">
                                <TrendingUp className="w-3 h-3" /> Trending
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">{b.category} · {b.founder_role}</p>
                        </div>
                        <span className="text-xs text-gray-600 shrink-0">{formatNumber(b.follower_count)} followers</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty trending state */}
              {!trendingLoading &&
                trendingProjects.length === 0 &&
                trendingEvents.length === 0 &&
                trendingMarketplace.length === 0 &&
                trendingBuilders.length === 0 &&
                trendingGossip.length === 0 && (
                  <div className="py-8">
                    <EmptyState
                      icon={<Search className="w-7 h-7" />}
                      title="Start searching"
                      description="Search for students, branches, skills, events, gossip and more."
                    />
                  </div>
                )}
            </>
          )}
        </div>
      ) : null}
    </div>
  )
}
