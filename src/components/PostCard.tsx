import { useState } from 'react'
import { Heart, MessageCircle, Share2, Bookmark, MoreHorizontal, Flame, Check, Trash2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { Avatar } from '@/components/Avatar'
import { timeAgo, formatNumber } from '@/lib/utils'
import { toggleLike, toggleSave, deletePost } from '@/lib/data'
import { useAuth } from '@/context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { Sheet } from '@/components/Sheet'
import type { Post } from '@/types'

interface PostCardProps {
  post: Post
}

export function PostCard({ post }: PostCardProps) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [liked, setLiked] = useState(post.is_liked || false)
  const [saved, setSaved] = useState(post.is_saved || false)
  const [likeCount, setLikeCount] = useState(post.like_count)
  const [likeAnim, setLikeAnim] = useState(false)
  const [copied, setCopied] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [deleted, setDeleted] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const isOwner = user?.id === post.author_id

  const handleLike = async () => {
    if (!user) return
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
    if (!user) return
    const newSaved = !saved
    setSaved(newSaved)
    await toggleSave(post.id, user.id, !newSaved)
  }

  const handleShare = async () => {
    const url = `${window.location.origin}/post/${post.id}`
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

  const handleDelete = async () => {
    if (!user || !isOwner) return
    setDeleting(true)
    try {
      await deletePost(post.id, user.id)
      setMenuOpen(false)
      setDeleted(true)
    } catch {} finally {
      setDeleting(false)
    }
  }

  if (deleted) return null

  return (
    <article className="card p-4 animate-fade-in">
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
        {isOwner && (
          <button onClick={() => setMenuOpen(true)} className="text-gray-500 hover:text-white p-1">
            <MoreHorizontal className="w-5 h-5" />
          </button>
        )}
        {!isOwner && <span className="w-6" />}
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
      <div className="flex items-center gap-1 text-gray-500">
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
        <button
          onClick={() => navigate(`/post/${post.id}`)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-ink-800 transition-colors"
        >
          <MessageCircle className="w-5 h-5" />
          <span className="text-sm">{formatNumber(post.comment_count)}</span>
        </button>
        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-ink-800 transition-colors"
        >
          {copied ? <Check className="w-5 h-5 text-green-400" /> : <Share2 className="w-5 h-5" />}
          <span className={`text-sm ${copied ? 'text-green-400' : ''}`}>{copied ? 'Copied!' : ''}</span>
        </button>
        <button
          onClick={handleSave}
          className="ml-auto p-2 rounded-lg hover:bg-ink-800 transition-colors"
        >
          <Bookmark className={`w-5 h-5 transition-colors ${saved ? 'fill-zeal-500 text-zeal-500' : ''}`} />
        </button>
      </div>

      {post.view_count > 50 && (
        <div className="flex items-center gap-1 mt-2 text-xs text-gray-600">
          <Flame className="w-3 h-3 text-zeal-500" />
          <span>{formatNumber(post.view_count)} views</span>
        </div>
      )}

      {/* Owner menu */}
      <Sheet open={menuOpen} onClose={() => setMenuOpen(false)} title="Post Options">
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-rose-400 hover:bg-rose-500/10 transition-colors text-left disabled:opacity-50"
        >
          <Trash2 className="w-4 h-4" />
          {deleting ? 'Deleting...' : 'Delete post'}
        </button>
      </Sheet>
    </article>
  )
}
