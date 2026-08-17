import { useEffect, useState } from 'react'
import { Users, BadgeCheck } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Avatar } from '@/components/Avatar'
import { SkeletonList } from '@/components/Skeleton'
import { EmptyState, ErrorState } from '@/components/States'
import { fetchClubs, toggleClubJoin, fetchMyJoinedClubIds } from '@/lib/data'
import { formatNumber } from '@/lib/utils'
import type { Club } from '@/types'

const CATEGORIES = ['All', 'Technical', 'Cultural', 'Sports'] as const

export function Clubs() {
  const { user } = useAuth()
  const [clubs, setClubs] = useState<Club[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [category, setCategory] = useState<string>('All')
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    setLoading(true)
    fetchClubs()
      .then(async data => {
        setClubs(data)
        if (user) {
          fetchMyJoinedClubIds(user.id).then(setJoinedIds).catch(() => {})
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [user])

  const filtered = category === 'All'
    ? clubs
    : clubs.filter(c => c.category?.toLowerCase() === category.toLowerCase())

  const handleToggle = async (clubId: string) => {
    if (!user) return
    const wasJoined = joinedIds.has(clubId)
    setJoinedIds(prev => {
      const next = new Set(prev)
      if (wasJoined) next.delete(clubId)
      else next.add(clubId)
      return next
    })
    setClubs(prev => prev.map(c =>
      c.id === clubId
        ? { ...c, member_count: c.member_count + (wasJoined ? -1 : 1) }
        : c
    ))
    try {
      await toggleClubJoin(clubId, user.id)
    } catch {
      setJoinedIds(prev => {
        const next = new Set(prev)
        if (wasJoined) next.add(clubId)
        else next.delete(clubId)
        return next
      })
      setClubs(prev => prev.map(c =>
        c.id === clubId
          ? { ...c, member_count: c.member_count + (wasJoined ? 1 : -1) }
          : c
      ))
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-display font-bold text-white">Clubs</h1>
        <p className="text-gray-500 text-sm mt-0.5">Join communities that match your interests</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 lg:mx-0 lg:px-0">
        {CATEGORIES.map(c => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              category === c
                ? 'bg-zeal-500 text-white'
                : 'bg-ink-800 text-gray-400 border border-ink-700 hover:text-white'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {loading ? (
        <SkeletonList count={4} />
      ) : error ? (
        <ErrorState onRetry={() => window.location.reload()} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Users className="w-7 h-7" />}
          title="No clubs found"
          description={category !== 'All' ? 'Try a different category.' : 'No clubs available yet.'}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map(club => {
            const isMember = joinedIds.has(club.id)
            return (
              <div key={club.id} className="card p-4">
                <div className="flex items-start gap-3">
                  <Avatar src={club.logo_url} alt={club.name} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-white font-semibold truncate">{club.name}</h3>
                      {club.is_verified && (
                        <BadgeCheck className="w-4 h-4 text-zeal-500 shrink-0" />
                      )}
                    </div>
                    {club.category && (
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-ink-800 text-gray-400 text-xs border border-ink-700">
                        {club.category}
                      </span>
                    )}
                    {club.description && (
                      <p className="text-gray-400 text-sm mt-2 line-clamp-2">{club.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-ink-700/50">
                  <span className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Users className="w-3.5 h-3.5" />
                    {formatNumber(club.member_count)} members
                  </span>
                  {user && (
                    <button
                      onClick={() => handleToggle(club.id)}
                      className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-all ${
                        isMember
                          ? 'bg-zeal-500 text-white'
                          : 'bg-ink-800 border border-ink-700 text-gray-300 hover:text-white'
                      }`}
                    >
                      {isMember ? 'Joined ✓' : 'Join'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
