import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Star, ChevronRight, Search } from 'lucide-react'
import { SkeletonList } from '@/components/Skeleton'
import { EmptyState, ErrorState } from '@/components/States'
import { fetchTeachers, fetchBranches } from '@/lib/data'
import type { Teacher, Branch } from '@/types'

export function Teachers() {
  const navigate = useNavigate()
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [search, setSearch] = useState('')
  const [branchFilter, setBranchFilter] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([fetchTeachers(branchFilter || undefined), fetchBranches()])
      .then(([t, b]) => { setTeachers(t); setBranches(b) })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [branchFilter])

  const filtered = teachers.filter(t =>
    !search || t.name.toLowerCase().includes(search.toLowerCase()) || (t.department || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-display font-bold text-white mb-1">Teacher Reviews</h1>
        <p className="text-gray-500 text-sm">Rate professors on teaching, explanation, approachability, and practical help.</p>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
        <input className="input pl-12" placeholder="Search teachers..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        <button onClick={() => setBranchFilter(null)} className={`chip shrink-0 ${!branchFilter ? 'chip-active' : ''}`}>All</button>
        {branches.map(b => (
          <button key={b.id} onClick={() => setBranchFilter(b.id)} className={`chip shrink-0 ${branchFilter === b.id ? 'chip-active' : ''}`}>{b.short_name}</button>
        ))}
      </div>

      {loading ? (
        <SkeletonList count={4} />
      ) : error ? (
        <ErrorState onRetry={() => window.location.reload()} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={<Star className="w-7 h-7" />} title="No teachers found" description="Try a different search or branch filter." />
      ) : (
        <div className="space-y-3">
          {filtered.map(t => (
            <button
              key={t.id}
              onClick={() => navigate(`/teachers/${t.id}`)}
              className="w-full card card-hover p-4 flex items-center gap-4 text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-ink-800 flex items-center justify-center shrink-0">
                <span className="text-lg font-bold text-gray-400">{t.name.split(' ').map(w => w[0]).slice(0, 2).join('')}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white text-sm truncate">{t.name}</p>
                <p className="text-xs text-gray-500">{t.department}</p>
                <p className="text-xs text-gray-600 mt-0.5">{t.review_count} reviews</p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-zeal-500 text-zeal-500" />
                  <span className="font-bold text-white text-sm">{Number(t.avg_overall).toFixed(1)}</span>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-600 ml-auto mt-1" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
