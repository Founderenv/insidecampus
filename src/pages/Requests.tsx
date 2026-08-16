import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Inbox, Check, X as XIcon, MessageCircle, Send, ArrowLeft } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Avatar } from '@/components/Avatar'
import { SkeletonList } from '@/components/Skeleton'
import { fetchContactRequests, updateContactRequestStatus } from '@/lib/data'
import { timeAgo } from '@/lib/utils'
import type { ContactRequest } from '@/types'

const TYPE_LABELS: Record<string, string> = {
  marketplace: 'Marketplace',
  lost_found: 'Lost & Found',
  nearby: 'Nearby',
  housing: 'Housing',
}

function typeLabel(t: string): string {
  return TYPE_LABELS[t] || t.charAt(0).toUpperCase() + t.slice(1)
}

export function Requests() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [received, setReceived] = useState<ContactRequest[]>([])
  const [sent, setSent] = useState<ContactRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  const load = async () => {
    if (!user) return
    setLoading(true)
    try {
      const [r, s] = await Promise.all([
        fetchContactRequests(user.id, 'received'),
        fetchContactRequests(user.id, 'sent'),
      ])
      setReceived(r)
      setSent(s)
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { load() }, [user])

  const handleStatus = async (req: ContactRequest, status: 'accepted' | 'declined') => {
    if (!user || updating) return
    setUpdating(req.id)
    try {
      await updateContactRequestStatus(req.id, user.id, status)
      setReceived(prev => prev.map(r => r.id === req.id ? { ...r, status } : r))
    } catch {} finally { setUpdating(null) }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-ink-800 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-400" />
        </button>
        <div>
          <h1 className="text-2xl font-display font-bold text-white flex items-center gap-2">
            <Inbox className="w-6 h-6 text-zeal-500" /> Requests
          </h1>
          <p className="text-gray-500 text-sm">Contact requests from other students.</p>
        </div>
      </div>

      {loading ? (
        <SkeletonList count={4} />
      ) : (
        <>
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Incoming</h2>
            {received.length === 0 ? (
              <p className="text-xs text-gray-500">No incoming requests.</p>
            ) : (
              received.map(r => (
                <div key={r.id} className="card p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <Avatar src={r.sender?.avatar_url || null} alt={r.sender?.full_name || 'S'} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{r.sender?.full_name || 'Student'}</p>
                      <p className="text-[11px] text-gray-500">
                        {typeLabel(r.request_type)} · {timeAgo(r.created_at)}
                      </p>
                    </div>
                    <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                      r.status === 'accepted' ? 'bg-green-500/10 text-green-400'
                        : r.status === 'declined' ? 'bg-rose-500/10 text-rose-400'
                        : r.status === 'closed' ? 'bg-gray-500/10 text-gray-400'
                        : 'bg-zeal-500/10 text-zeal-400'
                    }`}>
                      {r.status}
                    </span>
                  </div>
                  {r.message && <p className="text-sm text-gray-300">{r.message}</p>}

                  {r.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleStatus(r, 'accepted')}
                        disabled={!!updating}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-zeal-500 text-white text-xs font-medium hover:bg-zeal-600 transition-colors disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" /> Accept
                      </button>
                      <button
                        onClick={() => handleStatus(r, 'declined')}
                        disabled={!!updating}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-ink-800 border border-ink-700 text-gray-300 text-xs font-medium hover:text-white transition-colors disabled:opacity-50"
                      >
                        <XIcon className="w-3.5 h-3.5" /> Decline
                      </button>
                    </div>
                  )}
                  {r.status === 'accepted' && user && (
                    <button
                      onClick={() => navigate(`/messages?with=${r.sender_id}`)}
                      className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-medium hover:bg-green-500/15 transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5" /> Message {r.sender?.full_name || 'them'} on InsideZeal
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="space-y-3 pt-2">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Sent</h2>
            {sent.length === 0 ? (
              <p className="text-xs text-gray-500">You haven't sent any requests.</p>
            ) : (
              sent.map(r => (
                <div key={r.id} className="card p-3.5 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Send className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                    <p className="text-sm text-gray-300 truncate flex-1">{r.recipient?.full_name || 'Student'} · {typeLabel(r.request_type)}</p>
                    <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${
                      r.status === 'accepted' ? 'bg-green-500/10 text-green-400'
                        : r.status === 'declined' ? 'bg-rose-500/10 text-rose-400'
                        : r.status === 'closed' ? 'bg-gray-500/10 text-gray-400'
                        : 'bg-zeal-500/10 text-zeal-400'
                    }`}>
                      {r.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-600">{timeAgo(r.created_at)}</p>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}