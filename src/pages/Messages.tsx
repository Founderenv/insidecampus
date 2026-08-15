import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageCircle, Search, ArrowLeft, Send } from 'lucide-react'
import { Avatar } from '@/components/Avatar'
import { SkeletonList } from '@/components/Skeleton'
import { EmptyState } from '@/components/States'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { createOrGetConversation, sendDmMessage, fetchDmMessages } from '@/lib/data'
import { timeAgo } from '@/lib/utils'
import type { Profile } from '@/types'

interface Conversation {
  id: string
  otherUser: Profile
  lastMessage?: string
  lastTime?: string
}

export function Messages() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeConvo, setActiveConvo] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!user) return
    loadConversations()
  }, [user])

  const loadConversations = async () => {
    if (!user) return
    setLoading(true)
    try {
      const { data: parts } = await supabase
        .from('dm_participants')
        .select('conversation_id, user_id')
        .eq('user_id', user.id)
      if (!parts || parts.length === 0) { setLoading(false); return }

      const convIds = parts.map(p => p.conversation_id)
      const { data: allParts } = await supabase
        .from('dm_participants')
        .select('conversation_id, user_id, profiles!dm_participants_user_id_fkey(*)')
        .in('conversation_id', convIds)
        .neq('user_id', user.id)

      if (!allParts) { setLoading(false); return }

      const convos: Conversation[] = allParts.map((p: any) => ({
        id: p.conversation_id,
        otherUser: p.profiles as Profile,
      }))

      for (const c of convos) {
        const { data: msgs } = await supabase
          .from('dm_messages')
          .select('content, created_at')
          .eq('conversation_id', c.id)
          .order('created_at', { ascending: false })
          .limit(1)
        if (msgs && msgs.length > 0) {
          c.lastMessage = msgs[0].content
          c.lastTime = msgs[0].created_at
        }
      }

      setConversations(convos)
    } catch {}
    setLoading(false)
  }

  const loadMessages = async (convoId: string) => {
    try {
      const msgs = await fetchDmMessages(convoId)
      setMessages(msgs)
    } catch {}
  }

  useEffect(() => {
    if (!activeConvo) return
    loadMessages(activeConvo.id)

    const channel = supabase
      .channel(`dm-${activeConvo.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'dm_messages',
        filter: `conversation_id=eq.${activeConvo.id}`,
      }, (payload) => {
        const msg = payload.new as any
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev
          return [...prev, msg]
        })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [activeConvo])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || !user || !activeConvo) return
    setSending(true)
    const content = input.trim()
    setInput('')
    try {
      await sendDmMessage(activeConvo.id, user.id, content)
    } catch {
      setInput(content)
    } finally {
      setSending(false)
    }
  }

  const openConversation = (convo: Conversation) => {
    setActiveConvo(convo)
    setSearch('')
  }

  const startNewConversation = async (userId: string) => {
    if (!user) return
    try {
      const convoId = await createOrGetConversation(user.id, userId)
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
      if (profile) {
        setActiveConvo({ id: convoId, otherUser: profile as Profile })
      }
    } catch {}
  }

  const filtered = conversations.filter(c =>
    !search || c.otherUser.full_name.toLowerCase().includes(search.toLowerCase()) || (c.otherUser.username || '').includes(search.toLowerCase())
  )

  if (activeConvo) {
    return (
      <div className="space-y-3 flex flex-col h-[calc(100vh-12rem)] lg:h-[calc(100vh-3rem)]">
        <div className="flex items-center gap-3 pb-3 border-b border-ink-800">
          <button onClick={() => { setActiveConvo(null); setMessages([]) }} className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <Avatar src={activeConvo.otherUser.avatar_url} alt={activeConvo.otherUser.full_name} size="sm" />
          <div>
            <h2 className="font-semibold text-white text-sm">{activeConvo.otherUser.full_name}</h2>
            {activeConvo.otherUser.username && (
              <p className="text-xs text-gray-500">@{activeConvo.otherUser.username}</p>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pb-3">
          {messages.length === 0 ? (
            <EmptyState title="No messages yet" description="Say hello!" />
          ) : (
            messages.map((msg: any) => {
              const isOwn = msg.sender_id === user?.id
              return (
                <div key={msg.id} className={`flex gap-2.5 ${isOwn ? 'flex-row-reverse' : ''}`}>
                  <Avatar
                    src={isOwn ? undefined : activeConvo.otherUser.avatar_url}
                    alt={isOwn ? (user?.email || '') : activeConvo.otherUser.full_name}
                    size="sm"
                  />
                  <div className={`max-w-[75%] ${isOwn ? 'text-right' : ''}`}>
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
            placeholder={`Message ${activeConvo.otherUser.full_name}...`}
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
        <h1 className="text-3xl font-display font-bold text-white mb-1">Messages</h1>
        <p className="text-gray-500 text-sm">Private conversations with students.</p>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
        <input className="input pl-12" placeholder="Search conversations..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <SkeletonList count={4} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<MessageCircle className="w-7 h-7" />}
          title="No conversations yet"
          description="Start a conversation from someone's profile."
          action={<button onClick={() => navigate('/explore')} className="btn-primary text-sm">Discover students</button>}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map(c => (
            <button
              key={c.id}
              onClick={() => openConversation(c)}
              className="w-full flex items-center gap-3 p-3.5 card card-hover text-left"
            >
              <Avatar src={c.otherUser.avatar_url} alt={c.otherUser.full_name} size="md" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-white text-sm truncate">{c.otherUser.full_name}</p>
                  {c.lastTime && <p className="text-xs text-gray-600 shrink-0 ml-2">{timeAgo(c.lastTime)}</p>}
                </div>
                <p className="text-xs text-gray-500 truncate">{c.lastMessage || 'Start chatting...'}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
