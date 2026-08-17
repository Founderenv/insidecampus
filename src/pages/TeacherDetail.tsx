import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Star, ArrowLeft, ThumbsUp, Flag, Plus, Send } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { HiddenAvatar } from '@/components/HiddenAvatar'
import { SkeletonList } from '@/components/Skeleton'
import { EmptyState, ErrorState } from '@/components/States'
import { Sheet } from '@/components/Sheet'
import {
  fetchTeacherById,
  fetchTeacherReviews,
  createTeacherReview,
  toggleReviewLike,
  fetchReviewLikeIds,
  fetchMyHiddenProfile,
  reportContent,
} from '@/lib/data'
import { timeAgo } from '@/lib/utils'
import type { Teacher, TeacherReview } from '@/types'

const ratingLabels = [
  { key: 'teaching', label: 'Teaching' },
  { key: 'explanation', label: 'Explanation' },
  { key: 'approachability', label: 'Approachability' },
  { key: 'practical', label: 'Practical Help' },
] as const

export function TeacherDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [teacher, setTeacher] = useState<Teacher | null>(null)
  const [reviews, setReviews] = useState<TeacherReview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set())

  const [sheetOpen, setSheetOpen] = useState(false)
  const [reviewContent, setReviewContent] = useState('')
  const [ratings, setRatings] = useState({ teaching: 3, explanation: 3, approachability: 3, practical: 3 })
  const [submitting, setSubmitting] = useState(false)
  const [hiddenProfile, setHiddenProfile] = useState<{ id: string; code: string } | null>(null)
  const [hiddenProfileChecked, setHiddenProfileChecked] = useState(false)

  const [reportSheetOpen, setReportSheetOpen] = useState(false)
  const [reportTargetId, setReportTargetId] = useState('')
  const [reportReason, setReportReason] = useState('')
  const [reporting, setReporting] = useState(false)

  const loadData = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(false)
    try {
      const [teacher, revs] = await Promise.all([fetchTeacherById(id) as any, fetchTeacherReviews(id)])
      if (!teacher) { setError(true); return }
      setTeacher(teacher as any)
      setReviews(revs)
      if (user) {
        const ids = await fetchReviewLikeIds(user.id)
        setLikedIds(ids)
      }
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [id, user])

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
    if (!hiddenProfile || !id) return
    setSubmitting(true)
    try {
      await createTeacherReview(id, hiddenProfile.id, ratings, reviewContent.trim())
      setReviewContent('')
      setRatings({ teaching: 3, explanation: 3, approachability: 3, practical: 3 })
      setSheetOpen(false)
      loadData()
    } catch (err) {
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleLike = async (r: TeacherReview) => {
    if (!user) return
    const isLiked = likedIds.has(r.id)
    setLikedIds(prev => {
      const next = new Set(prev)
      if (isLiked) next.delete(r.id)
      else next.add(r.id)
      return next
    })
    setReviews(prev => prev.map(rev => rev.id === r.id ? { ...rev, helpful_count: rev.helpful_count + (isLiked ? -1 : 1) } : rev))
    try {
      await toggleReviewLike(r.id, user.id, isLiked)
    } catch {
      setLikedIds(prev => {
        const next = new Set(prev)
        if (isLiked) next.add(r.id)
        else next.delete(r.id)
        return next
      })
      setReviews(prev => prev.map(rev => rev.id === r.id ? { ...rev, helpful_count: rev.helpful_count + (isLiked ? 1 : -1) } : rev))
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
      await reportContent(user.id, 'teacher_review', reportTargetId, reportReason.trim())
      setReportSheetOpen(false)
    } catch (err) {
      console.error(err)
    } finally {
      setReporting(false)
    }
  }

  const starRow = (val: number) =>
    Array.from({ length: 5 }).map((_, i) => (
      <Star key={i} className={`w-3 h-3 ${i < Math.round(val) ? 'fill-zeal-500 text-zeal-500' : 'text-ink-600'}`} />
    ))

  if (loading) return <SkeletonList count={3} />
  if (error || !teacher) return <ErrorState title="Teacher not found" onRetry={() => navigate('/teachers')} />

  return (
    <div className="space-y-5">
      <button onClick={() => navigate('/teachers')} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white">
        <ArrowLeft className="w-4 h-4" /> Back to teachers
      </button>

      <div className="card p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-ink-800 flex items-center justify-center">
            {teacher.image_url ? (
              <img src={teacher.image_url} alt={teacher.name} className="w-16 h-16 rounded-2xl object-cover" />
            ) : (
              <span className="text-xl font-bold text-gray-400">{teacher.name.split(' ').map(w => w[0]).slice(0, 2).join('')}</span>
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-display font-bold text-white">{teacher.name}</h1>
            <p className="text-sm text-gray-500">{teacher.department}</p>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-zeal-500 text-zeal-500" />
                <span className="font-bold text-white">{Number(teacher.avg_overall).toFixed(1)}</span>
              </div>
              <span className="text-xs text-gray-500">· {teacher.review_count} reviews</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-5">
          {ratingLabels.map(r => {
            const val = teacher[r.key === 'teaching' ? 'avg_teaching' : r.key === 'explanation' ? 'avg_explanation' : r.key === 'approachability' ? 'avg_approachability' : 'avg_practical']
            return (
              <div key={r.key} className="p-3 rounded-xl bg-ink-800 border border-ink-700">
                <p className="text-xs text-gray-500">{r.label}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="font-bold text-white text-lg">{Number(val).toFixed(1)}</span>
                  <div className="flex">{starRow(val)}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <button onClick={openCreateSheet} className="btn-primary w-full flex items-center justify-center gap-2 text-sm">
        <Plus className="w-4 h-4" /> Write a Review
      </button>

      <div className="p-3 rounded-xl bg-ink-800/50 border border-ink-700 text-xs text-gray-500">
        Reviews are for academic experience only. Personal attacks will be removed.
      </div>

      <h2 className="text-lg font-semibold text-white">Reviews</h2>

      {reviews.length === 0 ? (
        <EmptyState
          icon={<Star className="w-7 h-7" />}
          title="No reviews yet"
          description="Be the first to review this teacher anonymously."
          action={<button onClick={openCreateSheet} className="btn-primary text-sm">Write Review</button>}
        />
      ) : (
        <div className="space-y-3">
          {reviews.map(r => {
            const avg = (r.rating_teaching + r.rating_explanation + r.rating_approachability + r.rating_practical) / 4
            return (
              <div key={r.id} className="card p-4">
                <div className="flex items-center gap-3 mb-3">
                  <HiddenAvatar seed={r.hidden_profile?.avatar_seed || ''} style={r.hidden_profile?.avatar_style} size="sm" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white font-mono">{r.hidden_profile?.anonymous_code || 'ZL-????'}</p>
                    <p className="text-xs text-gray-500">{timeAgo(r.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-zeal-500 text-zeal-500" />
                    <span className="font-bold text-white text-sm">{avg.toFixed(1)}</span>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {ratingLabels.map(rl => {
                    const val = r[rl.key === 'teaching' ? 'rating_teaching' : rl.key === 'explanation' ? 'rating_explanation' : rl.key === 'approachability' ? 'rating_approachability' : 'rating_practical']
                    return (
                      <div key={rl.key} className="text-center">
                        <p className="text-[10px] text-gray-500">{rl.label}</p>
                        <div className="flex justify-center mt-0.5">{starRow(val)}</div>
                      </div>
                    )
                  })}
                </div>
                {r.content && <p className="text-sm text-gray-300 mb-3">{r.content}</p>}
                <div className="flex items-center gap-4 text-gray-500">
                  <button
                    onClick={() => handleLike(r)}
                    className={`flex items-center gap-1.5 text-xs transition-colors ${likedIds.has(r.id) ? 'text-zeal-500' : 'hover:text-white'}`}
                  >
                    <ThumbsUp className={`w-4 h-4 ${likedIds.has(r.id) ? 'fill-zeal-500' : ''}`} /> Helpful ({r.helpful_count})
                  </button>
                  <button onClick={() => openReport(r.id)} className="flex items-center gap-1.5 text-xs hover:text-rose-400">
                    <Flag className="w-4 h-4" /> Report
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Write Review">
        {!hiddenProfileChecked ? (
          <div className="text-center py-8 text-gray-500">Checking profile...</div>
        ) : !hiddenProfile ? (
          <div className="text-center py-8 space-y-3">
            <p className="text-gray-300">Create your Zeal Avatar first to write a review.</p>
            <a href="/settings" className="btn-primary inline-block text-sm">Go to Settings</a>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <HiddenAvatar seed={hiddenProfile.code} size="sm" />
              <span>Reviewing as <span className="font-mono text-white">{hiddenProfile.code}</span></span>
            </div>

            {ratingLabels.map(rl => (
              <div key={rl.key}>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm text-gray-300">{rl.label}</label>
                  <span className="text-sm font-bold text-white">{ratings[rl.key]}/5</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={5}
                  step={1}
                  value={ratings[rl.key]}
                  onChange={e => setRatings(prev => ({ ...prev, [rl.key]: Number(e.target.value) }))}
                  className="w-full accent-zeal-500"
                />
                <div className="flex justify-between text-[10px] text-gray-600 px-0.5">
                  <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
                </div>
              </div>
            ))}

            <textarea
              value={reviewContent}
              onChange={e => setReviewContent(e.target.value)}
              placeholder="Share your experience with this teacher..."
              rows={4}
              maxLength={2000}
              className="input w-full resize-none"
            />
            <button
              onClick={handleCreate}
              disabled={submitting}
              className="btn-primary w-full flex items-center justify-center gap-2 text-sm disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {submitting ? 'Submitting...' : 'Submit Review'}
            </button>
          </div>
        )}
      </Sheet>

      <Sheet open={reportSheetOpen} onClose={() => setReportSheetOpen(false)} title="Report Review">
        <div className="space-y-4">
          <p className="text-sm text-gray-400">Why are you reporting this review?</p>
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
