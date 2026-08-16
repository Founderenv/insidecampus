import { useState, useEffect, useCallback } from 'react'
import { Flame, TrendingUp, Clock, Eye, Heart, MessageCircle, MoreHorizontal, Plus, Send, Flag } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { HiddenAvatar } from '@/components/HiddenAvatar'
import { SkeletonList } from '@/components/Skeleton'
import { EmptyState, ErrorState } from '@/components/States'
import { Sheet } from '@/components/Sheet'
import {
  fetchGossip, createGossipPost, toggleGossipLike, fetchGossipLikeIds,
  fetchMyHiddenProfile, reportContent, fetchBranches,
} from '@/lib/data'
import { timeAgo, formatNumber } from '@/lib/utils'
import type { GossipPost, Branch } from '@/types'

const categoryTabs = [
  { id: 'all', label: 'All', icon: Flame },
  { id: 'trending', label: 'Trending', icon: TrendingUp },
  { id: 'latest', label: 'Latest', icon: Clock },
]

const postCategories = [
  { id: 'trending', label: 'Trending' },
  { id: 'latest', label: 'Latest' },
  { id: 'funny', label: 'Funny' },
  { id: 'drama', label: 'Drama' },
  { id: 'campus', label: 'Campus' },
]

export function Gossip() {
  const { user, profile } = useAuth()
  const [posts, setPosts] = useState<GossipPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [activeTab, setActiveTab] = useState('all')
  const [sortBy, setSortBy] = useState<'latest' | 'trending'>('latest')
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set())
  const [branches, setBranches] = useState<Branch[]>([])
  const [activeBranch, setActiveBranch] = useState<string | null>(null) // null = All, 'campus' = Campus only, string = dept

  const [sheetOpen, setSheetOpen] = useState(false)
  const [content, setContent] = useState('')
  const [postCategory, setPostCategory] = useState('latest')
  const [postScope, setPostScope] = useState<'campus' | 'department'>('campus')
  const [submitting, setSubmitting] = useState(false)
  const [hiddenProfile, setHiddenProfile] = useState<{ id: string; code: string } | null>(null)
  const [hiddenProfileChecked, setHiddenProfileChecked] = useState(false)

  const [reportSheetOpen, setReportSheetOpen] = useState(false)
  const [reportTargetId, setReportTargetId] = useState('')
  const [reportReason, setReportReason] = useState('')
  const [reporting, setReporting] = useState(false)

  const userBranch = profile?.branch_id ? branches.find(b => b.id === profile.branch_id) : null

  useEffect(() => {
    fetchBranches().then(setBranches).catch(() => {})
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const sort = activeTab === 'trending' ? 'trending' : activeTab === 'latest' ? 'latest' : sortBy
      const data = await fetchGossip(undefined, sort, 20, activeBranch === 'campus' ? 'campus' : activeBranch || undefined)
      setPosts(data)
      if (user) {
        const ids = await fetchGossipLikeIds(user.id)
        setLikedIds(ids)
      }
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [activeTab, sortBy, user, activeBranch])

  useEffect(() => { loadData() }, [loadData])

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    if (tab === 'trending') setSortBy('trending')
    else if (tab === 'latest') setSortBy('latest')
  }

  const openCreateSheet = async () => {
    if (!user) return
    setHiddenProfileChecked(false)
    setSheetOpen(true)
    try {
      const hp = await fetchMyHiddenProfile(user.id)
      setHiddenProfile(hp ? { id: hp.id, code: hp.anonymous_code } : null)
    } catch {
      setHiddenProfile(null)
    } finally {
      setHiddenProfileChecked(true)
    }
  }

  const handleCreate = async () => {
    if (!hiddenProfile || !content.trim()) return
    setSubmitting(true)
    try {
      const branchId = postScope === 'department' && profile?.branch_id ? profile.branch_id : null
      await createGossipPost(hiddenProfile.id, content.trim(), postCategory, undefined, branchId)
      setContent('')
      setPostCategory('latest')
      setPostScope('campus')
      setSheetOpen(false)
      loadData()
    } catch (err) {
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleLike = async (g: GossipPost) => {
    if (!user) return
    const isLiked = likedIds.has(g.id)
    setLikedIds(prev => { const next = new Set(prev); isLiked ? next.delete(g.id) : next.add(g.id); return next })
    setPosts(prev => prev.map(p => p.id === g.id ? { ...p, like_count: p.like_count + (isLiked ? -1 : 1) } : p))
    try {
      await toggleGossipLike(g.id, user.id, isLiked)
    } catch {
      setLikedIds(prev => { const next = new Set(prev); isLiked ? next.add(g.id) : next.delete(g.id); return next })
      setPosts(prev => prev.map(p => p.id === g.id ? { ...p, like_count: p.like_count + (isLiked ? 1 : -1) } : p))
    }
  }

  const openReport = (id: string) => { setReportTargetId(id); setReportReason(''); setReportSheetOpen(true) }

  const handleReport = async () => {
    if (!user || !reportReason.trim()) return
    setReporting(true)
    try { await reportContent(user.id, 'gossip', reportTargetId, reportReason.trim()); setReportSheetOpen(false) } catch {} finally { setReporting(false) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-display font-bold text-white flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-400" /> Gossip
          </h1>
          <p className="text-gray-500 text-xs mt-0.5">Anonymous campus buzz. Be kind.</p>
        </div>
        <button onClick={openCreateSheet} className="btn-primary flex items-center gap-1.5 text-sm">
          <Plus className="w-4 h-4" /> Post
        </button>
      </div>

      {/* Department Chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 lg:mx-0 lg:px-0 scrollbar-none">
        <button onClick={() => setActiveBranch(null)} className={`chip shrink-0 ${activeBranch === null ? 'chip-active' : ''}`}>All</button>
        <button onClick={() => setActiveBranch('campus')} className={`chip shrink-0 ${activeBranch === 'campus' ? 'chip-active' : ''}`}>Campus</button>
        {branches.map(b => (
          <button key={b.id} onClick={() => setActiveBranch(b.id)} className={`chip shrink-0 ${activeBranch === b.id ? 'chip-active' : ''}`}>{b.short_name}</button>
        ))}
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 lg:mx-0 lg:px-0 scrollbar-none">
        {categoryTabs.map(c => {
          const Icon = c.icon
          return (
            <button key={c.id} onClick={() => handleTabChange(c.id)} className={`chip shrink-0 ${activeTab === c.id ? 'chip-active' : ''}`}>
              <Icon className="w-3.5 h-3.5" /> {c.label}
            </button>
          )
        })}
      </div>

      {loading ? (
        <SkeletonList count={4} />
      ) : error ? (
        <ErrorState onRetry={loadData} />
      ) : posts.length === 0 ? (
        <EmptyState
          icon={<Flame className="w-7 h-7" />}
          title="No gossip yet"
          description="Be the first to share some campus buzz."
          action={<button onClick={openCreateSheet} className="btn-primary text-sm">Create Post</button>}
        />
      ) : (
        <div className="space-y-3">
          {posts.map(g => (
            <article key={g.id} className="card p-4">
              <div className="flex items-center gap-3 mb-3">
                <HiddenAvatar seed={g.hidden_profile?.avatar_seed || ''} style={g.hidden_profile?.avatar_style} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white font-mono">{g.hidden_profile?.anonymous_code || 'ZL-????'}</p>
                  <p className="text-xs text-gray-500">{timeAgo(g.created_at)}</p>
                </div>
                {g.category && <span className="chip text-xs shrink-0">{g.category}</span>}
                {!g.branch_id && <span className="text-[10px] text-zeal-400 bg-zeal-500/10 px-1.5 py-0.5 rounded-full shrink-0">Campus</span>}
                {g.branch_id && branches.find(b => b.id === g.branch_id) && (
                  <span className="text-[10px] text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded-full shrink-0">
                    {branches.find(b => b.id === g.branch_id)?.short_name}
                  </span>
                )}
                <button onClick={() => openReport(g.id)} className="text-gray-500 hover:text-rose-400 p-1.5 min-w-[36px] min-h-[36px] flex items-center justify-center shrink-0">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>
              <p className="text-gray-200 text-sm leading-relaxed">{g.content}</p>
              {g.image_url && (
                <img src={g.image_url} alt="gossip" className="rounded-xl w-full mt-3 max-h-80 object-cover" loading="lazy" />
              )}
              <div className="flex items-center gap-4 mt-3 text-gray-500">
                <span className="flex items-center gap-1.5 text-xs"><Eye className="w-4 h-4" /> {formatNumber(g.view_count)}</span>
                <button onClick={() => handleLike(g)} className={`flex items-center gap-1.5 text-xs transition-colors ${likedIds.has(g.id) ? 'text-rose-400' : 'hover:text-rose-400'}`}>
                  <Heart className={`w-4 h-4 ${likedIds.has(g.id) ? 'fill-rose-400' : ''}`} /> {formatNumber(g.like_count)}
                </button>
                <span className="flex items-center gap-1.5 text-xs"><MessageCircle className="w-4 h-4" /> {formatNumber(g.comment_count)}</span>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Create Gossip Sheet */}
      <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Post Gossip">
        {!hiddenProfileChecked ? (
          <div className="text-center py-8 text-gray-500">Checking profile...</div>
        ) : !hiddenProfile ? (
          <div className="text-center py-8 space-y-3">
            <p className="text-gray-300">Create your Zeal Avatar first to post anonymously.</p>
            <a href="/settings" className="btn-primary inline-block text-sm">Go to Settings</a>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <HiddenAvatar seed={hiddenProfile.code} size="sm" />
              <span>Posting as <span className="font-mono text-white">{hiddenProfile.code}</span></span>
            </div>

            {/* Scope: Campus or My Department */}
            {userBranch && (
              <div>
                <p className="text-xs text-gray-500 mb-2">Post to</p>
                <div className="flex gap-2">
                  <button onClick={() => setPostScope('campus')}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${postScope === 'campus' ? 'bg-zeal-500 text-white' : 'bg-ink-800 border border-ink-700 text-gray-400'}`}>
                    🌐 Campus
                  </button>
                  <button onClick={() => setPostScope('department')}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${postScope === 'department' ? 'bg-zeal-500 text-white' : 'bg-ink-800 border border-ink-700 text-gray-400'}`}>
                    🏫 {userBranch.short_name}
                  </button>
                </div>
              </div>
            )}
            {!userBranch && (
              <p className="text-xs text-gray-600">Posting to Campus (no department set in profile)</p>
            )}

            <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="What's the buzz?" rows={4} maxLength={2000} className="input w-full resize-none" />
            <div>
              <p className="text-xs text-gray-500 mb-2">Category</p>
              <div className="flex flex-wrap gap-2">
                {postCategories.map(c => (
                  <button key={c.id} onClick={() => setPostCategory(c.id)} className={`chip text-xs ${postCategory === c.id ? 'chip-active' : ''}`}>{c.label}</button>
                ))}
              </div>
            </div>
            <button onClick={handleCreate} disabled={!content.trim() || submitting}
              className="btn-primary w-full flex items-center justify-center gap-2 text-sm disabled:opacity-50">
              <Send className="w-4 h-4" /> {submitting ? 'Posting...' : 'Post Gossip'}
            </button>
          </div>
        )}
      </Sheet>

      {/* Report Sheet */}
      <Sheet open={reportSheetOpen} onClose={() => setReportSheetOpen(false)} title="Report Post">
        <div className="space-y-4">
          <p className="text-sm text-gray-400">Why are you reporting this?</p>
          <textarea value={reportReason} onChange={e => setReportReason(e.target.value)} placeholder="Reason for reporting..." rows={3} className="input w-full resize-none" />
          <button onClick={handleReport} disabled={!reportReason.trim() || reporting}
            className="btn-primary w-full text-sm disabled:opacity-50 flex items-center justify-center gap-2">
            <Flag className="w-4 h-4" /> {reporting ? 'Submitting...' : 'Submit Report'}
          </button>
        </div>
      </Sheet>
    </div>
  )
}
