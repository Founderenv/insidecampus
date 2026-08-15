import { useEffect, useState, useRef } from 'react'
import { Send, Hash, ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { Avatar } from '@/components/Avatar'
import { SkeletonList } from '@/components/Skeleton'
import { EmptyState } from '@/components/States'
import { fetchChatRooms, fetchChatMessages, sendChatMessage, fetchProfile } from '@/lib/data'
import { timeAgo } from '@/lib/utils'
import type { ChatRoom, ChatMessage } from '@/types'

export function Chat() {
  const { user } = useAuth()
  const [rooms, setRooms] = useState<ChatRoom[]>([])
  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchChatRooms().then(r => { setRooms(r); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!activeRoom) return
    fetchChatMessages(activeRoom.id).then(setMessages).catch(() => {})

    const channel = supabase
      .channel(`chat-${activeRoom.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `room_id=eq.${activeRoom.id}`,
      }, async (payload) => {
        const raw = payload.new as ChatMessage
        let author = undefined
        try {
          author = (await fetchProfile(raw.author_id)) ?? undefined
        } catch {}
        setMessages(prev => [...prev, { ...raw, author }])
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
      <div className="space-y-3 flex flex-col h-[calc(100vh-12rem)] lg:h-[calc(100vh-3rem)]">
        <div className="flex items-center gap-3 pb-3 border-b border-ink-800">
          <button onClick={() => setActiveRoom(null)} className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-10 h-10 rounded-xl bg-ink-800 flex items-center justify-center text-xl">{activeRoom.icon || '💬'}</div>
          <div>
            <h2 className="font-semibold text-white text-sm">{activeRoom.name}</h2>
            <p className="text-xs text-gray-500">{activeRoom.member_count} members</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pb-3">
          {messages.length === 0 ? (
            <EmptyState title="No messages yet" description="Start the conversation!" />
          ) : (
            messages.map(msg => {
              const isOwn = msg.author_id === user?.id
              return (
                <div key={msg.id} className={`flex gap-2.5 ${isOwn ? 'flex-row-reverse' : ''}`}>
                  <Avatar src={msg.author?.avatar_url} alt={msg.author?.full_name || ''} size="sm" />
                  <div className={`max-w-[75%] ${isOwn ? 'text-right' : ''}`}>
                    {!isOwn && <p className="text-xs text-gray-400 mb-0.5">{msg.author?.full_name}</p>}
                    <div className={`rounded-2xl px-3.5 py-2.5 text-sm ${isOwn ? 'bg-zeal-500 text-ink-950' : 'bg-ink-800 text-gray-200'}`}>
                      {msg.content}
                    </div>
                    <p className="text-xs text-gray-600 mt-0.5">{timeAgo(msg.created_at)}</p>
                  </div>
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="flex gap-2 items-center pt-3 border-t border-ink-800">
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
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-display font-bold text-white mb-1">Campus Chat</h1>
        <p className="text-gray-500 text-sm">Live chat with your campus. Real identity only.</p>
      </div>

      <div className="space-y-2">
        {rooms.map(room => (
          <button
            key={room.id}
            onClick={() => setActiveRoom(room)}
            className="w-full flex items-center gap-3 p-3.5 card card-hover text-left"
          >
            <div className="w-11 h-11 rounded-xl bg-ink-800 flex items-center justify-center text-xl">{room.icon || '💬'}</div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white text-sm flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-gray-500" /> {room.name}
              </p>
              <p className="text-xs text-gray-500">{room.member_count} members</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
