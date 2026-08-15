import { useEffect, useState } from 'react'
import { Rocket, Plus, TrendingUp, Users } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Avatar } from '@/components/Avatar'
import { SkeletonList } from '@/components/Skeleton'
import { EmptyState, ErrorState } from '@/components/States'
import { Sheet } from '@/components/Sheet'
import { fetchBuilders, createBuilder } from '@/lib/data'
import { formatNumber } from '@/lib/utils'
import type { Builder } from '@/types'

const CATEGORIES = ['All', 'Tech', 'Creative', 'Local'] as const

export function Builders() {
  const { user } = useAuth()
  const [builders, setBuilders] = useState<Builder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [category, setCategory] = useState<string>('All')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [formName, setFormName] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formCategory, setFormCategory] = useState('Tech')
  const [formRole, setFormRole] = useState('')

  const load = async (cat: string) => {
    setLoading(true)
    try {
      const data = await fetchBuilders(cat === 'All' ? undefined : cat.toLowerCase())
      setBuilders(data)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(category) }, [category])

  const resetForm = () => {
    setFormName('')
    setFormDesc('')
    setFormCategory('Tech')
    setFormRole('')
  }

  const handleSubmit = async () => {
    if (!user || !formName.trim() || !formDesc.trim() || !formRole.trim()) return
    setSubmitting(true)
    try {
      const builder = await createBuilder(
        user.id,
        formName.trim(),
        formDesc.trim(),
        formCategory.toLowerCase(),
        formRole.trim(),
      )
      setBuilders(prev => [builder, ...prev])
      resetForm()
      setSheetOpen(false)
    } catch {
      // keep sheet open
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Builders</h1>
          <p className="text-gray-500 text-sm mt-0.5">Discover campus startups and creators</p>
        </div>
        {user && (
          <button
            onClick={() => setSheetOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zeal-500 text-white text-sm font-medium hover:bg-zeal-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New
          </button>
        )}
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
        <ErrorState onRetry={() => load(category)} />
      ) : builders.length === 0 ? (
        <EmptyState
          icon={<Rocket className="w-7 h-7" />}
          title="No builders found"
          description={category !== 'All' ? 'Try a different category.' : 'Be the first to share your venture.'}
          action={user ? (
            <button onClick={() => setSheetOpen(true)} className="btn-primary text-sm">
              Create Profile
            </button>
          ) : undefined}
        />
      ) : (
        <div className="space-y-3">
          {builders.map(b => (
            <div key={b.id} className="card p-4 space-y-3">
              <div className="flex items-start gap-3">
                <Avatar src={b.logo_url} alt={b.name} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-white font-semibold truncate">{b.name}</h3>
                    {b.is_trending && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 text-xs font-medium">
                        <TrendingUp className="w-3 h-3" />
                        Trending
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {b.category && (
                      <span className="px-2 py-0.5 rounded-full bg-ink-800 text-gray-400 text-xs border border-ink-700 capitalize">
                        {b.category}
                      </span>
                    )}
                    <span className="text-xs text-gray-500">{b.founder_role}</span>
                  </div>
                </div>
              </div>

              {b.description && (
                <p className="text-gray-400 text-sm line-clamp-2">{b.description}</p>
              )}

              <div className="flex items-center gap-1.5 text-xs text-gray-500 pt-1">
                <Users className="w-3.5 h-3.5" />
                {formatNumber(b.follower_count)} followers
              </div>
            </div>
          ))}
        </div>
      )}

      <Sheet open={sheetOpen} onClose={() => { setSheetOpen(false); resetForm() }} title="New Builder">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Name</label>
            <input
              value={formName}
              onChange={e => setFormName(e.target.value)}
              placeholder="Startup or project name"
              className="w-full px-3 py-2.5 rounded-xl bg-ink-800 border border-ink-700 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-zeal-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Description</label>
            <textarea
              value={formDesc}
              onChange={e => setFormDesc(e.target.value)}
              placeholder="What do you build?"
              rows={3}
              className="w-full px-3 py-2.5 rounded-xl bg-ink-800 border border-ink-700 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-zeal-500 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Category</label>
            <div className="flex gap-2">
              {CATEGORIES.filter(c => c !== 'All').map(c => (
                <button
                  key={c}
                  onClick={() => setFormCategory(c)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                    formCategory === c
                      ? 'bg-zeal-500 text-white'
                      : 'bg-ink-800 border border-ink-700 text-gray-400'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Founder Role</label>
            <input
              value={formRole}
              onChange={e => setFormRole(e.target.value)}
              placeholder="e.g. CEO, CTO, Founder"
              className="w-full px-3 py-2.5 rounded-xl bg-ink-800 border border-ink-700 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-zeal-500"
            />
          </div>
          <button
            onClick={handleSubmit}
            disabled={!formName.trim() || !formDesc.trim() || !formRole.trim() || submitting}
            className="w-full py-2.5 rounded-xl bg-zeal-500 text-white font-medium text-sm hover:bg-zeal-600 transition-colors disabled:opacity-50"
          >
            {submitting ? 'Creating...' : 'Create Builder'}
          </button>
        </div>
      </Sheet>
    </div>
  )
}
