import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { fetchResources, toggleResourceUseful, fetchResourceUsefulIds, fetchResourceSaveIds, toggleResourceSave } from '../lib/data'
import type { Resource } from '../lib/data'

const TYPES = [
  { value: 'all', label: 'All' },
  { value: 'notes', label: 'Notes' },
  { value: 'papers', label: 'Papers' },
  { value: 'books', label: 'Books' },
  { value: 'links', label: 'Links' },
]

const ICONS: Record<string, string> = {
  notes: '📝',
  papers: '📄',
  books: '📚',
  links: '🔗',
}

const TYPE_COLORS: Record<string, string> = {
  notes: 'bg-blue-500/20 text-blue-400',
  papers: 'bg-purple-500/20 text-purple-400',
  books: 'bg-amber-500/20 text-amber-400',
  links: 'bg-emerald-500/20 text-emerald-400',
}

export default function Resources() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [activeType, setActiveType] = useState('all')
  const [search, setSearch] = useState('')
  const [usefulSet, setUsefulSet] = useState<Set<string>>(new Set())
  const [savedSet, setSavedSet] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!user) return
    setLoading(true)
    Promise.all([
      fetchResources({ type: activeType !== 'all' ? activeType : undefined, search: search || undefined }),
      fetchResourceUsefulIds(user.id),
      fetchResourceSaveIds(user.id),
    ]).then(([r, u, s]) => {
      setResources(r)
      setUsefulSet(u)
      setSavedSet(s)
    }).finally(() => setLoading(false))
  }, [user, activeType, search])

  const handleUseful = async (r: Resource) => {
    if (!user) return
    const wasUseful = usefulSet.has(r.id)
    setUsefulSet(prev => { const n = new Set(prev); wasUseful ? n.delete(r.id) : n.add(r.id); return n })
    setResources(prev => prev.map(x => x.id === r.id ? { ...x, useful_count: x.useful_count + (wasUseful ? -1 : 1) } : x))
    try { await toggleResourceUseful(r.id, user.id, wasUseful) } catch {}
  }

  const handleSave = async (r: Resource) => {
    if (!user) return
    const wasSaved = savedSet.has(r.id)
    setSavedSet(prev => { const n = new Set(prev); wasSaved ? n.delete(r.id) : n.add(r.id); return n })
    try { await toggleResourceSave(r.id, user.id, wasSaved) } catch {}
  }

  const filtered = resources

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Resources</h1>
        <button onClick={() => navigate('/resources/new')} className="btn btn-primary">
          + Share
        </button>
      </div>

      <div className="relative">
        <input
          type="text"
          placeholder="Search resources..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input pl-10 w-full"
        />
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {TYPES.map(t => (
          <button
            key={t.value}
            onClick={() => setActiveType(t.value)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              activeType === t.value
                ? 'bg-zeal-500 text-white shadow-lg shadow-zeal-500/25'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="card p-4 animate-pulse h-32" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-4xl mb-3">📚</p>
          <p className="text-gray-400">No resources found</p>
          <p className="text-gray-500 text-sm mt-1">Be the first to share study materials!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(r => (
            <div key={r.id} className="card p-4 hover:bg-white/[0.02] transition-all">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0 ${TYPE_COLORS[r.resource_type] || 'bg-gray-500/20'}`}>
                  {ICONS[r.resource_type] || '📄'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-white">{r.title}</h3>
                      <p className="text-sm text-gray-400 mt-0.5">{r.subject} · {r.resource_type}{r.semester ? ` · Sem ${r.semester}` : ''}</p>
                    </div>
                  </div>
                  {r.description && <p className="text-sm text-gray-300 mt-2 line-clamp-2">{r.description}</p>}
                  {r.external_url && (
                    <a href={r.external_url} target="_blank" rel="noopener noreferrer" className="text-sm text-zeal-400 hover:underline mt-2 inline-flex items-center gap-1">
                      Open link ↗
                    </a>
                  )}
                  <div className="flex items-center gap-4 mt-3">
                    <button
                      onClick={() => handleUseful(r)}
                      className={`flex items-center gap-1.5 text-xs transition-colors ${usefulSet.has(r.id) ? 'text-emerald-400' : 'text-gray-500 hover:text-emerald-400'}`}
                    >
                      <span>{usefulSet.has(r.id) ? '👍' : '👍🏻'}</span>
                      <span>{r.useful_count}</span>
                    </button>
                    <button
                      onClick={() => handleSave(r)}
                      className={`flex items-center gap-1.5 text-xs transition-colors ${savedSet.has(r.id) ? 'text-amber-400' : 'text-gray-500 hover:text-amber-400'}`}
                    >
                      <span>{savedSet.has(r.id) ? '🔖' : '🔖'}</span>
                      <span>{savedSet.has(r.id) ? 'Saved' : 'Save'}</span>
                    </button>
                    {r.uploader && (
                      <span className="text-xs text-gray-500 ml-auto">by {r.uploader.full_name || 'Anonymous'}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
