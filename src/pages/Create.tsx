import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Image, X, Send, Loader2, AlertCircle, Vote, FileText } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Avatar } from '@/components/Avatar'
import { createPost, createPostWithMedia, createPollPost, uploadPostImage, validateImageFile, sanitizeText, validateInput } from '@/lib/data'

type CreateMode = 'menu' | 'post' | 'poll'

export function Create() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const [mode, setMode] = useState<CreateMode>('menu')
  const [content, setContent] = useState('')
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pollOptions, setPollOptions] = useState(['', ''])

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const validation = validateImageFile(file)
    if (!validation.valid) {
      setError(validation.error!)
      return
    }
    setImageFile(file)
    setError('')
    const reader = new FileReader()
    reader.onload = () => setImagePreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const removeImage = () => {
    setImageFile(null)
    setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmitPost = async () => {
    if (!user || (!content.trim() && !imageFile)) return
    const sanitized = sanitizeText(content.trim())
    if (sanitized) {
      const validation = validateInput(sanitized, 'content')
      if (!validation.valid) { setError(validation.error!); return }
    }
    setPosting(true)
    setError('')
    try {
      if (imageFile) {
        setUploading(true)
        const url = await uploadPostImage(user.id, imageFile)
        setUploading(false)
        await createPostWithMedia(user.id, sanitized, url)
      } else {
        await createPost(user.id, sanitized)
      }
      navigate('/home', { replace: true })
    } catch (err: any) {
      setError(err?.message || 'Failed to create post.')
      setPosting(false)
      setUploading(false)
    }
  }

  const handleSubmitPoll = async () => {
    if (!user || !content.trim()) return
    const sanitized = sanitizeText(content.trim())
    const validation = validateInput(sanitized, 'content')
    if (!validation.valid) { setError(validation.error!); return }
    const validOptions = pollOptions.map(o => o.trim()).filter(o => o.length > 0)
    if (validOptions.length < 2) {
      setError('Poll needs at least 2 options')
      return
    }
    if (validOptions.length > 4) {
      setError('Poll can have at most 4 options')
      return
    }
    setPosting(true)
    setError('')
    try {
      await createPollPost(user.id, sanitized, validOptions)
      navigate('/home', { replace: true })
    } catch (err: any) {
      setError(err?.message || 'Failed to create poll.')
      setPosting(false)
    }
  }

  const addPollOption = () => {
    if (pollOptions.length < 4) setPollOptions([...pollOptions, ''])
  }

  const removePollOption = (index: number) => {
    if (pollOptions.length > 2) setPollOptions(pollOptions.filter((_, i) => i !== index))
  }

  if (mode === 'menu') {
    return (
      <div className="space-y-4 pb-24 lg:pb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-ink-800 transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </button>
          <h1 className="text-lg font-semibold text-white">Create</h1>
        </div>
        <div className="space-y-2">
          <button onClick={() => setMode('post')} className="w-full card card-hover p-4 flex items-center gap-4 text-left">
            <div className="w-11 h-11 rounded-xl bg-ink-800 flex items-center justify-center text-zeal-500">
              <FileText className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-white text-sm">Post</p>
              <p className="text-xs text-gray-500">Share something with campus</p>
            </div>
          </button>
          <button onClick={() => setMode('poll')} className="w-full card card-hover p-4 flex items-center gap-4 text-left">
            <div className="w-11 h-11 rounded-xl bg-ink-800 flex items-center justify-center text-zeal-500">
              <Vote className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-white text-sm">Poll</p>
              <p className="text-xs text-gray-500">Ask the campus a question</p>
            </div>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-24 lg:pb-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => { setMode('menu'); setError(''); setContent(''); removeImage(); setPollOptions(['', '']) }} className="p-2 rounded-xl hover:bg-ink-800 transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </button>
          <h1 className="text-lg font-semibold text-white">{mode === 'poll' ? 'New Poll' : 'New Post'}</h1>
        </div>
        <button
          onClick={mode === 'poll' ? handleSubmitPoll : handleSubmitPost}
          disabled={posting}
          className="btn-primary text-sm py-2 px-4"
        >
          {uploading ? 'Uploading...' : posting ? 'Posting...' : 'Post'}
        </button>
      </div>

      {/* Composer */}
      <div className="card p-4">
        <div className="flex items-start gap-3">
          <Avatar src={profile?.avatar_url} alt={profile?.full_name || 'You'} size="md" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white mb-2">{profile?.full_name}</p>
            <textarea
              value={content}
              onChange={e => { setContent(e.target.value); setError('') }}
              placeholder={mode === 'poll' ? 'Ask a question...' : "What's on your mind?"}
              rows={3}
              className="w-full bg-transparent text-white text-sm placeholder:text-gray-500 outline-none resize-none leading-relaxed"
              autoFocus
            />
          </div>
        </div>

        {/* Image preview (post mode only) */}
        {mode === 'post' && imagePreview && (
          <div className="relative mt-3 rounded-xl overflow-hidden">
            <img src={imagePreview} alt="Preview" className="w-full max-h-80 object-cover" />
            <button onClick={removeImage} className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Poll options */}
        {mode === 'poll' && (
          <div className="space-y-2 mt-3">
            {pollOptions.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-5">{i + 1}.</span>
                <input
                  className="input text-sm py-2 flex-1"
                  value={opt}
                  onChange={e => { const next = [...pollOptions]; next[i] = e.target.value; setPollOptions(next) }}
                  placeholder={`Option ${i + 1}`}
                  maxLength={100}
                />
                {pollOptions.length > 2 && (
                  <button onClick={() => removePollOption(i)} className="text-gray-500 hover:text-red-400 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            {pollOptions.length < 4 && (
              <button onClick={addPollOption} className="text-sm text-zeal-500 hover:text-zeal-400 transition-colors">
                + Add option
              </button>
            )}
          </div>
        )}

        {uploading && (
          <div className="flex items-center gap-2 mt-3 text-sm text-zeal-500">
            <Loader2 className="w-4 h-4 animate-spin" /> Uploading image...
          </div>
        )}

        {error && (
          <p className="text-red-400 text-xs mt-2 px-1 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> {error}
          </p>
        )}
      </div>

      {/* Actions (post mode only) */}
      {mode === 'post' && (
        <div className="flex items-center gap-2 px-1">
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageSelect} className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} className="chip text-gray-400 hover:text-white transition-colors">
            <Image className="w-4 h-4" /> Photo
          </button>
        </div>
      )}

      {/* Hint */}
      <div className="card p-3 text-center">
        <p className="text-xs text-gray-500">
          Posting as <span className="text-zeal-500 font-medium">{profile?.full_name}</span> · Your real identity
        </p>
      </div>
    </div>
  )
}
