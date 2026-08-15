import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Flame, TrendingUp, Calendar } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Avatar } from '@/components/Avatar'
import { PostCard } from '@/components/PostCard'
import { SkeletonList } from '@/components/Skeleton'
import { EmptyState, ErrorState } from '@/components/States'
import { fetchFeedPosts, fetchEvents, fetchLikedPostIds, fetchSavedPostIds } from '@/lib/data'
import { getGreeting, formatNumber } from '@/lib/utils'
import type { Post, EventItem } from '@/types'

export function Home() {
  const { profile, user } = useAuth()
  const navigate = useNavigate()
  const [posts, setPosts] = useState<Post[]>([])
  const [events, setEvents] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    Promise.all([
      fetchFeedPosts(0, 10),
      fetchEvents('upcoming'),
      user ? fetchLikedPostIds(user.id) : Promise.resolve(new Set<string>()),
      user ? fetchSavedPostIds(user.id) : Promise.resolve(new Set<string>()),
    ]).then(([p, e, likedIds, savedIds]) => {
      setPosts(p.map(post => ({
        ...post,
        is_liked: likedIds.has(post.id),
        is_saved: savedIds.has(post.id),
      })))
      setEvents(e.slice(0, 3))
    }).catch(() => setError(true)).finally(() => setLoading(false))
  }, [user])

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">
            {getGreeting()}, {profile?.full_name?.split(' ')[0] || 'there'} 👋
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">Here's what's happening on your campus.</p>
        </div>
        <button onClick={() => navigate('/notifications')} className="lg:hidden p-2 rounded-xl bg-ink-800 border border-ink-700">
          <Search className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      {/* Stories row */}
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 lg:mx-0 lg:px-0">
        {events.map(ev => (
          <button
            key={ev.id}
            onClick={() => navigate('/events')}
            className="shrink-0 w-32 card card-hover overflow-hidden text-left"
          >
            <div className="h-28 bg-gradient-to-br from-zeal-600/30 to-ink-800 flex items-center justify-center">
              <Calendar className="w-8 h-8 text-zeal-500" />
            </div>
            <div className="p-2.5">
              <p className="text-xs font-semibold text-white truncate">{ev.title}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">{formatNumber(ev.interested_count)} interested</p>
            </div>
          </button>
        ))}
        <button
          onClick={() => navigate('/explore')}
          className="shrink-0 w-32 card card-hover flex flex-col items-center justify-center gap-2 text-gray-400"
        >
          <div className="w-14 h-14 rounded-full bg-ink-700 flex items-center justify-center">
            <Search className="w-6 h-6" />
          </div>
          <span className="text-xs font-medium">Discover more</span>
        </button>
      </div>

      {/* Feed */}
      {loading ? (
        <SkeletonList count={4} />
      ) : error ? (
        <ErrorState onRetry={() => window.location.reload()} />
      ) : posts.length === 0 ? (
        <EmptyState
          icon={<Flame className="w-7 h-7" />}
          title="No posts yet"
          description="Be the first to post on InsideZeal. Share something with your campus."
        />
      ) : (
        <div className="space-y-3">
          {posts.map(p => <PostCard key={p.id} post={p} />)}
        </div>
      )}
    </div>
  )
}
