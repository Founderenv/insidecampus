import { useEffect, useState, useRef } from 'react'
import { Calendar, MapPin, Users, Tag, Clock, Plus, ArrowLeft, Send, ExternalLink, Instagram, Phone, MessageCircle, X, Image as ImageIcon } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Avatar } from '@/components/Avatar'
import { SkeletonList } from '@/components/Skeleton'
import { EmptyState, ErrorState } from '@/components/States'
import { Sheet } from '@/components/Sheet'
import {
  fetchEvents, toggleEventAttend, fetchEventAttendeeIds, createEvent,
  fetchEventCommunityMessages, sendEventCommunityMessage,
  fetchEventResources, createEventResource, deleteEventResource,
  uploadItemImage, validateImageFile,
} from '@/lib/data'
import { formatNumber, timeAgo } from '@/lib/utils'
import type { EventItem, EventCommunityMessage, EventResource } from '@/types'

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'week', label: 'This Week' },
] as const

const EVENT_CATEGORIES = ['Technical', 'Cultural', 'Sports', 'Workshop', 'Seminar', 'Other'] as const

function formatEventDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatEventTime(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

/* ================================================================ */
/*  EVENT DETAIL VIEW                                                */
/* ================================================================ */

function EventDetail({ event, onBack, user }: { event: EventItem; onBack: () => void; user: any }) {
  const [messages, setMessages] = useState<EventCommunityMessage[]>([])
  const [msgInput, setMsgInput] = useState('')
  const [sendingMsg, setSendingMsg] = useState(false)
  const [resources, setResources] = useState<EventResource[]>([])
  const [showResourceSheet, setShowResourceSheet] = useState(false)
  const [resTitle, setResTitle] = useState('')
  const [resDesc, setResDesc] = useState('')
  const [resUrl, setResUrl] = useState('')
  const [savingRes, setSavingRes] = useState(false)
  const [attending, setAttending] = useState(false)
  const [interestedCount, setInterestedCount] = useState(event.interested_count)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!event) return
    fetchEventCommunityMessages(event.id).then(setMessages).catch(() => {})
    fetchEventResources(event.id).then(setResources).catch(() => {})
    if (user) {
      fetchEventAttendeeIds(event.id).then(ids => setAttending(ids.has(user.id))).catch(() => {})
    }
  }, [event, user])

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const handleSendMsg = async () => {
    if (!msgInput.trim() || !user) return
    setSendingMsg(true)
    try {
      const msg = await sendEventCommunityMessage(event.id, user.id, msgInput.trim())
      setMessages(prev => [...prev, msg])
      setMsgInput('')
    } catch {} finally { setSendingMsg(false) }
  }

  const handleToggleInterested = async () => {
    if (!user) return
    const was = attending
    setAttending(!was)
    setInterestedCount(c => c + (was ? -1 : 1))
    try { await toggleEventAttend(event.id, user.id) } catch {
      setAttending(was)
      setInterestedCount(c => c + (was ? 1 : -1))
    }
  }

  const handleAddResource = async () => {
    if (!resTitle.trim() || !resUrl.trim() || !user) return
    setSavingRes(true)
    try {
      const r = await createEventResource(event.id, user.id, resTitle.trim(), resDesc.trim(), resUrl.trim())
      setResources(prev => [r, ...prev])
      setResTitle(''); setResDesc(''); setResUrl('')
      setShowResourceSheet(false)
    } catch {} finally { setSavingRes(false) }
  }

  const handleDeleteResource = async (rid: string) => {
    if (!user) return
    setResources(prev => prev.filter(r => r.id !== rid))
    try { await deleteEventResource(rid, user.id) } catch {}
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-gray-400 hover:text-white p-1">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold text-white truncate flex-1">{event.title}</h1>
      </div>

      {/* Banner */}
      {(event.banner_url || event.poster_url) && (
        <img src={event.banner_url || event.poster_url!} alt={event.title}
          className="w-full h-48 object-cover rounded-2xl" loading="lazy" />
      )}

      {/* Meta */}
      <div className="card p-4 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-white font-bold text-lg">{event.title}</h2>
          {event.category && (
            <span className="px-2 py-0.5 rounded-full bg-zeal-500/10 text-zeal-400 text-xs font-medium">{event.category}</span>
          )}
        </div>
        {event.description && <p className="text-gray-400 text-sm">{event.description}</p>}

        <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
          <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {formatEventDate(event.event_date)}</span>
          {event.start_time && <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {formatEventTime(event.start_time)}</span>}
          {event.end_time && <span className="flex items-center gap-1">to {formatEventTime(event.end_time)}</span>}
          {event.venue && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {event.venue}</span>}
          {event.organizer && <span className="flex items-center gap-1"><Tag className="w-3.5 h-3.5" /> {event.organizer}</span>}
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="flex items-center gap-1.5 text-xs text-gray-500">
            <Users className="w-3.5 h-3.5" /> {formatNumber(interestedCount)} interested
          </span>
          {user && (
            <button onClick={handleToggleInterested}
              className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-all ${attending ? 'bg-zeal-500 text-white' : 'bg-ink-800 border border-ink-700 text-gray-300 hover:text-white'}`}>
              {attending ? 'Interested ✓' : 'Interested'}
            </button>
          )}
        </div>

        {/* Links */}
        <div className="flex items-center gap-3 flex-wrap">
          {event.registration_url && (
            <a href={event.registration_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zeal-500 text-white text-xs font-medium hover:bg-zeal-600">
              <ExternalLink className="w-3.5 h-3.5" /> Register
            </a>
          )}
          {event.instagram_url && (
            <a href={event.instagram_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-pink-500/15 text-pink-400 text-xs font-medium hover:bg-pink-500/25">
              <Instagram className="w-3.5 h-3.5" /> Instagram
            </a>
          )}
          {event.whatsapp_url && (
            <a href={event.whatsapp_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-500/15 text-green-400 text-xs font-medium hover:bg-green-500/25">
              <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
            </a>
          )}
          {event.contact_number && (
            <a href={`tel:${event.contact_number}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/15 text-blue-400 text-xs font-medium hover:bg-blue-500/25">
              <Phone className="w-3.5 h-3.5" /> Call
            </a>
          )}
        </div>
      </div>

      {/* Resources */}
      <div className="card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-white text-sm">Resources</h3>
          {user && (
            <button onClick={() => setShowResourceSheet(true)}
              className="text-xs text-zeal-500 hover:text-zeal-400 font-medium">+ Add</button>
          )}
        </div>
        {resources.length === 0 ? (
          <p className="text-xs text-gray-500">No resources shared yet.</p>
        ) : (
          <div className="space-y-2">
            {resources.map(r => (
              <div key={r.id} className="flex items-center gap-3 p-2 rounded-xl bg-ink-800">
                <div className="flex-1 min-w-0">
                  <a href={r.resource_url} target="_blank" rel="noopener noreferrer"
                    className="text-sm font-medium text-white hover:text-zeal-400 truncate block">{r.title}</a>
                  {r.description && <p className="text-[10px] text-gray-500 truncate">{r.description}</p>}
                  <p className="text-[10px] text-gray-600">{r.uploader?.full_name} · {timeAgo(r.created_at)}</p>
                </div>
                {user && r.uploader_id === user.id && (
                  <button onClick={() => handleDeleteResource(r.id)} className="text-gray-600 hover:text-rose-400">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Community Chat */}
      <div className="card p-4 space-y-3">
        <h3 className="font-semibold text-white text-sm flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-zeal-500" /> Community Chat
        </h3>
        <div className="max-h-64 overflow-y-auto space-y-2">
          {messages.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-4">No messages yet. Start the conversation!</p>
          ) : (
            messages.map(m => (
              <div key={m.id} className="flex gap-2">
                <Avatar src={m.author?.avatar_url || null} alt={m.author?.full_name || ''} size="xs" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400 font-medium">{m.author?.full_name} <span className="text-gray-600 font-normal">{timeAgo(m.created_at)}</span></p>
                  <p className="text-sm text-gray-200">{m.content}</p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
        {user && (
          <div className="flex gap-2 items-end pt-2 border-t border-ink-700">
            <input className="input flex-1 min-w-0 text-sm" placeholder="Type a message..." value={msgInput}
              onChange={e => setMsgInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSendMsg()}
              disabled={sendingMsg} />
            <button onClick={handleSendMsg} disabled={sendingMsg || !msgInput.trim()}
              className="btn-primary p-2.5 shrink-0">
              <Send className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Resource Sheet */}
      <Sheet open={showResourceSheet} onClose={() => setShowResourceSheet(false)} title="Add Resource">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Title</label>
            <input value={resTitle} onChange={e => setResTitle(e.target.value)} placeholder="Resource name"
              className="w-full px-3 py-2.5 rounded-xl bg-ink-800 border border-ink-700 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-zeal-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Description</label>
            <input value={resDesc} onChange={e => setResDesc(e.target.value)} placeholder="Brief description (optional)"
              className="w-full px-3 py-2.5 rounded-xl bg-ink-800 border border-ink-700 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-zeal-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">URL</label>
            <input value={resUrl} onChange={e => setResUrl(e.target.value)} placeholder="https://..."
              className="w-full px-3 py-2.5 rounded-xl bg-ink-800 border border-ink-700 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-zeal-500" />
          </div>
          <button onClick={handleAddResource} disabled={!resTitle.trim() || !resUrl.trim() || savingRes}
            className="w-full py-2.5 rounded-xl bg-zeal-500 text-white font-medium text-sm hover:bg-zeal-600 transition-colors disabled:opacity-50">
            {savingRes ? 'Adding...' : 'Add Resource'}
          </button>
        </div>
      </Sheet>
    </div>
  )
}

/* ================================================================ */
/*  EVENTS LIST VIEW                                                 */
/* ================================================================ */

export function Events() {
  const { user } = useAuth()
  const [events, setEvents] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [filter, setFilter] = useState<string>('all')
  const [attendingIds, setAttendingIds] = useState<Set<string>>(new Set())
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null)

  // Create form
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [formTitle, setFormTitle] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formDate, setFormDate] = useState('')
  const [formStartTime, setFormStartTime] = useState('')
  const [formEndTime, setFormEndTime] = useState('')
  const [formVenue, setFormVenue] = useState('')
  const [formCategory, setFormCategory] = useState('')
  const [formOrganizer, setFormOrganizer] = useState('')
  const [formRegUrl, setFormRegUrl] = useState('')
  const [formInstaUrl, setFormInstaUrl] = useState('')
  const [formWhatsappUrl, setFormWhatsappUrl] = useState('')
  const [formContact, setFormContact] = useState('')
  const [formBanner, setFormBanner] = useState<File | null>(null)
  const [formBannerPreview, setFormBannerPreview] = useState<string | null>(null)
  const [bannerError, setBannerError] = useState<string | null>(null)

  const load = async (f: string) => {
    setLoading(true)
    try {
      const data = await fetchEvents(f === 'all' ? undefined : f)
      setEvents(data)
      if (user) {
        const ids = await Promise.all(data.map(ev => fetchEventAttendeeIds(ev.id)))
        const merged = new Set<string>()
        ids.forEach(s => s.forEach(id => merged.add(id)))
        setAttendingIds(merged)
      }
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(filter) }, [filter, user])

  const handleToggle = async (eventId: string) => {
    if (!user) return
    const wasAttending = attendingIds.has(eventId)
    setAttendingIds(prev => {
      const next = new Set(prev)
      if (wasAttending) next.delete(eventId)
      else next.add(eventId)
      return next
    })
    setEvents(prev => prev.map(ev =>
      ev.id === eventId ? { ...ev, interested_count: ev.interested_count + (wasAttending ? -1 : 1) } : ev
    ))
    try {
      await toggleEventAttend(eventId, user.id)
    } catch {
      setAttendingIds(prev => {
        const next = new Set(prev)
        if (wasAttending) next.add(eventId)
        else next.delete(eventId)
        return next
      })
      setEvents(prev => prev.map(ev =>
        ev.id === eventId ? { ...ev, interested_count: ev.interested_count + (wasAttending ? 1 : -1) } : ev
      ))
    }
  }

  const handleBannerPick = () => {
    const inp = document.createElement('input')
    inp.type = 'file'; inp.accept = 'image/jpeg,image/png,image/webp'
    inp.onchange = (e) => {
      const f = (e.target as HTMLInputElement).files?.[0]
      if (f) {
        const v = validateImageFile(f)
        if (!v.valid) { setBannerError(v.error!); return }
        setFormBanner(f); setFormBannerPreview(URL.createObjectURL(f)); setBannerError(null)
      }
    }
    inp.click()
  }

  const resetCreateForm = () => {
    setFormTitle(''); setFormDesc(''); setFormDate(''); setFormStartTime(''); setFormEndTime('')
    setFormVenue(''); setFormCategory(''); setFormOrganizer('')
    setFormRegUrl(''); setFormInstaUrl(''); setFormWhatsappUrl(''); setFormContact('')
    setFormBanner(null); if (formBannerPreview) URL.revokeObjectURL(formBannerPreview); setFormBannerPreview(null); setBannerError(null)
  }

  const handleCreateEvent = async () => {
    if (!user || !formTitle.trim() || !formDate) return
    setCreating(true)
    try {
      let bannerUrl: string | undefined
      if (formBanner) bannerUrl = await uploadItemImage(user.id, formBanner)
      const datetime = formStartTime ? `${formDate}T${formStartTime}:00` : `${formDate}T00:00:00`
      const endTime = formEndTime ? `${formDate}T${formEndTime}:00` : undefined
      const ev = await createEvent(
        user.id, formTitle.trim(), formDesc.trim(), datetime,
        formVenue.trim() || undefined, formCategory || undefined, formOrganizer.trim() || undefined,
        bannerUrl, formStartTime || undefined, endTime,
        formRegUrl.trim() || undefined, formInstaUrl.trim() || undefined,
        formWhatsappUrl.trim() || undefined, formContact.trim() || undefined,
      )
      setEvents(prev => [ev, ...prev])
      resetCreateForm(); setShowCreate(false)
    } catch {} finally { setCreating(false) }
  }

  // If detail view
  if (selectedEvent) {
    return <EventDetail event={selectedEvent} onBack={() => setSelectedEvent(null)} user={user} />
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Events</h1>
          <p className="text-gray-500 text-sm mt-0.5">Discover what's happening on campus</p>
        </div>
        {user && (
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zeal-500 text-white text-sm font-medium hover:bg-zeal-600 transition-colors">
            <Plus className="w-4 h-4" /> Create
          </button>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 lg:mx-0 lg:px-0">
        {FILTERS.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${filter === f.key ? 'bg-zeal-500 text-white' : 'bg-ink-800 text-gray-400 border border-ink-700 hover:text-white'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <SkeletonList count={4} />
      ) : error ? (
        <ErrorState onRetry={() => load(filter)} />
      ) : events.length === 0 ? (
        <EmptyState icon={<Calendar className="w-7 h-7" />} title="No events found"
          description="There are no events to show right now. Check back soon!" />
      ) : (
        <div className="space-y-3">
          {events.map(ev => {
            const isAttending = attendingIds.has(ev.id)
            return (
              <button key={ev.id} onClick={() => setSelectedEvent(ev)}
                className="w-full text-left card p-4 space-y-3 hover:bg-ink-800 transition-colors">
                {/* Banner */}
                {(ev.banner_url || ev.poster_url) && (
                  <img src={ev.banner_url || ev.poster_url!} alt={ev.title}
                    className="w-full h-36 object-cover rounded-xl" loading="lazy" />
                )}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-white font-semibold truncate">{ev.title}</h3>
                      {ev.category && (
                        <span className="shrink-0 px-2 py-0.5 rounded-full bg-zeal-500/10 text-zeal-400 text-xs font-medium">{ev.category}</span>
                      )}
                    </div>
                    {ev.description && <p className="text-gray-400 text-sm mt-1 line-clamp-2">{ev.description}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
                  <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {formatEventDate(ev.event_date)}</span>
                  {ev.start_time && <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {formatEventTime(ev.start_time)}</span>}
                  {ev.venue && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {ev.venue}</span>}
                  {ev.organizer && <span className="flex items-center gap-1"><Tag className="w-3.5 h-3.5" /> {ev.organizer}</span>}
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Users className="w-3.5 h-3.5" /> {formatNumber(ev.interested_count)} interested
                  </span>
                  {user && (
                    <button onClick={(e) => { e.stopPropagation(); handleToggle(ev.id) }}
                      className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-all ${isAttending ? 'bg-zeal-500 text-white' : 'bg-ink-800 border border-ink-700 text-gray-300 hover:text-white'}`}>
                      {isAttending ? 'Interested ✓' : 'Interested'}
                    </button>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Create Event Sheet */}
      <Sheet open={showCreate} onClose={() => { setShowCreate(false); resetCreateForm() }} title="Create Event">
        <div className="space-y-4">
          {/* Banner */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Banner (optional)</label>
            {formBannerPreview ? (
              <div className="relative">
                <img src={formBannerPreview} alt="Banner" className="w-full h-36 object-cover rounded-xl" />
                <button onClick={() => { setFormBanner(null); URL.revokeObjectURL(formBannerPreview); setFormBannerPreview(null) }}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button onClick={handleBannerPick}
                className="w-full py-6 rounded-xl border-2 border-dashed border-ink-600 hover:border-ink-500 flex flex-col items-center gap-2 transition-colors">
                <ImageIcon className="w-6 h-6 text-gray-500" />
                <span className="text-xs text-gray-500">Add event banner</span>
              </button>
            )}
            {bannerError && <p className="text-xs text-rose-400 mt-1">{bannerError}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Event Title *</label>
            <input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="Event name"
              className="w-full px-3 py-2.5 rounded-xl bg-ink-800 border border-ink-700 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-zeal-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Description</label>
            <textarea value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="About the event" rows={3}
              className="w-full px-3 py-2.5 rounded-xl bg-ink-800 border border-ink-700 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-zeal-500 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Date *</label>
              <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-ink-800 border border-ink-700 text-white text-sm focus:outline-none focus:border-zeal-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Category</label>
              <select value={formCategory} onChange={e => setFormCategory(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-ink-800 border border-ink-700 text-white text-sm focus:outline-none focus:border-zeal-500">
                <option value="">Select</option>
                {EVENT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Start Time</label>
              <input type="time" value={formStartTime} onChange={e => setFormStartTime(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-ink-800 border border-ink-700 text-white text-sm focus:outline-none focus:border-zeal-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">End Time</label>
              <input type="time" value={formEndTime} onChange={e => setFormEndTime(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-ink-800 border border-ink-700 text-white text-sm focus:outline-none focus:border-zeal-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Venue</label>
            <input value={formVenue} onChange={e => setFormVenue(e.target.value)} placeholder="Where is the event?"
              className="w-full px-3 py-2.5 rounded-xl bg-ink-800 border border-ink-700 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-zeal-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Organizer</label>
            <input value={formOrganizer} onChange={e => setFormOrganizer(e.target.value)} placeholder="Club or organizer name"
              className="w-full px-3 py-2.5 rounded-xl bg-ink-800 border border-ink-700 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-zeal-500" />
          </div>

          {/* Links */}
          <div className="border-t border-ink-700 pt-4 space-y-3">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Links & Contact</p>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Registration URL</label>
              <input value={formRegUrl} onChange={e => setFormRegUrl(e.target.value)} placeholder="https://forms.gle/..."
                className="w-full px-3 py-2.5 rounded-xl bg-ink-800 border border-ink-700 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-zeal-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Instagram URL</label>
              <input value={formInstaUrl} onChange={e => setFormInstaUrl(e.target.value)} placeholder="https://instagram.com/..."
                className="w-full px-3 py-2.5 rounded-xl bg-ink-800 border border-ink-700 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-zeal-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">WhatsApp Group URL</label>
              <input value={formWhatsappUrl} onChange={e => setFormWhatsappUrl(e.target.value)} placeholder="https://chat.whatsapp.com/..."
                className="w-full px-3 py-2.5 rounded-xl bg-ink-800 border border-ink-700 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-zeal-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Contact Number</label>
              <input value={formContact} onChange={e => setFormContact(e.target.value)} placeholder="+91 98765 43210"
                className="w-full px-3 py-2.5 rounded-xl bg-ink-800 border border-ink-700 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-zeal-500" />
            </div>
          </div>

          <button onClick={handleCreateEvent} disabled={!formTitle.trim() || !formDate || creating}
            className="w-full py-2.5 rounded-xl bg-zeal-500 text-white font-medium text-sm hover:bg-zeal-600 transition-colors disabled:opacity-50">
            {creating ? 'Creating...' : 'Create Event'}
          </button>
        </div>
      </Sheet>
    </div>
  )
}
