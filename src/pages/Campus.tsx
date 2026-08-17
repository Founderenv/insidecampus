import { useEffect, useState, useRef } from 'react'
import { Send, Hash, ArrowLeft, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { Avatar } from '@/components/Avatar'
import { SkeletonList } from '@/components/Skeleton'
import { EmptyState } from '@/components/States'
import { fetchCampusRooms, fetchChatMessages, sendChatMessage, fetchProfile } from '@/lib/data'
import { timeAgo } from '@/lib/utils'
import type { ChatRoom, ChatMessage } from '@/types'

export function Campus() {
  const { user, profile } = useAuth()
  const [rooms, setRooms] = useState<ChatRoom[]>([])
  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const profileCache = useRef<Map<string, ChatMessage['author']>>(new Map())

  useEffect(() => {
    if (!user) {
      // Preview mode: show campus room only via fallback
      fetchCampusRooms('00000000-0000-0000-0000-000000000000').then(r => {
        setRooms(r.length > 0 ? r : [])
      }).finally(() => setLoading(false))
      return
    }
    fetchCampusRooms(user.id).then(r => {
      setRooms(r)
    }).finally(() => setLoading(false))
  }, [user])

  useEffect(() => {
    if (!activeRoom) return
    fetchChatMessages(activeRoom.id).then(setMessages).catch(() => {})

    const channel = supabase
      .channel(`campus-chat-${activeRoom.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `room_id=eq.${activeRoom.id}`,
      }, async (payload) => {
        const raw = payload.new as ChatMessage
        let author = profileCache.current.get(raw.author_id)
        if (author === undefined && !profileCache.current.has(raw.author_id)) {
          try { author = (await fetchProfile(raw.author_id)) ?? undefined } catch {}
          profileCache.current.set(raw.author_id, author)
        }
        setMessages(prev => {
          if (prev.some(m => m.id === raw.id)) return prev
          return [...prev, { ...raw, author }]
        })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [activeRoom])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || !user || !activeRoom) return
    setSending(true)
    const content = input.trim()
    setInput('')
    try {
      await sendChatMessage(activeRoom.id, user.id, content)
    } catch {
      setInput(content)
    } finally {
      setSending(false)
    }
  }

  if (loading) return <SkeletonList count={3} />

  if (activeRoom) {
    return (
      <div className="flex flex-col" style={{ height: 'calc(100dvh - 8rem)' }}>
        <div className="flex items-center gap-3 pb-3 border-b border-ink-800 shrink-0">
          <button onClick={() => setActiveRoom(null)} className="text-gray-400 hover:text-white p-1">
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
                  <Avatar src={msg.author?.avatar_url} alt={msg.author?.full_name || ''} size="sm" />
                  <div className={`max-w-[75%] ${isOwn ? 'text-right' : ''}`}>
                    {!isOwn && <p className="text-xs text-gray-400 mb-0.5 font-medium">{msg.author?.full_name}</p>}
                    <div className={`rounded-2xl px-3.5 py-2.5 text-sm ${isOwn ? 'bg-zeal-500 text-ink-950' : 'bg-ink-800 text-gray-200'}`}>
                      {msg.content}
                    </div>
                    <p className="text-[10px] text-gray-600 mt-0.5">{timeAgo(msg.created_at)}</p>
                  </div>
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="flex gap-2 items-center pt-3 border-t border-ink-800 shrink-0">
          <input
            className="input flex-1"
            placeholder={`Message #${activeRoom.name}...`}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            disabled={sending}
          />
          <button onClick={handleSend} disabled={!input.trim() || sending} className="btn-primary p-3 min-w-[44px] min-h-[44px]">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-display font-bold text-white">Campus Chat</h1>
        <p className="text-gray-500 text-xs mt-0.5">Real identity group chats. Be respectful.</p>
      </div>

      <div className="space-y-2">
        {rooms.map(room => (
          <button
            key={room.id}
            onClick={() => setActiveRoom(room)}
            className="w-full flex items-center gap-3 p-4 card card-hover text-left"
          >
            <div className="w-12 h-12 rounded-2xl bg-ink-800 flex items-center justify-center text-xl shrink-0">
              {room.icon || '💬'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white text-sm flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-gray-500" /> {room.name}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">{room.member_count} members</p>
            </div>
          </button>
        ))}

        {rooms.length === 0 && !user && (
          <EmptyState
            icon={<Users className="w-7 h-7" />}
            title="Preview Mode"
            description="Sign in to access Campus Chat rooms."
          />
        )}

        {rooms.length === 0 && user && !profile?.branch_id && (
          <div className="space-y-3">
            <EmptyState
              icon={<Users className="w-7 h-7" />}
              title="No department assigned"
              description="Complete your profile to access your department chat room."
            />
          </div>
        )}
      </div>
    </div>
  )
}
