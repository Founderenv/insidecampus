import { useEffect, useState } from 'react'
import { Trophy, Crown, Brain, Gamepad2, Flame } from 'lucide-react'
import { Avatar } from '@/components/Avatar'
import { SkeletonList } from '@/components/Skeleton'
import { EmptyState } from '@/components/States'
import { fetchRankings, fetchBranches } from '@/lib/data'
import { formatNumber } from '@/lib/utils'
import type { Profile, Branch } from '@/types'

const tabs = [
  { id: 'popular' as const, label: 'Popular', icon: '👑', lucide: Crown, color: 'text-yellow-400' },
  { id: 'smart' as const, label: 'Smart', icon: '🧠', lucide: Brain, color: 'text-blue-400' },
  { id: 'gamer' as const, label: 'Gamer', icon: '🎮', lucide: Gamepad2, color: 'text-purple-400' },
  { id: 'creator' as const, label: 'Creator', icon: '🔥', lucide: Flame, color: 'text-orange-400' },
]

const rankColors = ['text-yellow-400', 'text-gray-300', 'text-orange-400']

function getScoreLabel(type: string) {
  switch (type) {
    case 'popular': return 'followers'
    case 'smart': return 'smart'
    case 'gamer': return 'XP'
    case 'creator': return 'posts'
    default: return ''
  }
}

function getScoreValue(p: Profile, type: string) {
  switch (type) {
    case 'popular': return p.follower_count
    case 'smart': return p.smart_score
    case 'gamer': return p.game_xp
    case 'creator': return p.post_count
    default: return 0
  }
}

export function Rankings() {
  const [leaders, setLeaders] = useState<Profile[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'popular' | 'smart' | 'gamer' | 'creator'>('popular')
  const [branchFilter, setBranchFilter] = useState<string | null>(null)

  useEffect(() => {
    fetchBranches().then(setBranches).catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    fetchRankings(activeTab, branchFilter || undefined, 20)
      .then(setLeaders)
      .catch(() => {})
      .finally(() => setLoading(false))
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

      {/* Brain of the month - only for Smart tab */}
      {activeTab === 'smart' && (
        <div className="card p-5 bg-gradient-to-r from-zeal-500/10 to-transparent border-zeal-500/20">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">🏆</span>
            <div>
              <p className="font-bold text-white">Brain of the Month</p>
              <p className="text-xs text-gray-500">Top Smart Score this month</p>
            </div>
          </div>
          {!loading && leaders.length > 0 && (
            <div className="flex items-center gap-3">
              <Avatar src={leaders[0].avatar_url} alt={leaders[0].full_name} size="md" ring />
              <div>
                <p className="font-semibold text-white text-sm">{leaders[0].full_name}</p>
                <p className="text-xs text-gray-500">@{leaders[0].username}</p>
                <p className="text-xs text-zeal-500">{leaders[0].smart_score} Smart Score</p>
              </div>
            </div>
          )}
        </div>
      )}

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


