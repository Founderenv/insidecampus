import { useState, useEffect, useRef, useCallback } from 'react'
import { Flame, Send, ArrowLeft, Users, Hash } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { isPreviewMode } from '@/lib/preview'
import { Avatar } from '@/components/Avatar'
import { SkeletonList } from '@/components/Skeleton'
import { EmptyState } from '@/components/States'
import { fetchGossipRooms, fetchChatMessages, sendChatMessage, fetchProfile, getDemoGossipMessages } from '@/lib/data'
import type { DemoChatMessage } from '@/lib/data'
import { timeAgo } from '@/lib/utils'
import type { ChatRoom, ChatMessage } from '@/types'

type DisplayMessage = {
  id: string
  author_id: string
  content: string
  created_at: string
  author?: { full_name: string; avatar_url: string | null; username: string | null }
}

export function Gossip() {
  const { user, profile } = useAuth()
  const [rooms, setRooms] = useState<ChatRoom[]>([])
  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null)
  const [messages, setMessages] = useState<DisplayMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [demoMode, setDemoMode] = useState(false)

  const deptName = profile?.branch_id ? 'Computer Engineering' : 'My Department'

  useEffect(() => {
    if (!user && !isPreviewMode) {
      setLoading(false)
      return
    }

    const loadRooms = async () => {
      try {
        const userId = user?.id || '00000000-0000-0000-0000-000000000000'
        const fetchedRooms = await fetchGossipRooms(userId)
        if (fetchedRooms.length > 0) {
          setRooms(fetchedRooms)
        } else if (isPreviewMode) {
          // Create virtual rooms for preview mode
          setRooms([
            { id: 'gossip-campus', name: 'InsideZeal Campus', slug: 'gossip-campus', type: 'campus', branch_id: null, icon: '🏫', member_count: 128 },
            { id: 'gossip-dept', name: deptName, slug: 'gossip-dept', type: 'department', branch_id: profile?.branch_id || null, icon: '💻', member_count: 42 },
          ])
        }
      } catch {
        if (isPreviewMode) {
          setRooms([
            { id: 'gossip-campus', name: 'InsideZeal Campus', slug: 'gossip-campus', type: 'campus', branch_id: null, icon: '🏫', member_count: 128 },
            { id: 'gossip-dept', name: deptName, slug: 'gossip-dept', type: 'department', branch_id: profile?.branch_id || null, icon: '💻', member_count: 42 },
          ])
        }
      } finally {
        setLoading(false)
      }
    }
    loadRooms()
  }, [user, profile, deptName])

  useEffect(() => {
    if (!activeRoom) return

    if (isPreviewMode && !user) {
      // Load demo messages for preview
      const demoMsgs = getDemoGossipMessages(activeRoom.slug)
      setMessages(demoMsgs)
      setDemoMode(true)
      return
    }

    setDemoMode(false)
    fetchChatMessages(activeRoom.id).then(msgs => {
      setMessages(msgs.map(m => ({
        id: m.id,
        author_id: m.author_id,
        content: m.content,
        created_at: m.created_at,
        author: m.author ? { full_name: m.author.full_name, avatar_url: m.author.avatar_url, username: m.author.username } : undefined,
      })))
    }).catch(() => {})

    const channel = supabase
      .channel(`gossip-chat-${activeRoom.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `room_id=eq.${activeRoom.id}`,
      }, async (payload) => {
        const raw = payload.new as ChatMessage
        let author = undefined
        try { author = (await fetchProfile(raw.author_id)) ?? undefined } catch {}
        setMessages(prev => {
          if (prev.some(m => m.id === raw.id)) return prev
          return [...prev, { id: raw.id, author_id: raw.author_id, content: raw.content, created_at: raw.created_at, author: author ? { full_name: author.full_name, avatar_url: author.avatar_url, username: author.username } : undefined }]
        })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [activeRoom, user])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || !user || !activeRoom || demoMode) return
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
      <div className="flex flex-col" style={{ height: 'calc(100vh - 8rem)' }}>
        {/* Chat Header */}
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

        {/* Messages */}
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

        {/* Input */}
        <div className="flex gap-2 items-center pt-3 border-t border-ink-800 shrink-0">
          {demoMode ? (
            <div className="flex-1 input text-sm text-gray-500 flex items-center">
              Sign in required to send messages
            </div>
          ) : (
            <input
              className="input flex-1"
              placeholder={`Message ${activeRoom.name}...`}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              disabled={sending}
            />
          )}
          <button onClick={handleSend} disabled={!input.trim() || sending || demoMode} className="btn-primary p-3 min-w-[44px] min-h-[44px]">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    )
  }

  // Room selector view
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-display font-bold text-white flex items-center gap-2">
          <Flame className="w-5 h-5 text-orange-400" /> Gossip
        </h1>
        <p className="text-gray-500 text-xs mt-0.5">Real identity group chats. Be respectful.</p>
      </div>

      {/* Room Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 lg:mx-0 lg:px-0 scrollbar-none">
        {rooms.map(room => (
          <button
            key={room.id}
            onClick={() => setActiveRoom(room)}
            className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-ink-850 border border-ink-700 hover:border-ink-600 transition-all text-left min-w-[140px]"
          >
            <div className="w-10 h-10 rounded-xl bg-ink-800 flex items-center justify-center text-lg shrink-0">
              {room.icon || '💬'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white text-sm truncate">{room.name}</p>
              <p className="text-xs text-gray-500">{room.member_count} members</p>
            </div>
          </button>
        ))}
      </div>

      {/* Room list */}
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
            <div className="text-xs text-gray-600 shrink-0">
              {room.type === 'campus' ? 'All students' : 'Department'}
            </div>
          </button>
        ))}

        {rooms.length === 0 && (
          <EmptyState
            icon={<Users className="w-7 h-7" />}
            title="No gossip rooms"
            description="Campus and department chat rooms will appear here."
          />
        )}
      </div>
    </div>
  )
}
