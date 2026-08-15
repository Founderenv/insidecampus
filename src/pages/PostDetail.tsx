import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Heart, MessageCircle, Share2, Bookmark, Send, Flame, Loader2, AlertCircle, Check } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAuth } from '@/context/AuthContext'
import { Avatar } from '@/components/Avatar'
import { SkeletonList } from '@/components/Skeleton'
import { ErrorState } from '@/components/States'
import {
  fetchPostById, fetchComments, createComment,
  toggleLike, toggleSave, fetchLikedPostIds, fetchSavedPostIds,
  sanitizeText, validateInput, incrementPostViews,
} from '@/lib/data'
import { timeAgo, formatNumber } from '@/lib/utils'
import type { Post, Comment } from '@/types'

export function PostDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [post, setPost] = useState<Post | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [liked, setLiked] = useState(false)
  const [saved, setSaved] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [likeAnim, setLikeAnim] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [sending, setSending] = useState(false)
  const [commentError, setCommentError] = useState('')
  const [copied, setCopied] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    Promise.all([
      fetchPostById(id),
      fetchComments(id),
      user ? fetchLikedPostIds(user.id) : Promise.resolve(new Set<string>()),
      user ? fetchSavedPostIds(user.id) : Promise.resolve(new Set<string>()),
    ]).then(([p, c, likedIds, savedIds]) => {
      if (!p) { setError(true); return }
      setPost(p)
      setComments(c as Comment[])
      setLikeCount(p.like_count)
      setLiked(likedIds.has(p.id))
      setSaved(savedIds.has(p.id))
      incrementPostViews(p.id).catch(() => {})
    }).catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [id, user])

  const handleLike = async () => {
    if (!user || !post) return
    const newLiked = !liked
    setLiked(newLiked)
    setLikeCount(c => newLiked ? c + 1 : c - 1)
    if (newLiked) {
      setLikeAnim(true)
      setTimeout(() => setLikeAnim(false), 400)
    }
    await toggleLike(post.id, user.id, !newLiked)
  }

  const handleSave = async () => {
    if (!user || !post) return
    const newSaved = !saved
    setSaved(newSaved)
    await toggleSave(post.id, user.id, !newSaved)
  }

  const handleShare = async () => {
    const url = `${window.location.origin}/post/${post?.id}`
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Check this post on InsideZeal', url })
      } catch {}
    } else {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleComment = async () => {
    if (!user || !post || !commentText.trim()) return
    const sanitized = sanitizeText(commentText.trim())
    const validation = validateInput(sanitized, 'content')
    if (!validation.valid) {
      setCommentError(validation.error!)
      return
    }
    setSending(true)
    setCommentError('')
    try {
      const newComment = await createComment(post.id, user.id, sanitized)
      setComments(prev => [...prev, newComment as Comment])
      setCommentText('')
      setPost(prev => prev ? { ...prev, comment_count: prev.comment_count + 1 } : prev)
    } catch {
      setCommentError('Failed to post comment.')
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleComment()
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <SkeletonList count={2} />
      </div>
    )
  }

  if (error || !post) {
    return <ErrorState onRetry={() => window.location.reload()} />
  }

  return (
    <div className="space-y-4 pb-24 lg:pb-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-ink-800 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-400" />
        </button>
        <h1 className="text-lg font-semibold text-white">Post</h1>
      </div>

      {/* Post */}
      <article className="card p-4">
        {/* Author */}
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => navigate(`/profile/${post.author?.username}`)}>
            <Avatar src={post.author?.avatar_url} alt={post.author?.full_name || 'Unknown'} size="md" />
          </button>
          <div className="flex-1 min-w-0">
            <button
              onClick={() => navigate(`/profile/${post.author?.username}`)}
              className="font-semibold text-white text-sm hover:underline truncate block"
            >
              {post.author?.full_name}
            </button>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <span>@{post.author?.username}</span>
              <span>·</span>
              <span>{timeAgo(post.created_at)}</span>
            </div>
          </div>
        </div>

        {/* Content */}
        {post.content && (
          <p className="text-gray-200 text-sm leading-relaxed mb-3 whitespace-pre-wrap">{post.content}</p>
        )}

        {/* Media */}
        {post.media && post.media.length > 0 && (
          <div className={`grid gap-1 mb-3 ${post.media.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {post.media.map((m) => (
              <img
                key={m.id}
                src={m.media_url}
                alt="Post media"
                className="rounded-xl w-full max-h-96 object-cover"
                loading="lazy"
              />
            ))}
          </div>
        )}

        {/* Poll */}
        {post.post_type === 'poll' && post.poll_options && (
          <div className="space-y-2 mb-3">
            {post.poll_options.map((opt) => {
              const total = post.poll_options!.reduce((s, o) => s + o.vote_count, 0) || 1
              const pct = Math.round((opt.vote_count / total) * 100)
              return (
                <div key={opt.id} className="relative overflow-hidden rounded-xl bg-ink-800 border border-ink-700 px-4 py-3">
                  <div className="absolute inset-y-0 left-0 bg-zeal-500/15" style={{ width: `${pct}%` }} />
                  <div className="relative flex justify-between text-sm">
                    <span className="text-gray-200">{opt.label}</span>
                    <span className="text-gray-400 font-medium">{pct}%</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1 text-gray-500 border-t border-ink-700 pt-3 mt-3">
          <button
            onClick={handleLike}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-ink-800 transition-colors"
          >
            <motion.div animate={likeAnim ? { scale: [1, 1.3, 1] } : {}} transition={{ duration: 0.3 }}>
              <Heart
                className={`w-5 h-5 transition-colors ${liked ? 'fill-zeal-500 text-zeal-500' : ''}`}
              />
            </motion.div>
            <span className={`text-sm ${liked ? 'text-zeal-500' : ''}`}>{formatNumber(likeCount)}</span>
          </button>
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-ink-800 transition-colors">
            <MessageCircle className="w-5 h-5" />
            <span className="text-sm">{formatNumber(post.comment_count)}</span>
          </button>
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-ink-800 transition-colors"
          >
            {copied ? <Check className="w-5 h-5 text-green-400" /> : <Share2 className="w-5 h-5" />}
            <span className={`text-sm ${copied ? 'text-green-400' : ''}`}>{copied ? 'Copied!' : formatNumber(post.share_count)}</span>
          </button>
          <button
            onClick={handleSave}
            className="ml-auto p-2 rounded-lg hover:bg-ink-800 transition-colors"
          >
            <Bookmark className={`w-5 h-5 transition-colors ${saved ? 'fill-zeal-500 text-zeal-500' : ''}`} />
          </button>
        </div>

        {post.view_count > 0 && (
          <div className="flex items-center gap-1 mt-2 text-xs text-gray-600">
            <Flame className="w-3 h-3 text-zeal-500" />
            <span>{formatNumber(post.view_count)} views</span>
          </div>
        )}
      </article>

      {/* Comments */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-400 px-1">
          {comments.length === 0 ? 'No comments yet' : `${comments.length} comment${comments.length !== 1 ? 's' : ''}`}
        </h2>
        {comments.map(c => (
          <div key={c.id} className="card p-3">
            <div className="flex items-center gap-2.5 mb-2">
              <button onClick={() => navigate(`/profile/${c.author?.username}`)}>
                <Avatar src={c.author?.avatar_url} alt={c.author?.full_name || 'Unknown'} size="sm" />
              </button>
              <div className="flex-1 min-w-0">
                <button
                  onClick={() => navigate(`/profile/${c.author?.username}`)}
                  className="font-semibold text-white text-xs hover:underline truncate block"
                >
                  {c.author?.full_name}
                </button>
                <span className="text-[10px] text-gray-500">{timeAgo(c.created_at)}</span>
              </div>
            </div>
            <p className="text-gray-200 text-sm leading-relaxed">{c.content}</p>
          </div>
        ))}
      </div>

      {/* Comment input */}
      <div className="fixed bottom-20 lg:bottom-4 left-0 right-0 lg:left-auto lg:right-auto lg:relative lg:mt-2 z-30">
        <div className="max-w-2xl mx-auto px-4 lg:max-w-3xl lg:px-0">
          <div className="card p-3">
            <div className="flex items-end gap-2">
              {user && <Avatar src={user.user_metadata?.avatar_url} alt="You" size="sm" />}
              <textarea
                ref={inputRef}
                value={commentText}
                onChange={e => { setCommentText(e.target.value); setCommentError('') }}
                onKeyDown={handleKeyDown}
                placeholder="Write a comment..."
                rows={1}
                maxLength={2000}
                className="input text-sm py-2 resize-none flex-1 min-h-[36px] max-h-[120px]"
              />
              <button
                onClick={handleComment}
                disabled={!commentText.trim() || sending}
                className="p-2 rounded-xl bg-zeal-500 text-ink-950 disabled:opacity-40 disabled:pointer-events-none hover:bg-zeal-400 active:scale-95 transition-all"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
            {commentError && (
              <p className="text-red-400 text-xs mt-2 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {commentError}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
