import { useEffect, useState } from 'react'
import { Search, Plus, MapPin, Calendar } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { SkeletonList } from '@/components/Skeleton'
import { EmptyState, ErrorState } from '@/components/States'
import { Sheet } from '@/components/Sheet'
import { fetchLostFound, createLostFoundItem, markLostFoundResolved } from '@/lib/data'
import { timeAgo } from '@/lib/utils'
import type { LostFoundItem } from '@/types'

const TYPE_FILTERS = ['All', 'Lost', 'Found'] as const

export function LostFound() {
  const { user } = useAuth()
  const [items, setItems] = useState<LostFoundItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [typeFilter, setTypeFilter] = useState<string>('All')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [formType, setFormType] = useState<'lost' | 'found'>('lost')
  const [formName, setFormName] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formLocation, setFormLocation] = useState('')
  const [formDate, setFormDate] = useState('')

  const load = async (t: string) => {
    setLoading(true)
    try {
      const data = await fetchLostFound(t === 'All' ? undefined : t.toLowerCase())
      setItems(data)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(typeFilter) }, [typeFilter])

  const resetForm = () => {
    setFormType('lost')
    setFormName('')
    setFormDesc('')
    setFormLocation('')
    setFormDate('')
  }

  const handleSubmit = async () => {
    if (!user || !formName.trim() || !formDesc.trim()) return
    setSubmitting(true)
    try {
      const item = await createLostFoundItem(
        user.id,
        formType,
        formName.trim(),
        formDesc.trim(),
        formLocation.trim() || undefined,
        formDate || undefined,
      )
      setItems(prev => [item, ...prev])
      resetForm()
      setSheetOpen(false)
    } catch {
      // keep sheet open
    } finally {
      setSubmitting(false)
    }
  }

  const handleResolved = async (itemId: string) => {
    if (!user) return
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, is_resolved: true } : i))
    try {
      await markLostFoundResolved(itemId, user.id)
    } catch {
      setItems(prev => prev.map(i => i.id === itemId ? { ...i, is_resolved: false } : i))
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Lost & Found</h1>
          <p className="text-gray-500 text-sm mt-0.5">Help reunite lost items with their owners</p>
        </div>
        {user && (
          <button
            onClick={() => setSheetOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zeal-500 text-white text-sm font-medium hover:bg-zeal-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Report
          </button>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 lg:mx-0 lg:px-0">
        {TYPE_FILTERS.map(t => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              typeFilter === t
                ? 'bg-zeal-500 text-white'
                : 'bg-ink-800 text-gray-400 border border-ink-700 hover:text-white'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <SkeletonList count={4} />
      ) : error ? (
        <ErrorState onRetry={() => load(typeFilter)} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Search className="w-7 h-7" />}
          title="No items found"
          description={typeFilter !== 'All' ? `No ${typeFilter.toLowerCase()} items.` : 'Nothing reported yet.'}
          action={user ? (
            <button onClick={() => setSheetOpen(true)} className="btn-primary text-sm">
              Report Item
            </button>
          ) : undefined}
        />
      ) : (
        <div className="space-y-3">
          {items.map(item => {
            const isOwner = user?.id === item.owner_id
            return (
              <div key={item.id} className="card p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${
                        item.type === 'lost'
                          ? 'bg-red-500/10 text-red-400'
                          : 'bg-green-500/10 text-green-400'
                      }`}>
                        {item.type === 'lost' ? 'Lost' : 'Found'}
                      </span>
                      <h3 className="text-white font-semibold truncate">{item.item_name}</h3>
                      {item.is_resolved && (
                        <span className="shrink-0 px-2 py-0.5 rounded-full bg-zeal-500/10 text-zeal-400 text-xs font-medium">
                          Resolved
                        </span>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-gray-400 text-sm mt-2 line-clamp-2">{item.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
                  {item.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {item.location}
                    </span>
                  )}
                  {item.item_date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {timeAgo(item.item_date)}
                    </span>
                  )}
                </div>

                {user && isOwner && !item.is_resolved && (
                  <div className="pt-1">
                    <button
                      onClick={() => handleResolved(item.id)}
                      className="px-4 py-1.5 rounded-xl bg-ink-800 border border-ink-700 text-gray-300 text-xs font-medium hover:text-white transition-colors"
                    >
                      Mark as Resolved
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <Sheet open={sheetOpen} onClose={() => { setSheetOpen(false); resetForm() }} title="Report Item">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Type</label>
            <div className="flex gap-2">
              {(['lost', 'found'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setFormType(t)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium capitalize transition-all ${
                    formType === t
                      ? t === 'lost' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
                      : 'bg-ink-800 border border-ink-700 text-gray-400'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Item Name</label>
            <input
              value={formName}
              onChange={e => setFormName(e.target.value)}
              placeholder="e.g. Blue Backpack"
              className="w-full px-3 py-2.5 rounded-xl bg-ink-800 border border-ink-700 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-zeal-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Description</label>
            <textarea
              value={formDesc}
              onChange={e => setFormDesc(e.target.value)}
              placeholder="Describe the item"
              rows={3}
              className="w-full px-3 py-2.5 rounded-xl bg-ink-800 border border-ink-700 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-zeal-500 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Location</label>
            <input
              value={formLocation}
              onChange={e => setFormLocation(e.target.value)}
              placeholder="Where was it lost/found?"
              className="w-full px-3 py-2.5 rounded-xl bg-ink-800 border border-ink-700 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-zeal-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Date</label>
            <input
              type="date"
              value={formDate}
              onChange={e => setFormDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-ink-800 border border-ink-700 text-white text-sm focus:outline-none focus:border-zeal-500"
            />
          </div>
          <button
            onClick={handleSubmit}
            disabled={!formName.trim() || !formDesc.trim() || submitting}
            className="w-full py-2.5 rounded-xl bg-zeal-500 text-white font-medium text-sm hover:bg-zeal-600 transition-colors disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Report Item'}
          </button>
        </div>
      </Sheet>
    </div>
  )
}
