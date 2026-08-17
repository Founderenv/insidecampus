import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageCircle, Phone, Send, Loader2, CheckCircle2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Avatar } from '@/components/Avatar'
import { Sheet } from '@/components/Sheet'
import { sendContactRequest, fetchListingOwnerPhone } from '@/lib/data'

function normalizeWhatsAppNumber(num: string): string {
  const digits = num.replace(/\D/g, '')
  if (digits.length === 10) return `91${digits}`
  if (digits.length === 12 && digits.startsWith('91')) return digits
  return digits
}

interface ContactSheetProps {
  open: boolean
  onClose: () => void
  title: string
  ownerId: string
  ownerName: string
  ownerAvatar?: string | null
  phone?: string | null
  itemName: string
  whatsAppMessage: string
  requestType?: string
  referenceId?: string
}

export function ContactSheet({
  open, onClose, title, ownerId, ownerName, ownerAvatar, phone, itemName,
  whatsAppMessage, requestType, referenceId,
}: ContactSheetProps) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [resolvedPhone, setResolvedPhone] = useState<string | null>(phone ?? null)
  const [phoneLoading, setPhoneLoading] = useState(false)
  const [requestState, setRequestState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [requestError, setRequestError] = useState('')

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setRequestState('idle')
    setRequestError('')
    if (phone !== undefined) {
      setResolvedPhone(phone ?? null)
      return
    }
    setPhoneLoading(true)
    fetchListingOwnerPhone(ownerId)
      .then(p => { if (!cancelled) setResolvedPhone(p) })
      .catch(() => { if (!cancelled) setResolvedPhone(null) })
      .finally(() => { if (!cancelled) setPhoneLoading(false) })
    return () => { cancelled = true }
  }, [open, ownerId, phone])

  const hasPhone = !!resolvedPhone
  const isOwner = user?.id === ownerId

  const handleSendRequest = async () => {
    if (!user || requestState === 'sending' || requestState === 'sent') return
    setRequestState('sending')
    setRequestError('')
    try {
      await sendContactRequest(user.id, ownerId, requestType || 'marketplace', referenceId)
      setRequestState('sent')
    } catch (err: any) {
      const msg = err?.message || ''
      if (msg.includes('idx_contact_requests_dup_pending') || msg.includes('duplicate')) {
        setRequestState('sent')
        return
      }
      setRequestState('error')
      setRequestError('Could not send your request. Please try again.')
    }
  }

  const handleMessage = () => {
    onClose()
    navigate(`/messages?with=${ownerId}`)
  }

  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <div className="space-y-4">
        {/* Owner */}
        <div className="flex items-center gap-3">
          <Avatar src={ownerAvatar || null} alt={ownerName} size="lg" />
          <div className="min-w-0">
            <p className="font-semibold text-white text-sm truncate">{ownerName}</p>
            <p className="text-xs text-gray-500">{itemName}</p>
          </div>
        </div>

        {phoneLoading ? (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading contact options...
          </div>
        ) : hasPhone ? (
          <div className="space-y-2.5">
            <a
              href={`https://wa.me/${normalizeWhatsAppNumber(resolvedPhone!)}?text=${encodeURIComponent(whatsAppMessage)}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-xl bg-green-500/10 border border-green-500/20 hover:bg-green-500/15 transition-colors"
            >
              <div className="w-9 h-9 rounded-xl bg-green-500/15 flex items-center justify-center shrink-0">
                <MessageCircle className="w-4 h-4 text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">WhatsApp</p>
                <p className="text-[11px] text-gray-500">Chat on WhatsApp</p>
              </div>
            </a>
            <a
              href={`tel:${resolvedPhone}`}
              className="flex items-center gap-3 p-3 rounded-xl bg-zeal-500/10 border border-zeal-500/20 hover:bg-zeal-500/15 transition-colors"
            >
              <div className="w-9 h-9 rounded-xl bg-zeal-500/15 flex items-center justify-center shrink-0">
                <Phone className="w-4 h-4 text-zeal-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Call</p>
                <p className="text-[11px] text-gray-500">{resolvedPhone}</p>
              </div>
            </a>
            {user && !isOwner && (
              <button
                onClick={handleMessage}
                className="flex items-center gap-3 p-3 rounded-xl bg-ink-800 border border-ink-700 hover:bg-ink-700 transition-colors w-full text-left"
              >
                <div className="w-9 h-9 rounded-xl bg-ink-700 flex items-center justify-center shrink-0">
                  <Send className="w-4 h-4 text-zeal-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Message on InsideZeal</p>
                  <p className="text-[11px] text-gray-500">Private chat</p>
                </div>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2.5">
            {requestState === 'sent' ? (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-zeal-500/10 border border-zeal-500/20 text-sm text-zeal-400">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                Request sent — {ownerName} will be notified and can respond.
              </div>
            ) : (
              <button
                onClick={handleSendRequest}
                disabled={!user || isOwner || requestState === 'sending'}
                className="flex items-center gap-3 p-3 rounded-xl bg-zeal-500 border border-zeal-500 hover:bg-zeal-600 transition-colors w-full text-left disabled:opacity-50"
              >
                <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                  {requestState === 'sending' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Send Request</p>
                  <p className="text-[11px] text-white/70">No phone shared — request contact on InsideZeal</p>
                </div>
              </button>
            )}
            {requestState === 'error' && (
              <p className="text-xs text-rose-400 px-1">{requestError}</p>
            )}
            {user && !isOwner && (
              <button
                onClick={handleMessage}
                className="flex items-center gap-3 p-3 rounded-xl bg-ink-800 border border-ink-700 hover:bg-ink-700 transition-colors w-full text-left"
              >
                <div className="w-9 h-9 rounded-xl bg-ink-700 flex items-center justify-center shrink-0">
                  <Send className="w-4 h-4 text-zeal-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Message on InsideZeal</p>
                  <p className="text-[11px] text-gray-500">Private chat</p>
                </div>
              </button>
            )}
          </div>
        )}
      </div>
    </Sheet>
  )
}