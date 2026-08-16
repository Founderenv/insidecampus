import { useEffect, useState } from 'react'
import { Trophy, Crown, Flame } from 'lucide-react'
import { Avatar } from '@/components/Avatar'
import { SkeletonList } from '@/components/Skeleton'
import { EmptyState } from '@/components/States'
import { fetchRankings, fetchBranches, fetchCreatorRankings } from '@/lib/data'
import { formatNumber } from '@/lib/utils'
import type { Profile, Branch } from '@/types'

const tabs = [
  { id: 'popular' as const, label: 'Popular', icon: '👑', lucide: Crown, color: 'text-yellow-400' },
  { id: 'creator' as const, label: 'Creator', icon: '🔥', lucide: Flame, color: 'text-orange-400' },
]

const rankColors = ['text-yellow-400', 'text-gray-300', 'text-orange-400']

function getScoreLabel(type: string) {
  switch (type) {
    case 'popular': return 'followers'
    case 'creator': return 'likes'
    default: return ''
  }
}

function getScoreValue(p: Profile, type: string) {
  switch (type) {
    case 'popular': return p.follower_count
    case 'creator': return (p as any).total_likes || p.post_count
    default: return 0
  }
}

export function Rankings() {
  const [leaders, setLeaders] = useState<Profile[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'popular' | 'creator'>('popular')
  const [branchFilter, setBranchFilter] = useState<string | null>(null)

  useEffect(() => {
    fetchBranches().then(setBranches).catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    if (activeTab === 'creator') {
      fetchCreatorRankings(branchFilter || undefined, 20)
        .then(setLeaders)
        .catch(() => {})
        .finally(() => setLoading(false))
    } else {
      fetchRankings(activeTab, branchFilter || undefined, 20)
        .then(setLeaders)
        .catch(() => {})
        .finally(() => setLoading(false))
    }
  }, [activeTab, branchFilter])

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-display font-bold text-white mb-1 flex items-center gap-2">
          <Trophy className="w-7 h-7 text-amber-400" /> Campus Rankings
        </h1>
        <p className="text-gray-500 text-sm">Compete across popularity, smarts, gaming, and creativity.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((t) => {
          const Icon = t.lucide
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`chip shrink-0 ${activeTab === t.id ? 'chip-active' : ''}`}
            >
              <Icon className={`w-3.5 h-3.5 ${t.color}`} /> {t.label}
            </button>
          )
        })}
      </div>

      {/* Branch filter */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setBranchFilter(null)}
          className={`chip shrink-0 ${!branchFilter ? 'chip-active' : ''}`}
        >
          Entire College
        </button>
        {branches.map((b) => (
          <button
            key={b.id}
            onClick={() => setBranchFilter(b.id)}
            className={`chip shrink-0 ${branchFilter === b.id ? 'chip-active' : ''}`}
          >
            {b.short_name}
          </button>
        ))}
      </div>

      {loading ? (
        <SkeletonList count={5} />
      ) : leaders.length === 0 ? (
        <EmptyState
          icon={<Trophy className="w-7 h-7" />}
          title="No rankings yet"
          description="Start participating to climb the leaderboard."
        />
      ) : (
        <div className="space-y-2">
          {leaders.map((p, i) => (
            <div key={p.id} className={`card p-3 flex items-center gap-3 ${i < 3 ? 'border-zeal-500/20' : ''}`}>
              <div className={`w-8 text-center font-bold ${i < 3 ? rankColors[i] : 'text-gray-600'}`}>
                {i + 1}
              </div>
              <Avatar src={p.avatar_url} alt={p.full_name} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white text-sm truncate">{p.full_name}</p>
                <p className="text-xs text-gray-500">@{p.username}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-zeal-500 text-sm">
                  {formatNumber(getScoreValue(p, activeTab))}
                </p>
                <p className="text-[10px] text-gray-600">{getScoreLabel(activeTab)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}


