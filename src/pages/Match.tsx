import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Heart, X, MessageCircle, Eye, Shield, Ban, Flag, Settings, Send, SkipForward } from 'lucide-react'
import { HiddenAvatar } from '@/components/HiddenAvatar'
import { useAuth } from '@/context/AuthContext'
import {
  fetchMyHiddenProfile,
  findMatch,
  sendHiddenMessage,
  fetchHiddenMessages,
  requestReveal,
  endMatch,
  reportContent,
  blockUser,
} from '@/lib/data'
import { supabase } from '@/lib/supabase'
import { timeAgo } from '@/lib/utils'
import type { HiddenProfile } from '@/types'

const intentions = [
  { id: 'friends', label: 'Friendship', icon: '🤝' },
  { id: 'study', label: 'Study Buddy', icon: '📚' },
  { id: 'random', label: 'Random Chat', icon: '🎲' },
  { id: 'networking', label: 'Networking', icon: '💼' },
  { id: 'meet', label: 'Meet Someone', icon: '💕' },
]

interface MatchResult {
  match: any
  partner: Omit<HiddenProfile, 'reputation'> & { reputation?: number }
}

export function Match() {
  const { user } = useAuth()
  const [hidden, setHidden] = useState<HiddenProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [intention, setIntention] = useState('random')
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null)
  const [finding, setFinding] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [revealStatus, setRevealStatus] = useState<'none' | 'requested' | 'revealed'>('none')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!user) return
    fetchMyHiddenProfile(user.id).then(h => { setHidden(h); setLoading(false) }).catch(() => setLoading(false))
  }, [user])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (!chatOpen || !matchResult) return

    fetchHiddenMessages(matchResult.match.id).then(setMessages).catch(() => {})

    const channel = supabase
      .channel(`hidden-msg-${matchResult.match.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'hidden_messages',
        filter: `match_id=eq.${matchResult.match.id}`,
      }, (payload) => {
        const msg = payload.new as any
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev
          return [...prev, msg]
        })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [chatOpen, matchResult])

  const handleFindMatch = async () => {
    if (!hidden) return
    setFinding(true)
    try {
      const result = await findMatch(hidden.id, intention)
      if (result) {
        setMatchResult(result)
      } else {
        setMatchResult(null)
      }
    } catch {}
    setFinding(false)
  }

  const handleSkip = async () => {
    setMatchResult(null)
    setRevealStatus('none')
    setChatOpen(false)
    setFinding(true)
    await handleFindMatch()
  }

  const handleStartChat = () => {
    if (!matchResult) return
    setChatOpen(true)
  }

  const handleSendMessage = async () => {
    if (!input.trim() || !hidden || !matchResult) return
    setSending(true)
    const content = input.trim()
    setInput('')
    try {
      await sendHiddenMessage(matchResult.match.id, hidden.id, content)
    } catch {
      setInput(content)
    } finally {
      setSending(false)
    }
  }

  const handleEndChat = async () => {
    if (!matchResult) return
    try {
      await endMatch(matchResult.match.id)
    } catch {}
    setChatOpen(false)
    setMatchResult(null)
    setRevealStatus('none')
  }

  const handleReveal = async () => {
    if (!hidden || !matchResult) return
    try {
      const result = await requestReveal(matchResult.match.id, hidden.id)
      if (result.revealed) {
        setRevealStatus('revealed')
      } else {
        setRevealStatus('requested')
      }
    } catch {}
  }

  const handleBlock = async () => {
    if (!user || !matchResult) return
    if (!confirm("Block this user? They won't be able to match with you again.")) return
    try {
      await blockUser(user.id, matchResult.partner.id)
      await handleEndChat()
    } catch {}
  }

  const handleReport = async () => {
    if (!user || !matchResult) return
    const reason = prompt('Why are you reporting this user?')
    if (!reason) return
    try {
      await reportContent(user.id, 'hidden_match', matchResult.match.id, reason)
      alert('Report submitted. Thank you for keeping the community safe.')
    } catch {}
  }

  if (loading) return <div className="skeleton h-64 rounded-2xl" />

  if (!hidden) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-3xl font-display font-bold text-white mb-1">Zeal Match</h1>
          <p className="text-gray-500 text-sm">Meet someone before knowing who they are.</p>
        </div>
        <div className="card p-8 text-center">
          <Shield className="w-12 h-12 text-zeal-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-white mb-2">Create your Zeal Avatar first</h2>
          <p className="text-sm text-gray-500 mb-4">You need a hidden identity to use Zeal Match.</p>
          <Link to="/settings" className="btn-primary inline-flex items-center gap-2">
            <Settings className="w-4 h-4" /> Go to Settings
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-display font-bold text-white mb-1">Zeal Match</h1>
        <p className="text-gray-500 text-sm">Meet someone before knowing who they are.</p>
      </div>

      {/* My hidden identity card */}
      <div className="card p-4 flex items-center gap-3">
        <HiddenAvatar seed={hidden.avatar_seed} style={hidden.avatar_style} size="md" />
        <div>
          <p className="text-sm font-semibold text-white font-mono">{hidden.anonymous_code}</p>
          <p className="text-xs text-gray-500">Your hidden identity</p>
        </div>
      </div>

      {!chatOpen && !matchResult && (
        <>
          <div>
            <p className="text-sm text-gray-400 mb-2">What are you looking for?</p>
            <div className="grid grid-cols-2 gap-2">
              {intentions.map(i => (
                <button
                  key={i.id}
                  onClick={() => setIntention(i.id)}
                  className={`p-3 rounded-xl border text-sm font-medium transition-all text-left ${
                    intention === i.id ? 'bg-zeal-500/15 border-zeal-500/40 text-zeal-400' : 'bg-ink-800 border-ink-700 text-gray-300'
                  }`}
                >
                  <span className="mr-1.5">{i.icon}</span> {i.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleFindMatch}
            disabled={finding}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {finding ? (
              <span className="animate-pulse">Searching...</span>
            ) : (
              <><Heart className="w-5 h-5" /> Find Match</>
            )}
          </button>
        </>
      )}

      {/* Match card */}
      {matchResult && !chatOpen && (
        <div className="card p-6 text-center animate-scale-in">
          <HiddenAvatar seed={matchResult.partner.avatar_seed} style={matchResult.partner.avatar_style} size="xl" className="mx-auto" />
          <p className="text-lg font-bold text-white font-mono mt-3">{matchResult.partner.anonymous_code}</p>
          {hidden.show_gender && matchResult.partner.show_gender && (
            <p className="text-sm text-gray-400 capitalize">{matchResult.partner.gender}</p>
          )}
          {matchResult.partner.nickname && (
            <p className="text-sm text-gray-400 mt-1">"{matchResult.partner.nickname}"</p>
          )}
          <div className="flex gap-2 mt-5">
            <button onClick={handleSkip} className="btn-secondary flex-1 flex items-center justify-center gap-2">
              <SkipForward className="w-4 h-4" /> Skip
            </button>
            <button onClick={handleStartChat} className="btn-primary flex-1 flex items-center justify-center gap-2">
              <MessageCircle className="w-4 h-4" /> Chat
            </button>
          </div>
        </div>
      )}

      {/* Chat view */}
      {chatOpen && matchResult && (
        <div className="space-y-3">
          <div className="card p-4 flex items-center gap-3">
            <HiddenAvatar seed={matchResult.partner.avatar_seed} style={matchResult.partner.avatar_style} size="sm" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-white font-mono">{matchResult.partner.anonymous_code}</p>
              <p className="text-xs text-gray-500">Anonymous chat</p>
            </div>
            <button onClick={handleEndChat} className="btn-ghost text-xs text-rose-400">End Chat</button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pb-3 max-h-[40vh] lg:max-h-[50vh]">
            {messages.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-xs text-gray-600">You're now chatting anonymously. Be respectful.</p>
              </div>
            ) : (
              messages.map((msg: any) => {
                const isOwn = msg.sender_hidden_id === hidden.id
                return (
                  <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                    <div className={`rounded-2xl px-3.5 py-2.5 text-sm max-w-[75%] ${isOwn ? 'bg-zeal-500 text-ink-950' : 'bg-ink-800 text-gray-200'}`}>
                      {msg.content}
                      <p className="text-xs opacity-60 mt-0.5">{timeAgo(msg.created_at)}</p>
                    </div>
                  </div>
                )
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="flex gap-2 items-center">
            <input
              className="input flex-1"
              placeholder="Type a message..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
              disabled={sending}
            />
            <button onClick={handleSendMessage} disabled={!input.trim() || sending} className="btn-primary p-3 min-w-[44px] min-h-[44px]">
              <Send className="w-4 h-4" />
            </button>
          </div>

          {/* Reveal request */}
          <div className="card p-4">
            {revealStatus === 'revealed' ? (
              <div className="text-center space-y-2">
                <Eye className="w-6 h-6 text-zeal-500 mx-auto" />
                <p className="text-sm text-white font-medium">Identities revealed!</p>
                <p className="text-xs text-gray-500">Both users approved the reveal.</p>
              </div>
            ) : revealStatus === 'requested' ? (
              <div className="text-center space-y-2">
                <Eye className="w-6 h-6 text-amber-400 mx-auto" />
                <p className="text-sm text-white font-medium">Reveal requested</p>
                <p className="text-xs text-gray-500">Waiting for the other user to approve.</p>
              </div>
            ) : (
              <button onClick={handleReveal} className="btn-secondary w-full text-sm flex items-center justify-center gap-2">
                <Eye className="w-4 h-4" /> Request Identity Reveal
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <button onClick={handleBlock} className="btn-ghost text-xs flex-1 flex items-center justify-center gap-1.5"><Ban className="w-4 h-4" /> Block</button>
            <button onClick={handleReport} className="btn-ghost text-xs flex-1 flex items-center justify-center gap-1.5 text-rose-400"><Flag className="w-4 h-4" /> Report</button>
          </div>

          <p className="text-xs text-gray-600 text-center">
            Your real identity is never shared. Moderation can see identities for safety only.
          </p>
        </div>
      )}
    </div>
  )
}
