import { useState, useEffect, useRef, useCallback } from 'react'
import { Flame, Send, ArrowLeft, Users, Hash, Plus, Image, FileText, Music, Mic, X, Download, Play, Pause, StopCircle, Paperclip } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { Avatar } from '@/components/Avatar'
import { SkeletonList } from '@/components/Skeleton'
import { EmptyState } from '@/components/States'
import { Sheet } from '@/components/Sheet'
import {
  fetchGossipRooms, fetchChatMessages, sendChatMessage, fetchProfile,
  uploadGossipAttachment, getGossipAttachmentUrl,
  validateGossipFile, formatFileSize, formatDuration,
} from '@/lib/data'
import { timeAgo } from '@/lib/utils'
import type { ChatRoom, ChatMessage } from '@/types'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type DisplayMessage = {
  id: string
  author_id: string
  content: string
  created_at: string
  message_type: string
  attachment_path: string | null
  attachment_name: string | null
  attachment_mime: string | null
  attachment_size: number | null
  attachment_duration: number | null
  _signedUrl?: string
  author?: { full_name: string; avatar_url: string | null; username: string | null }
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const IMG_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const DOC_TYPES = [
  'application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
]
const AUD_TYPES = ['audio/mpeg', 'audio/mp4', 'audio/webm', 'audio/ogg', 'audio/wav']

function iconForMime(mime: string | null): string {
  if (!mime) return '📄'
  if (mime.startsWith('image/')) return '🖼️'
  if (mime === 'application/pdf') return '📕'
  if (mime.includes('word') || mime.includes('document')) return '📘'
  if (mime.includes('presentation') || mime.includes('powerpoint')) return '📙'
  if (mime.includes('sheet') || mime.includes('excel')) return '📗'
  if (mime.startsWith('audio/')) return '🎵'
  return '📄'
}

function extFromMime(mime: string): string {
  const m: Record<string, string> = {
    'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
    'application/pdf': 'pdf', 'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.ms-powerpoint': 'ppt',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
    'application/vnd.ms-excel': 'xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'text/plain': 'txt',
    'audio/mpeg': 'mp3', 'audio/mp4': 'm4a', 'audio/webm': 'webm',
    'audio/ogg': 'ogg', 'audio/wav': 'wav',
  }
  return m[mime] || 'bin'
}

/* ------------------------------------------------------------------ */
/*  Gossip Component                                                   */
/* ------------------------------------------------------------------ */

export function Gossip() {
  const { user, profile } = useAuth()

  // --- Room state ---
  const [rooms, setRooms] = useState<ChatRoom[]>([])
  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null)
  const [messages, setMessages] = useState<DisplayMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // --- Attachment sheet ---
  const [attachSheet, setAttachSheet] = useState(false)

  // --- Image preview ---
  const [imgFile, setImgFile] = useState<File | null>(null)
  const [imgPreview, setImgPreview] = useState<string | null>(null)

  // --- Document selected ---
  const [docFile, setDocFile] = useState<File | null>(null)

  // --- Audio selected ---
  const [audFile, setAudFile] = useState<File | null>(null)

  // --- Voice recording ---
  const [recording, setRecording] = useState(false)
  const [recordTime, setRecordTime] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordChunksRef = useRef<Blob[]>([])
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [recordBlob, setRecordBlob] = useState<Blob | null>(null)

  // --- Upload state ---
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  // --- Lightbox ---
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  // --- Signed URL cache ---
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({})

  // --- Audio player state ---
  const [playingId, setPlayingId] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [audioProgress, setAudioProgress] = useState(0)
  const [audioDuration, setAudioDuration] = useState(0)

  const deptName = profile?.branch_id ? 'Computer Engineering' : 'My Department'

  /* ---- Load rooms ---- */
  useEffect(() => {
    if (!user) { setLoading(false); return }
    fetchGossipRooms(user.id).then(r => { if (r.length > 0) setRooms(r) }).catch(() => {}).finally(() => setLoading(false))
  }, [user, deptName])

  /* ---- Load messages + realtime ---- */
  useEffect(() => {
    if (!activeRoom || !user) return

    fetchChatMessages(activeRoom.id).then(msgs => {
      setMessages(msgs.map(m => ({
        id: m.id, author_id: m.author_id, content: m.content, created_at: m.created_at,
        message_type: m.message_type || 'text',
        attachment_path: m.attachment_path, attachment_name: m.attachment_name,
        attachment_mime: m.attachment_mime, attachment_size: m.attachment_size,
        attachment_duration: m.attachment_duration,
        author: m.author ? { full_name: m.author.full_name, avatar_url: m.author.avatar_url, username: m.author.username } : undefined,
      })))
    }).catch(() => {})

    const channel = supabase
      .channel(`gossip-chat-${activeRoom.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'chat_messages',
        filter: `room_id=eq.${activeRoom.id}`,
      }, async (payload) => {
        const raw = payload.new as ChatMessage
        let author = undefined
        try { author = (await fetchProfile(raw.author_id)) ?? undefined } catch {}
        setMessages(prev => {
          if (prev.some(m => m.id === raw.id)) return prev
          return [...prev, {
            id: raw.id, author_id: raw.author_id, content: raw.content, created_at: raw.created_at,
            message_type: raw.message_type || 'text',
            attachment_path: raw.attachment_path, attachment_name: raw.attachment_name,
            attachment_mime: raw.attachment_mime, attachment_size: raw.attachment_size,
            attachment_duration: raw.attachment_duration,
            author: author ? { full_name: author.full_name, avatar_url: author.avatar_url, username: author.username } : undefined,
          }]
        })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [activeRoom, user])

  /* ---- Auto scroll ---- */
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  /* ---- Resolve signed URLs for attachment messages ---- */
  useEffect(() => {
    if (!messages.length) return
    const need = messages.filter(m => m.attachment_path && !signedUrls[m.id] && m.attachment_path)
    if (!need.length) return
    need.forEach(m => {
      if (!m.attachment_path) return
      getGossipAttachmentUrl(m.attachment_path).then(url => {
        setSignedUrls(prev => ({ ...prev, [m.id]: url }))
      }).catch(() => {})
    })
  }, [messages, signedUrls])

  /* ---- Cleanup object URLs ---- */
  useEffect(() => {
    return () => { if (imgPreview) URL.revokeObjectURL(imgPreview) }
  }, [imgPreview])

  /* ---- Cleanup voice recording on unmount ---- */
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
      if (recordTimerRef.current) clearInterval(recordTimerRef.current)
      mediaRecorderRef.current?.stream.getTracks().forEach(t => t.stop())
    }
  }, [])

  /* ---- Audio player cleanup ---- */
  useEffect(() => {
    return () => { audioRef.current?.pause(); audioRef.current = null }
  }, [])

  /* ================================================================ */
  /*  HANDLERS                                                         */
  /* ================================================================ */

  /** Send text message */
  const handleSendText = async () => {
    if (!input.trim() || !user || !activeRoom) return
    setSending(true)
    const content = input.trim()
    setInput('')
    try { await sendChatMessage(activeRoom.id, user.id, content) }
    catch { setInput(content) }
    finally { setSending(false) }
  }

  /** Send attachment (image / document / audio) */
  const handleSendAttachment = async (file: File, type: 'image' | 'document' | 'audio') => {
    if (!user || !activeRoom) return
    const validation = validateGossipFile(file, type)
    if (!validation.valid) { setUploadError(validation.error!); return }
    setUploading(true)
    setUploadError(null)
    try {
      const { path } = await uploadGossipAttachment(activeRoom.id, user.id, file)
      const msgType = type === 'image' ? 'image' : type === 'document' ? 'document' : 'audio'
      await sendChatMessage(activeRoom.id, user.id, file.name, msgType, {
        path, name: file.name, mime: file.type, size: file.size,
      })
      clearAttachmentState()
    } catch (e) {
      setUploadError('Upload failed. Try again.')
    } finally {
      setUploading(false)
    }
  }

  /** Send voice note */
  const handleSendVoice = async () => {
    if (!recordBlob || !user || !activeRoom) return
    setUploading(true)
    setUploadError(null)
    try {
      const ext = extFromMime(recordBlob.type || 'audio/webm')
      const file = new File([recordBlob], `voice-${Date.now()}.${ext}`, { type: recordBlob.type || 'audio/webm' })
      const { path } = await uploadGossipAttachment(activeRoom.id, user.id, file)
      await sendChatMessage(activeRoom.id, user.id, 'Voice note', 'voice', {
        path, name: file.name, mime: file.type, size: file.size, duration: recordTime * 1000,
      })
      clearAttachmentState()
    } catch {
      setUploadError('Upload failed. Try again.')
    } finally {
      setUploading(false)
      setRecordBlob(null)
    }
  }

  /** Clear all attachment states */
  const clearAttachmentState = () => {
    setAttachSheet(false)
    setImgFile(null); if (imgPreview) URL.revokeObjectURL(imgPreview); setImgPreview(null)
    setDocFile(null)
    setAudFile(null)
    setRecordBlob(null); setRecordTime(0)
    setUploadError(null)
  }

  /* ---- Voice Recording ---- */
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : undefined })
      recordChunksRef.current = []
      mr.ondataavailable = e => { if (e.data.size > 0) recordChunksRef.current.push(e.data) }
      mr.onstop = () => {
        const blob = new Blob(recordChunksRef.current, { type: mr.mimeType || 'audio/webm' })
        setRecordBlob(blob)
        stream.getTracks().forEach(t => t.stop())
      }
      mediaRecorderRef.current = mr
      mr.start()
      setRecording(true)
      setRecordTime(0)
      recordTimerRef.current = setInterval(() => setRecordTime(t => t + 1), 1000)
    } catch {
      setUploadError('Microphone permission is required to record a voice note.')
    }
  }

  const stopRecording = (cancel: boolean) => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    if (recordTimerRef.current) { clearInterval(recordTimerRef.current); recordTimerRef.current = null }
    setRecording(false)
    if (cancel) { setRecordBlob(null); setRecordTime(0) }
  }

  /* ---- File pickers ---- */
  const pickImage = () => {
    const inp = document.createElement('input')
    inp.type = 'file'; inp.accept = 'image/jpeg,image/png,image/webp'
    inp.onchange = (e) => {
      const f = (e.target as HTMLInputElement).files?.[0]
      if (f) {
        const v = validateGossipFile(f, 'image')
        if (!v.valid) { setUploadError(v.error!); return }
        setImgFile(f); setImgPreview(URL.createObjectURL(f)); setAttachSheet(false)
      }
    }
    inp.click()
  }

  const pickDocument = () => {
    const inp = document.createElement('input')
    inp.type = 'file'
    inp.accept = '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain'
    inp.onchange = (e) => {
      const f = (e.target as HTMLInputElement).files?.[0]
      if (f) {
        const v = validateGossipFile(f, 'document')
        if (!v.valid) { setUploadError(v.error!); return }
        setDocFile(f); setAttachSheet(false)
      }
    }
    inp.click()
  }

  const pickAudio = () => {
    const inp = document.createElement('input')
    inp.type = 'file'; inp.accept = 'audio/mpeg,audio/mp4,audio/webm,audio/ogg,audio/wav'
    inp.onchange = (e) => {
      const f = (e.target as HTMLInputElement).files?.[0]
      if (f) {
        const v = validateGossipFile(f, 'audio')
        if (!v.valid) { setUploadError(v.error!); return }
        setAudFile(f); setAttachSheet(false)
      }
    }
    inp.click()
  }

  /* ---- Audio player ---- */
  const toggleAudio = (msgId: string, url: string) => {
    if (playingId === msgId) {
      audioRef.current?.pause()
      setPlayingId(null); setAudioProgress(0); setAudioDuration(0)
    } else {
      audioRef.current?.pause()
      const a = new Audio(url)
      a.onloadedmetadata = () => setAudioDuration(a.duration)
      a.ontimeupdate = () => setAudioProgress(a.currentTime)
      a.onended = () => { setPlayingId(null); setAudioProgress(0); setAudioDuration(0) }
      a.play().catch(() => {})
      audioRef.current = a
      setPlayingId(msgId)
    }
  }

  /* ================================================================ */
  /*  RENDER: CHAT VIEW                                                */
  /* ================================================================ */

  if (loading) return <SkeletonList count={3} />

  if (activeRoom) {
    const hasAttachment = imgFile || docFile || audFile || recordBlob

    return (
      <div className="flex flex-col" style={{ height: 'calc(100vh - 8rem)' }}>
        {/* ---- Chat Header ---- */}
        <div className="flex items-center gap-3 pb-3 border-b border-ink-800 shrink-0">
          <button onClick={() => { setActiveRoom(null); clearAttachmentState() }} className="text-gray-400 hover:text-white p-1">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-10 h-10 rounded-xl bg-ink-800 flex items-center justify-center text-xl shrink-0">
            {activeRoom.icon || '💬'}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-white text-sm">{activeRoom.name}</h2>
            <p className="text-xs text-gray-500">{activeRoom.member_count} members</p>
          </div>
        </div>

        {/* ---- Lightbox ---- */}
        {lightboxUrl && (
          <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4" onClick={() => setLightboxUrl(null)}>
            <button className="absolute top-4 right-4 text-white/70 hover:text-white" onClick={() => setLightboxUrl(null)}>
              <X className="w-6 h-6" />
            </button>
            <img src={lightboxUrl} alt="Full size" className="max-w-full max-h-full object-contain rounded-lg" onClick={e => e.stopPropagation()} />
          </div>
        )}

        {/* ---- Messages ---- */}
        <div className="flex-1 overflow-y-auto space-y-3 py-3 min-h-0">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <Users className="w-10 h-10 text-gray-600 mb-3" />
              <p className="text-sm text-gray-400">No messages yet</p>
              <p className="text-xs text-gray-600 mt-1">Start the conversation!</p>
            </div>
          ) : (
            messages.map(msg => {
              const isOwn = msg.author_id === user?.id
              return (
                <div key={msg.id} className={`flex gap-2.5 ${isOwn ? 'flex-row-reverse' : ''}`}>
                  <Avatar src={msg.author?.avatar_url || null} alt={msg.author?.full_name || ''} size="sm" />
                  <div className={`max-w-[75%] min-w-0 ${isOwn ? 'text-right' : ''}`}>
                    {!isOwn && <p className="text-xs text-gray-400 mb-0.5 font-medium">{msg.author?.full_name}</p>}

                    {/* -- Text message -- */}
                    {msg.message_type === 'text' && (
                      <div className={`rounded-2xl px-3.5 py-2.5 text-sm ${isOwn ? 'bg-zeal-500 text-ink-950' : 'bg-ink-800 text-gray-200'}`}>
                        {msg.content}
                      </div>
                    )}

                    {/* -- Image message -- */}
                    {msg.message_type === 'image' && msg.attachment_path && (
                      <div className={`rounded-2xl overflow-hidden ${isOwn ? 'bg-zeal-500/10' : 'bg-ink-800'}`}>
                        {signedUrls[msg.id] ? (
                          <img
                            src={signedUrls[msg.id]}
                            alt={msg.attachment_name || 'Image'}
                            className="max-w-full max-h-[300px] object-cover cursor-pointer"
                            onClick={() => signedUrls[msg.id] && setLightboxUrl(signedUrls[msg.id])}
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-48 h-32 bg-ink-700 animate-pulse rounded" />
                        )}
                        {msg.attachment_name && (
                          <p className={`text-[10px] px-3 py-1.5 truncate ${isOwn ? 'text-ink-950/60' : 'text-gray-500'}`}>{msg.attachment_name}</p>
                        )}
                      </div>
                    )}

                    {/* -- Document message -- */}
                    {msg.message_type === 'document' && (
                      <div className={`rounded-2xl px-3.5 py-3 flex items-center gap-3 ${isOwn ? 'bg-zeal-500/15 border border-zeal-500/30' : 'bg-ink-800 border border-ink-700'}`}>
                        <div className="w-10 h-10 rounded-xl bg-ink-700 flex items-center justify-center text-lg shrink-0">
                          {iconForMime(msg.attachment_mime)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${isOwn ? 'text-ink-950' : 'text-white'}`}>{msg.attachment_name || 'File'}</p>
                          <p className={`text-[10px] ${isOwn ? 'text-ink-950/50' : 'text-gray-500'}`}>
                            {msg.attachment_size ? formatFileSize(msg.attachment_size) : ''} {msg.attachment_mime ? `· ${extFromMime(msg.attachment_mime).toUpperCase()}` : ''}
                          </p>
                        </div>
                        {signedUrls[msg.id] && (
                          <a href={signedUrls[msg.id]} download={msg.attachment_name} target="_blank" rel="noopener noreferrer"
                            className={`p-2 rounded-lg shrink-0 ${isOwn ? 'text-ink-950/60 hover:text-ink-950' : 'text-gray-400 hover:text-white'}`}>
                            <Download className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    )}

                    {/* -- Audio message -- */}
                    {msg.message_type === 'audio' && (
                      <div className={`rounded-2xl px-3.5 py-3 ${isOwn ? 'bg-zeal-500/15 border border-zeal-500/30' : 'bg-ink-800 border border-ink-700'}`}>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => signedUrls[msg.id] && toggleAudio(msg.id, signedUrls[msg.id])}
                            className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${isOwn ? 'bg-zeal-500 text-ink-950' : 'bg-zeal-500 text-ink-950'}`}
                          >
                            {playingId === msg.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                          </button>
                          <div className="flex-1 min-w-0">
                            {playingId === msg.id ? (
                              <div className="h-1 bg-ink-600 rounded-full overflow-hidden">
                                <div className="h-full bg-zeal-500 rounded-full transition-all" style={{ width: `${audioDuration ? (audioProgress / audioDuration) * 100 : 0}%` }} />
                              </div>
                            ) : (
                              <div className="h-1 bg-ink-600 rounded-full" />
                            )}
                          </div>
                          <span className={`text-[10px] tabular-nums shrink-0 ${isOwn ? 'text-ink-950/60' : 'text-gray-500'}`}>
                            {playingId === msg.id ? formatDuration(audioProgress * 1000) : (msg.attachment_duration ? formatDuration(msg.attachment_duration) : '0:00')}
                          </span>
                        </div>
                        {msg.attachment_name && (
                          <p className={`text-[10px] mt-1.5 truncate ${isOwn ? 'text-ink-950/40' : 'text-gray-600'}`}>{msg.attachment_name}</p>
                        )}
                      </div>
                    )}

                    {/* -- Voice note -- */}
                    {msg.message_type === 'voice' && (
                      <div className={`rounded-2xl px-3.5 py-3 ${isOwn ? 'bg-zeal-500/15 border border-zeal-500/30' : 'bg-ink-800 border border-ink-700'}`}>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => signedUrls[msg.id] && toggleAudio(msg.id, signedUrls[msg.id])}
                            className="w-9 h-9 rounded-full bg-zeal-500 text-ink-950 flex items-center justify-center shrink-0"
                          >
                            {playingId === msg.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                          </button>
                          <div className="flex-1 min-w-0">
                            {playingId === msg.id ? (
                              <div className="h-1 bg-ink-600 rounded-full overflow-hidden">
                                <div className="h-full bg-zeal-500 rounded-full transition-all" style={{ width: `${audioDuration ? (audioProgress / audioDuration) * 100 : 0}%` }} />
                              </div>
                            ) : (
                              <div className="h-1 bg-ink-600 rounded-full" />
                            )}
                          </div>
                          <span className={`text-[10px] tabular-nums shrink-0 ${isOwn ? 'text-ink-950/60' : 'text-gray-500'}`}>
                            {playingId === msg.id ? formatDuration(audioProgress * 1000) : (msg.attachment_duration ? formatDuration(msg.attachment_duration) : '0:00')}
                          </span>
                        </div>
                      </div>
                    )}

                    <p className="text-[10px] text-gray-600 mt-0.5">{timeAgo(msg.created_at)}</p>
                  </div>
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* ---- Upload error toast ---- */}
        {uploadError && (
          <div className="mx-2 mb-2 px-3 py-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs flex items-center justify-between shrink-0">
            <span>{uploadError}</span>
            <button onClick={() => setUploadError(null)} className="ml-2"><X className="w-3.5 h-3.5" /></button>
          </div>
        )}

        {/* ---- Image preview before send ---- */}
        {imgPreview && (
          <div className="mx-2 mb-2 p-2 rounded-xl bg-ink-850 border border-ink-700 flex items-center gap-3 shrink-0">
            <img src={imgPreview} alt="Preview" className="w-16 h-16 rounded-lg object-cover" />
            <p className="text-xs text-gray-400 flex-1 truncate">{imgFile?.name}</p>
            <button onClick={() => { setImgFile(null); URL.revokeObjectURL(imgPreview); setImgPreview(null) }} className="text-gray-500 hover:text-white">
              <X className="w-4 h-4" />
            </button>
            <button
              onClick={() => imgFile && handleSendAttachment(imgFile, 'image')}
              disabled={uploading}
              className="btn-primary text-xs px-3 py-1.5"
            >
              {uploading ? 'Sending...' : 'Send'}
            </button>
          </div>
        )}

        {/* ---- Document preview before send ---- */}
        {docFile && (
          <div className="mx-2 mb-2 p-2 rounded-xl bg-ink-850 border border-ink-700 flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-ink-700 flex items-center justify-center text-lg">{iconForMime(docFile.type)}</div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-white truncate">{docFile.name}</p>
              <p className="text-[10px] text-gray-500">{formatFileSize(docFile.size)}</p>
            </div>
            <button onClick={() => setDocFile(null)} className="text-gray-500 hover:text-white"><X className="w-4 h-4" /></button>
            <button
              onClick={() => handleSendAttachment(docFile, 'document')}
              disabled={uploading}
              className="btn-primary text-xs px-3 py-1.5"
            >
              {uploading ? 'Sending...' : 'Send'}
            </button>
          </div>
        )}

        {/* ---- Audio preview before send ---- */}
        {audFile && (
          <div className="mx-2 mb-2 p-2 rounded-xl bg-ink-850 border border-ink-700 flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-ink-700 flex items-center justify-center text-lg">🎵</div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-white truncate">{audFile.name}</p>
              <p className="text-[10px] text-gray-500">{formatFileSize(audFile.size)}</p>
            </div>
            <button onClick={() => setAudFile(null)} className="text-gray-500 hover:text-white"><X className="w-4 h-4" /></button>
            <button
              onClick={() => handleSendAttachment(audFile, 'audio')}
              disabled={uploading}
              className="btn-primary text-xs px-3 py-1.5"
            >
              {uploading ? 'Sending...' : 'Send'}
            </button>
          </div>
        )}

        {/* ---- Voice recording active ---- */}
        {recording && (
          <div className="mx-2 mb-2 p-3 rounded-xl bg-ink-850 border border-ink-700 flex items-center gap-4 shrink-0">
            <div className="w-3 h-3 rounded-full bg-rose-500 animate-pulse" />
            <span className="text-sm font-mono text-white tabular-nums">{formatDuration(recordTime * 1000)}</span>
            <div className="flex-1" />
            <button onClick={() => stopRecording(true)} className="text-sm text-gray-400 hover:text-white px-3 py-1.5 rounded-lg bg-ink-800">
              Cancel
            </button>
            <button
              onClick={() => stopRecording(false)}
              className="btn-primary text-sm px-4 py-1.5 flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" /> Send
            </button>
          </div>
        )}

        {/* ---- Voice blob preview before send ---- */}
        {recordBlob && !recording && (
          <div className="mx-2 mb-2 p-3 rounded-xl bg-ink-850 border border-ink-700 flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-full bg-zeal-500 text-ink-950 flex items-center justify-center shrink-0">
              <Mic className="w-4 h-4" />
            </div>
            <span className="text-sm text-white font-mono tabular-nums">{formatDuration(recordTime * 1000)}</span>
            <div className="flex-1" />
            <button onClick={() => { setRecordBlob(null); setRecordTime(0) }} className="text-gray-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
            <button
              onClick={handleSendVoice}
              disabled={uploading}
              className="btn-primary text-sm px-4 py-1.5 flex items-center gap-1.5"
            >
              {uploading ? 'Sending...' : <><Send className="w-3.5 h-3.5" /> Send</>}
            </button>
          </div>
        )}

        {/* ---- Uploading overlay ---- */}
        {uploading && !recordBlob && !imgFile && !docFile && !audFile && (
          <div className="mx-2 mb-2 px-3 py-2 rounded-xl bg-zeal-500/10 border border-zeal-500/30 text-zeal-400 text-xs flex items-center gap-2 shrink-0">
            <div className="w-3.5 h-3.5 border-2 border-zeal-400 border-t-transparent rounded-full animate-spin" />
            Uploading...
          </div>
        )}

        {/* ---- Composer ---- */}
        {!recording && !recordBlob && (
          <div className="flex gap-2 items-end pt-3 border-t border-ink-800 shrink-0">
            {/* Attach button */}
            <button
              onClick={() => setAttachSheet(true)}
              className="p-3 rounded-xl text-gray-400 hover:text-white hover:bg-ink-800 transition-colors shrink-0"
              disabled={uploading}
            >
              <Plus className="w-5 h-5" />
            </button>

            {/* Text input */}
            <input
              className="input flex-1 min-w-0"
              placeholder={`Message ${activeRoom.name}...`}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSendText()}
              disabled={sending || uploading}
            />

            {/* Mic or Send */}
            {input.trim() ? (
              <button onClick={handleSendText} disabled={sending} className="btn-primary p-3 min-w-[44px] min-h-[44px] shrink-0">
                <Send className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={startRecording}
                disabled={uploading}
                className="p-3 rounded-xl text-gray-400 hover:text-white hover:bg-ink-800 transition-colors shrink-0"
              >
                <Mic className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* ---- Recording active: hide normal composer, show recording bar ---- */}
        {recording && (
          <div className="flex gap-2 items-center pt-3 border-t border-ink-800 shrink-0 px-1">
            <div className="flex-1 flex items-center gap-3 px-4 py-2.5 rounded-xl bg-ink-800 border border-ink-700">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
              <span className="text-sm font-mono text-white tabular-nums">{formatDuration(recordTime * 1000)}</span>
              <span className="text-xs text-gray-500">Recording...</span>
            </div>
            <button onClick={() => stopRecording(true)} className="text-sm text-gray-400 hover:text-white px-3 py-2.5 rounded-xl bg-ink-800">
              Cancel
            </button>
            <button
              onClick={() => stopRecording(false)}
              className="btn-primary px-4 py-2.5 flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" /> Send
            </button>
          </div>
        )}

        {/* ---- Attachment Sheet ---- */}
        <Sheet open={attachSheet} onClose={clearAttachmentState} title="Share">
          <div className="space-y-1">
            <button onClick={pickImage} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-ink-800 transition-colors text-left">
              <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center">
                <Image className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Photo</p>
                <p className="text-xs text-gray-500">JPEG, PNG, WebP · up to 10 MB</p>
              </div>
            </button>
            <button onClick={pickDocument} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-ink-800 transition-colors text-left">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
                <FileText className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Document</p>
                <p className="text-xs text-gray-500">PDF, DOC, PPT, XLS, TXT · up to 20 MB</p>
              </div>
            </button>
            <button onClick={pickAudio} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-ink-800 transition-colors text-left">
              <div className="w-10 h-10 rounded-xl bg-violet-500/15 flex items-center justify-center">
                <Music className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Audio</p>
                <p className="text-xs text-gray-500">MP3, M4A, WebM, OGG, WAV · up to 15 MB</p>
              </div>
            </button>
          </div>
        </Sheet>
      </div>
    )
  }

  /* ================================================================ */
  /*  RENDER: ROOM SELECTOR                                            */
  /* ================================================================ */

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-display font-bold text-white flex items-center gap-2">
          <Flame className="w-5 h-5 text-orange-400" /> Gossip
        </h1>
        <p className="text-gray-500 text-xs mt-0.5">Real identity group chats. Be respectful.</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 lg:mx-0 lg:px-0 scrollbar-none">
        {rooms.map(room => (
          <button key={room.id} onClick={() => setActiveRoom(room)}
            className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-ink-850 border border-ink-700 hover:border-ink-600 transition-all text-left min-w-[140px]">
            <div className="w-10 h-10 rounded-xl bg-ink-800 flex items-center justify-center text-lg shrink-0">{room.icon || '💬'}</div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white text-sm truncate">{room.name}</p>
              <p className="text-xs text-gray-500">{room.member_count} members</p>
            </div>
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {rooms.map(room => (
          <button key={room.id} onClick={() => setActiveRoom(room)} className="w-full flex items-center gap-3 p-4 card card-hover text-left">
            <div className="w-12 h-12 rounded-2xl bg-ink-800 flex items-center justify-center text-xl shrink-0">{room.icon || '💬'}</div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white text-sm flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-gray-500" /> {room.name}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">{room.member_count} members</p>
            </div>
            <div className="text-xs text-gray-600 shrink-0">{room.type === 'campus' ? 'All students' : 'Department'}</div>
          </button>
        ))}
        {rooms.length === 0 && (
          <EmptyState icon={<Users className="w-7 h-7" />} title="No gossip rooms" description="Campus and department chat rooms will appear here." />
        )}
      </div>
    </div>
  )
}
