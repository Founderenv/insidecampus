import { useState, useEffect } from 'react'
import { Search, SlidersHorizontal, X, BookOpen } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { fetchResources, toggleResourceUseful, fetchResourceUsefulIds, fetchResourceSaveIds, toggleResourceSave, fetchBranches } from '@/lib/data'
import { Sheet } from '@/components/Sheet'
import type { Resource } from '@/lib/data'
import type { Branch } from '@/types'

const DEPARTMENT_LABELS: Record<string, string> = {
  'AI & Data Science': 'AI & Data Science',
  'AI & Machine Learning': 'AI & Machine Learning',
  'Civil Engineering': 'Civil Engineering',
  'Computer Engineering': 'Computer Engineering',
  'Electronics & Computer Engg': 'Electronics & Computer Engg',
  'E & TC Engineering': 'E & TC Engineering',
  'Electrical Engineering': 'Electrical Engineering',
  'Information Technology': 'Information Technology',
  'Mechanical Engineering': 'Mechanical Engineering',
  'Robotics & Automation': 'Robotics & Automation',
  'Computer': 'Computer Engineering',
  'IT': 'Information Technology',
  'Mechanical': 'Mechanical Engineering',
  'Electrical': 'Electrical Engineering',
  'Civil': 'Civil Engineering',
  'E&TC': 'E & TC Engineering',
}

const TYPES = [
  { value: 'all', label: 'All Types' },
  { value: 'notes', label: 'Notes' },
  { value: 'papers', label: 'Papers' },
  { value: 'books', label: 'Books' },
  { value: 'links', label: 'Links' },
]

