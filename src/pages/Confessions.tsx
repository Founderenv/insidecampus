import { useState, useEffect, useCallback } from 'react'
import { Eye, Heart, MessageCircle, MoreHorizontal, Plus, Send, Flag } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { HiddenAvatar } from '@/components/HiddenAvatar'
import { SkeletonList } from '@/components/Skeleton'
import { EmptyState, ErrorState } from '@/components/States'
import { Sheet } from '@/components/Sheet'
import {
  fetchConfessions,
  createConfession,
  toggleConfessionLike,
  fetchConfessionLikeIds,
  fetchMyHiddenProfile,
  reportContent,
} from '@/lib/data'
import { timeAgo, formatNumber } from '@/lib/utils'
import type { Confession } from '@/types'

const categories = [
  { id: 'all', label: 'All' },
  { id: 'confession', label: 'Confession' },
  { id: 'crush', label: 'Crush' },
  { id: 'secret', label: 'Secret' },
  { id: 'funny', label: 'Funny' },
  { id: 'advice', label: 'Advice' },
  { id: 'rant', label: 'Rant' },
]

const categoryColors: Record<string, string> = {
  confession: 'text-rose-400 bg-rose-400/10',
  crush: 'text-pink-400 bg-pink-400/10',
  secret: 'text-purple-400 bg-purple-400/10',
  funny: 'text-yellow-400 bg-yellow-400/10',
  advice: 'text-blue-400 bg-blue-400/10',
  rant: 'text-orange-400 bg-orange-400/10',
}

const postCategories = [
  { id: 'confession', label: 'Confession' },
  { id: 'crush', label: 'Crush' },
  { id: 'secret', label: 'Secret' },
  { id: 'funny', label: 'Funny' },
  { id: 'advice', label: 'Advice' },
  { id: 'rant', label: 'Rant' },
]