const SEMESTERS = [
  { value: 0, label: 'All Semesters' },
  { value: 1, label: 'Sem 1' },
  { value: 2, label: 'Sem 2' },
  { value: 3, label: 'Sem 3' },
  { value: 4, label: 'Sem 4' },
  { value: 5, label: 'Sem 5' },
  { value: 6, label: 'Sem 6' },
  { value: 7, label: 'Sem 7' },
  { value: 8, label: 'Sem 8' },
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
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [activeType, setActiveType] = useState('all')
  const [activeBranch, setActiveBranch] = useState<string>('')
  const [activeSemester, setActiveSemester] = useState(0)
  const [search, setSearch] = useState('')
  const [usefulSet, setUsefulSet] = useState<Set<string>>(new Set())
  const [savedSet, setSavedSet] = useState<Set<string>>(new Set())
  const [dbBranches, setDbBranches] = useState<Branch[]>([])
  const [filterOpen, setFilterOpen] = useState(false)

  useEffect(() => {
    fetchBranches().then(setDbBranches).catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetchResources({
        type: activeType !== 'all' ? activeType : undefined,
        branchId: activeBranch || undefined,
        search: search || undefined,
      }),
      user ? fetchResourceUsefulIds(user.id) : Promise.resolve(new Set<string>()),
      user ? fetchResourceSaveIds(user.id) : Promise.resolve(new Set<string>()),
    ]).then(([r, u, s]) => {
      setResources(r)
      setUsefulSet(u)
      setSavedSet(s)
    }).finally(() => setLoading(false))
  }, [user, activeType, activeBranch, search])

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

  const filtered = activeSemester > 0
    ? resources.filter(r => r.semester === activeSemester)
    : resources

  const activeFilterCount = (activeBranch ? 1 : 0) + (activeSemester > 0 ? 1 : 0)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-display font-bold text-white">Learn</h1>
          <p className="text-gray-500 text-xs mt-0.5">Resources, notes, and study materials</p>
        </div>
        <button
          onClick={() => setFilterOpen(true)}
          className="relative p-2 rounded-xl hover:bg-ink-800 transition-colors"
        >
          <SlidersHorizontal className="w-5 h-5 text-gray-400" />
          {activeFilterCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-zeal-500 text-ink-950 text-[9px] font-bold flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          type="text"
          placeholder="Search resources..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input pl-10 pr-10 text-sm"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3.5 top-1/2 -translate-y-1/2">
            <X className="w-4 h-4 text-gray-500 hover:text-white" />
          </button>
        )}
      </div>

      {/* Type Chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 lg:mx-0 lg:px-0 scrollbar-none">
        {TYPES.map(t => (
          <button
            key={t.value}
            onClick={() => setActiveType(t.value)}
            className={`chip shrink-0 ${activeType === t.value ? 'chip-active' : ''}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Resources */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="card p-4 animate-pulse h-32" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-8 text-center">
          <BookOpen className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No resources found</p>
          <p className="text-gray-600 text-xs mt-1">Try adjusting your filters or search.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => (
            <div key={r.id} className="card p-4 hover:bg-white/[0.02] transition-all">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0 ${TYPE_COLORS[r.resource_type] || 'bg-gray-500/20'}`}>
                  {ICONS[r.resource_type] || '📄'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-white text-sm truncate">{r.title}</h3>
                      <p className="text-xs text-gray-400 mt-0.5">{r.subject} · {r.resource_type}{r.semester ? ` · Sem ${r.semester}` : ''}</p>
                    </div>
                  </div>
                  {r.description && <p className="text-xs text-gray-300 mt-1.5 line-clamp-2">{r.description}</p>}
                  {r.external_url && (
                    <a href={r.external_url} target="_blank" rel="noopener noreferrer" className="text-xs text-zeal-400 hover:underline mt-1.5 inline-flex items-center gap-1">
                      Open link ↗
                    </a>
                  )}
                  <div className="flex items-center gap-3 mt-2.5">
                    <button
                      onClick={() => handleUseful(r)}
                      className={`flex items-center gap-1 text-xs transition-colors ${usefulSet.has(r.id) ? 'text-emerald-400' : 'text-gray-500 hover:text-emerald-400'}`}
                    >
                      <span>{usefulSet.has(r.id) ? '👍' : '👍🏻'}</span>
                      <span>{r.useful_count}</span>
                    </button>
                    <button
                      onClick={() => handleSave(r)}
                      className={`flex items-center gap-1 text-xs transition-colors ${savedSet.has(r.id) ? 'text-amber-400' : 'text-gray-500 hover:text-amber-400'}`}
                    >
                      <span>🔖</span>
                      <span>{savedSet.has(r.id) ? 'Saved' : 'Save'}</span>
                    </button>
                    {r.uploader && (
                      <span className="text-[10px] text-gray-600 ml-auto">by {r.uploader.full_name || 'Anonymous'}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filter Sheet */}
      <Sheet open={filterOpen} onClose={() => setFilterOpen(false)} title="Filters">
        <div className="space-y-5">
          {/* Department */}
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-2">Department</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setActiveBranch('')}
                className={`chip text-xs ${!activeBranch ? 'chip-active' : ''}`}
              >
                All Departments
              </button>
              {dbBranches.map(b => (
                <button
                  key={b.id}
                  onClick={() => setActiveBranch(b.id)}
                  className={`chip text-xs ${activeBranch === b.id ? 'chip-active' : ''}`}
                >
                  {DEPARTMENT_LABELS[b.short_name] || DEPARTMENT_LABELS[b.name] || b.short_name || b.name}
                </button>
              ))}
            </div>
          </div>

          {/* Semester */}
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-2">Semester</p>
            <div className="flex flex-wrap gap-2">
              {SEMESTERS.map(s => (
                <button
                  key={s.value}
                  onClick={() => setActiveSemester(s.value)}
                  className={`chip text-xs ${activeSemester === s.value ? 'chip-active' : ''}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Type */}
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-2">Resource Type</p>
            <div className="flex flex-wrap gap-2">
              {TYPES.map(t => (
                <button
                  key={t.value}
                  onClick={() => setActiveType(t.value)}
                  className={`chip text-xs ${activeType === t.value ? 'chip-active' : ''}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Apply */}
          <button
            onClick={() => setFilterOpen(false)}
            className="btn-primary w-full text-sm"
          >
            Apply Filters
          </button>
        </div>
      </Sheet>
    </div>
  )
}