export function Confessions() {
  const { user } = useAuth()
  const [posts, setPosts] = useState<Confession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [activeCategory, setActiveCategory] = useState('all')
  const [sortBy, setSortBy] = useState<'latest' | 'trending'>('latest')
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set())

  const [sheetOpen, setSheetOpen] = useState(false)
  const [content, setContent] = useState('')
  const [postCategory, setPostCategory] = useState('confession')
  const [submitting, setSubmitting] = useState(false)
  const [hiddenProfile, setHiddenProfile] = useState<{ id: string; code: string } | null>(null)
  const [hiddenProfileChecked, setHiddenProfileChecked] = useState(false)

  const [reportSheetOpen, setReportSheetOpen] = useState(false)
  const [reportTargetId, setReportTargetId] = useState('')
  const [reportReason, setReportReason] = useState('')
  const [reporting, setReporting] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const cat = activeCategory === 'all' ? undefined : activeCategory
      const data = await fetchConfessions(cat, sortBy)
      setPosts(data)
      if (user) {
        const ids = await fetchConfessionLikeIds(user.id)
        setLikedIds(ids)
      }
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [activeCategory, sortBy, user])

  useEffect(() => { loadData() }, [loadData])

  const openCreateSheet = async () => {
    if (!user) return
    setHiddenProfileChecked(false)
    setSheetOpen(true)
    try {
      const hp = await fetchMyHiddenProfile(user.id)
      if (hp) {
        setHiddenProfile({ id: hp.id, code: hp.anonymous_code })
      } else {
        setHiddenProfile(null)
      }
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
      await createConfession(hiddenProfile.id, content.trim(), postCategory)
      setContent('')
      setPostCategory('confession')
      setSheetOpen(false)
      loadData()
    } catch (err) {
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleLike = async (c: Confession) => {
    if (!user) return
    const isLiked = likedIds.has(c.id)
    setLikedIds(prev => {
      const next = new Set(prev)
      if (isLiked) next.delete(c.id)
      else next.add(c.id)
      return next
    })
    setPosts(prev => prev.map(p => p.id === c.id ? { ...p, like_count: p.like_count + (isLiked ? -1 : 1) } : p))
    try {
      await toggleConfessionLike(c.id, user.id, isLiked)
    } catch {
      setLikedIds(prev => {
        const next = new Set(prev)
        if (isLiked) next.add(c.id)
        else next.delete(c.id)
        return next
      })
      setPosts(prev => prev.map(p => p.id === c.id ? { ...p, like_count: p.like_count + (isLiked ? 1 : -1) } : p))
    }
  }

  const openReport = (id: string) => {
    setReportTargetId(id)
    setReportReason('')
    setReportSheetOpen(true)
  }

  const handleReport = async () => {
    if (!user || !reportReason.trim()) return
    setReporting(true)
    try {
      await reportContent(user.id, 'confession', reportTargetId, reportReason.trim())
      setReportSheetOpen(false)
    } catch (err) {
      console.error(err)
    } finally {
      setReporting(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-white mb-1 flex items-center gap-2">
            <Eye className="w-7 h-7 text-rose-400" /> Confessions
          </h1>
          <p className="text-gray-500 text-sm">Anonymous confessions, secrets, and more. Your identity is hidden.</p>
        </div>
        <button onClick={openCreateSheet} className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> Post
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {categories.map(c => (
          <button
            key={c.id}
            onClick={() => setActiveCategory(c.id)}
            className={`chip shrink-0 ${activeCategory === c.id ? 'chip-active' : ''}`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setSortBy('latest')}
          className={`chip text-xs ${sortBy === 'latest' ? 'chip-active' : ''}`}
        >
          Latest
        </button>
        <button
          onClick={() => setSortBy('trending')}
          className={`chip text-xs ${sortBy === 'trending' ? 'chip-active' : ''}`}
        >
          Trending
        </button>
      </div>

      {loading ? (
        <SkeletonList count={4} />
      ) : error ? (
        <ErrorState onRetry={loadData} />
      ) : posts.length === 0 ? (
        <EmptyState
          icon={<Eye className="w-7 h-7" />}
          title="No confessions"
          description="Be the first to share something anonymously."
          action={<button onClick={openCreateSheet} className="btn-primary text-sm">Post Confession</button>}
        />
      ) : (
        <div className="space-y-3">
          {posts.map(c => (
            <article key={c.id} className="card p-4">
              <div className="flex items-center gap-3 mb-3">
                <HiddenAvatar seed={c.hidden_profile?.avatar_seed || ''} style={c.hidden_profile?.avatar_style} size="sm" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white font-mono">{c.hidden_profile?.anonymous_code || 'ZL-????'}</p>
                  <p className="text-xs text-gray-500">{timeAgo(c.created_at)}</p>
                </div>
                {c.category && (
                  <span className={`chip text-xs ${categoryColors[c.category] || 'text-gray-400 bg-gray-400/10'}`}>{c.category}</span>
                )}
                <button onClick={() => openReport(c.id)} className="text-gray-500 hover:text-rose-400 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center">
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </div>
              <p className="text-gray-200 text-sm leading-relaxed">{c.content}</p>
              <div className="flex items-center gap-4 mt-3 text-gray-500">
                <button
                  onClick={() => handleLike(c)}
                  className={`flex items-center gap-1.5 text-xs transition-colors ${likedIds.has(c.id) ? 'text-rose-400' : 'hover:text-rose-400'}`}
                >
                  <Heart className={`w-4 h-4 ${likedIds.has(c.id) ? 'fill-rose-400' : ''}`} /> {formatNumber(c.like_count)}
                </button>
                <span className="flex items-center gap-1.5 text-xs">
                  <MessageCircle className="w-4 h-4" /> {formatNumber(c.comment_count)}
                </span>
              </div>
            </article>
          ))}
        </div>
      )}

      <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Post Confession">
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
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Share your confession anonymously..."
              rows={4}
              maxLength={2000}
              className="input w-full resize-none"
            />
            <div>
              <p className="text-xs text-gray-500 mb-2">Category</p>
              <div className="flex flex-wrap gap-2">
                {postCategories.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setPostCategory(c.id)}
                    className={`chip text-xs ${postCategory === c.id ? 'chip-active' : ''}`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={handleCreate}
              disabled={!content.trim() || submitting}
              className="btn-primary w-full flex items-center justify-center gap-2 text-sm disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {submitting ? 'Posting...' : 'Post Confession'}
            </button>
          </div>
        )}
      </Sheet>

      <Sheet open={reportSheetOpen} onClose={() => setReportSheetOpen(false)} title="Report Confession">
        <div className="space-y-4">
          <p className="text-sm text-gray-400">Why are you reporting this?</p>
          <textarea
            value={reportReason}
            onChange={e => setReportReason(e.target.value)}
            placeholder="Reason for reporting..."
            rows={3}
            className="input w-full resize-none"
          />
          <button
            onClick={handleReport}
            disabled={!reportReason.trim() || reporting}
            className="btn-primary w-full text-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Flag className="w-4 h-4" />
            {reporting ? 'Submitting...' : 'Submit Report'}
          </button>
        </div>
      </Sheet>
    </div>
  )
}
