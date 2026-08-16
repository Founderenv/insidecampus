import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Calendar, MapPin, Users, Tag, Clock, Plus, ArrowLeft, ExternalLink,
  Instagram, Phone, MessageCircle, X, Image as ImageIcon, Heart, HandHeart,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Avatar } from '@/components/Avatar'
import { SkeletonList } from '@/components/Skeleton'
import { EmptyState, ErrorState } from '@/components/States'
import { Sheet } from '@/components/Sheet'
import {
  fetchEvents, fetchEventById, toggleEventAttend, fetchEventAttendeeIds, createEvent,
  applyEventVolunteer, removeEventVolunteer, fetchEventVolunteers, fetchEventVolunteerIds,
  uploadItemImage, validateImageFile,
} from '@/lib/data'
import { formatNumber } from '@/lib/utils'
import type { EventItem, EventVolunteer } from '@/types'

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'week', label: 'This Week' },
] as const

const DEPARTMENTS = [
  'Computer Engineering', 'IT', 'Electronics', 'Mechanical', 'Civil',
  'Electrical', 'Chemical', 'Student Council', 'NSS', 'Coding Club',
  'Cultural Committee', 'Other',
] as const

function formatEventDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function formatEventTime(timeStr: string): string {
  if (!timeStr) return ''
  // start_time/end_time are stored as timestamptz, but legacy rows may hold "HH:MM"
  if (/^\d{2}:\d{2}/.test(timeStr)) {
    const [h, m] = timeStr.split(':')
    const hour = parseInt(h || '0')
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const h12 = hour % 12 || 12
    return `${h12}:${m || '00'} ${ampm}`
  }
  const d = new Date(timeStr)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function normalizeWhatsAppNumber(num: string): string {
  const digits = num.replace(/\D/g, '')
  if (digits.length === 10) return `91${digits}`
  if (digits.length === 12 && digits.startsWith('91')) return digits
  return digits
}

/* ================================================================ */
/*  EVENT DETAIL PAGE                                                */
/* ================================================================ */

function EventDetailPage({ eventId, user }: { eventId: string; user: any }) {
  const navigate = useNavigate()
  const [event, setEvent] = useState<EventItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [attending, setAttending] = useState(false)
  const [interestedCount, setInterestedCount] = useState(0)
  const [volunteers, setVolunteers] = useState<EventVolunteer[]>([])
  const [isVolunteer, setIsVolunteer] = useState(false)
  const [volunteering, setVolunteering] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetchEventById(eventId).then(ev => {
      if (!ev) { setLoading(false); return }
      setEvent(ev)
      setInterestedCount(ev.interested_count)
      if (user) {
        fetchEventAttendeeIds(ev.id).then(ids => setAttending(ids.has(user.id))).catch(() => {})
        fetchEventVolunteers(ev.id).then(setVolunteers).catch(() => {})
        fetchEventVolunteerIds(ev.id).then(ids => setIsVolunteer(ids.has(user.id))).catch(() => {})
      }
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [eventId, user])

  const handleToggleInterested = async () => {
    if (!user || !event) return
    const was = attending
    setAttending(!was)
    setInterestedCount(c => c + (was ? -1 : 1))
    try { await toggleEventAttend(event.id, user.id) } catch {
      setAttending(was)
      setInterestedCount(c => c + (was ? 1 : -1))
    }
  }

  const handleVolunteer = async () => {
    if (!user || !event || volunteering) return
    setVolunteering(true)
    try {
      if (isVolunteer) {
        await removeEventVolunteer(event.id, user.id)
        setIsVolunteer(false)
        setVolunteers(prev => prev.filter(v => v.user_id !== user.id))
      } else {
        const v = await applyEventVolunteer(event.id, user.id)
        setIsVolunteer(true)
        if (user) {
          v.user = { id: user.id, full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Student', avatar_url: user.user_metadata?.avatar_url || null, username: null, bio: '', college_id: null, branch_id: null, year: 0, gender: '', show_gender: false, show_year: false, is_private: false, instagram: null, phone: null, email_visible: false, aura_badges: [], zeal_score: 0, smart_score: 0, game_xp: 0, game_level: 0, follower_count: 0, following_count: 0, post_count: 0, onboarding_completed: true, is_admin: false, is_banned: false, created_at: '' }
        }
        setVolunteers(prev => [...prev, v])
      }
    } catch {} finally { setVolunteering(false) }
  }

  if (loading) return <SkeletonList count={3} />
  if (!event) return <div className="text-center py-12"><p className="text-gray-500">Event not found.</p></div>

  const dept = event.organizing_department || event.organizer || ''
  const hasRegistration = !!event.registration_url
  const hasWhatsApp = !!event.contact_number
  const hasWhatsAppGroup = !!event.whatsapp_group_url
  const hasInstagram = !!event.instagram_url

  return (
    <div className="space-y-0 pb-8">
      {/* Back */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-white p-1">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold text-white truncate flex-1">Event Details</h1>
      </div>

      {/* Event Name */}
      <h2 className="text-2xl font-bold text-white mb-1">{event.title}</h2>
      {dept && <p className="text-sm text-zeal-400 font-medium mb-4">{dept}</p>}

      {/* Banner */}
      {(event.banner_url || event.poster_url) && (
        <img src={event.banner_url || event.poster_url!} alt={event.title}
          className="w-full aspect-[16/9] object-cover rounded-2xl mb-4" loading="lazy" />
      )}

      {/* Description */}
      {event.description && (
        <div className="mb-4">
          <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{event.description}</p>
        </div>
      )}

      {/* Event Info */}
      <div className="card p-4 space-y-3 mb-4">
        <div className="space-y-2.5 text-sm">
          <div className="flex items-center gap-3 text-gray-300">
            <Calendar className="w-4 h-4 text-zeal-500 shrink-0" />
            <span>{formatEventDate(event.event_date)}</span>
          </div>
          {(event.start_time || event.end_time) && (
            <div className="flex items-center gap-3 text-gray-300">
              <Clock className="w-4 h-4 text-zeal-500 shrink-0" />
              <span>
                {event.start_time ? formatEventTime(event.start_time) : ''}
                {event.start_time && event.end_time ? ' — ' : ''}
                {event.end_time ? formatEventTime(event.end_time) : ''}
              </span>
            </div>
          )}
          {event.venue && (
            <div className="flex items-center gap-3 text-gray-300">
              <MapPin className="w-4 h-4 text-zeal-500 shrink-0" />
              <span>{event.venue}</span>
            </div>
          )}
          {dept && (
            <div className="flex items-center gap-3 text-gray-300">
              <Tag className="w-4 h-4 text-zeal-500 shrink-0" />
              <span>{dept}</span>
            </div>
          )}
          {event.organizer && event.organizer !== dept && (
            <div className="flex items-center gap-3 text-gray-300">
              <Users className="w-4 h-4 text-zeal-500 shrink-0" />
              <span>{event.organizer}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 pt-2 border-t border-ink-700">
          <span className="flex items-center gap-1.5 text-xs text-gray-500">
            <Heart className="w-3.5 h-3.5" /> {formatNumber(interestedCount)} interested
          </span>
          {user && (
            <button onClick={handleToggleInterested}
              className={`ml-auto px-4 py-1.5 rounded-xl text-sm font-medium transition-all ${attending ? 'bg-zeal-500 text-white' : 'bg-ink-800 border border-ink-700 text-gray-300 hover:text-white'}`}>
              {attending ? 'Interested ✓' : 'Interested'}
            </button>
          )}
        </div>
      </div>

      {/* Register / Apply */}
      {hasRegistration && (
        <a href={event.registration_url!} target="_blank" rel="noopener noreferrer"
          className="block w-full text-center py-3 rounded-2xl bg-zeal-500 text-white font-semibold text-sm hover:bg-zeal-600 transition-colors mb-4">
          Register for Event
        </a>
      )}

      {/* Apply for Volunteer */}
      {user && (
        <div className="card p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HandHeart className="w-4 h-4 text-zeal-500" />
              <span className="text-sm font-medium text-white">Volunteer for this event</span>
            </div>
            <button onClick={handleVolunteer} disabled={volunteering}
              className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-all ${isVolunteer ? 'bg-ink-700 text-gray-400 border border-ink-600' : 'bg-zeal-500 text-white hover:bg-zeal-600'} disabled:opacity-50`}>
              {volunteering ? '...' : isVolunteer ? 'Volunteering ✓' : 'Apply'}
            </button>
          </div>
        </div>
      )}

      {/* Volunteer List */}
      {volunteers.length > 0 && (
        <div className="card p-4 mb-4 space-y-3">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <HandHeart className="w-4 h-4 text-zeal-500" /> Volunteers · {volunteers.length}
          </h3>
          <div className="space-y-2">
            {volunteers.map(v => (
              <button key={v.id} onClick={() => v.user?.username && navigate(`/profile/${v.user.username}`)}
                className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-ink-800 transition-colors text-left">
                <Avatar src={v.user?.avatar_url || null} alt={v.user?.full_name || ''} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{v.user?.full_name || 'Student'}</p>
                  <p className="text-[11px] text-gray-500">
                    {[v.user?.branch_id ? 'Dept' : '', v.user?.year ? `SY` : ''].filter(Boolean).join(' · ') || 'Student'}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* About / More Information */}
      <div className="card p-4 space-y-3 mb-4">
        <h3 className="text-sm font-semibold text-white">About / More Information</h3>
        <div className="space-y-2.5">
          {hasWhatsApp && (
            <a href={`https://wa.me/${normalizeWhatsAppNumber(event.contact_number!)}?text=${encodeURIComponent('Hi, I found your event on InsideZeal and wanted more information.')}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 p-2.5 rounded-xl bg-ink-800 hover:bg-ink-700 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-green-500/15 flex items-center justify-center shrink-0">
                <Phone className="w-4 h-4 text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Contact Organizer</p>
                <p className="text-[11px] text-gray-500">WhatsApp</p>
              </div>
            </a>
          )}
          {hasWhatsAppGroup && (
            <a href={event.whatsapp_group_url!} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 p-2.5 rounded-xl bg-ink-800 hover:bg-ink-700 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-green-500/15 flex items-center justify-center shrink-0">
                <MessageCircle className="w-4 h-4 text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Join Event Group</p>
                <p className="text-[11px] text-gray-500">WhatsApp Community</p>
              </div>
            </a>
          )}
          {hasInstagram && (
            <a href={event.instagram_url!} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 p-2.5 rounded-xl bg-ink-800 hover:bg-ink-700 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-pink-500/15 flex items-center justify-center shrink-0">
                <Instagram className="w-4 h-4 text-pink-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">View Event Instagram</p>
                <p className="text-[11px] text-gray-500">@{event.instagram_url!.split('/').filter(Boolean).pop() || 'page'}</p>
              </div>
            </a>
          )}
          {!hasWhatsApp && !hasWhatsAppGroup && !hasInstagram && (
            <p className="text-xs text-gray-500">No additional contact information provided.</p>
          )}
        </div>
      </div>
    </div>
  )
}

/* ================================================================ */
/*  EVENTS LIST VIEW                                                 */
/* ================================================================ */

export function Events() {
  const { id: urlEventId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [events, setEvents] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [filter, setFilter] = useState<string>('all')
  const [attendingIds, setAttendingIds] = useState<Set<string>>(new Set())

  // Create form
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [formTitle, setFormTitle] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formDate, setFormDate] = useState('')
  const [formStartTime, setFormStartTime] = useState('')
  const [formEndTime, setFormEndTime] = useState('')
  const [formVenue, setFormVenue] = useState('')
  const [formDept, setFormDept] = useState('')
  const [formOrganizer, setFormOrganizer] = useState('')
  const [formRegUrl, setFormRegUrl] = useState('')
  const [formInstaUrl, setFormInstaUrl] = useState('')
  const [formWhatsappNumber, setFormWhatsappNumber] = useState('')
  const [formWhatsappGroup, setFormWhatsappGroup] = useState('')
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
    setFormVenue(''); setFormDept(''); setFormOrganizer('')
    setFormRegUrl(''); setFormInstaUrl(''); setFormWhatsappNumber(''); setFormWhatsappGroup('')
    setFormBanner(null); if (formBannerPreview) URL.revokeObjectURL(formBannerPreview); setFormBannerPreview(null); setBannerError(null); setCreateError(null)
  }

  const handleCreateEvent = async () => {
    if (!user || !formTitle.trim() || !formDate) return
    if (creating) return
    setCreating(true)
    setCreateError(null)
    try {
      let bannerUrl: string | undefined
      if (formBanner) bannerUrl = await uploadItemImage(user.id, formBanner)
      // event_date / start_time / end_time are timestamptz columns — send full ISO strings.
      // Sending bare "HH:MM" here makes Postgres reject the whole insert.
      const startTime = formStartTime ? new Date(`${formDate}T${formStartTime}:00`).toISOString() : null
      const endTime = formEndTime ? new Date(`${formDate}T${formEndTime}:00`).toISOString() : null
      const eventDate = startTime || new Date(`${formDate}T00:00:00`).toISOString()
      const ev = await createEvent(
        user.id, formTitle.trim(), formDesc.trim(), eventDate,
        formVenue.trim() || undefined, undefined, formOrganizer.trim() || undefined,
        bannerUrl, startTime || undefined, endTime || undefined,
        formRegUrl.trim() || undefined, formInstaUrl.trim() || undefined,
        undefined, formWhatsappGroup.trim() || undefined,
        formWhatsappNumber.trim() || undefined,
        formDept || undefined,
      )
      setEvents(prev => [ev, ...prev])
      resetCreateForm(); setShowCreate(false)
    } catch (err: any) {
      console.error('Create event failed:', err)
      const msg = err?.message || String(err || '')
      setCreateError(msg.includes('not found') || msg.includes('relation')
        ? 'Could not create the event. Please try again.'
        : msg || 'Could not create the event. Please try again.')
    } finally { setCreating(false) }
  }

  // Event detail page (routed via /events/:id)
  if (urlEventId) {
    return <EventDetailPage eventId={urlEventId} user={user} />
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
            const dept = ev.organizing_department || ev.organizer || ''
            return (
              <button key={ev.id} onClick={() => navigate(`/events/${ev.id}`)}
                className="w-full text-left card overflow-hidden hover:bg-ink-800 transition-colors">
                {/* Large Banner */}
                {(ev.banner_url || ev.poster_url) ? (
                  <img src={ev.banner_url || ev.poster_url!} alt={ev.title}
                    className="w-full h-44 object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-24 bg-gradient-to-br from-zeal-500/20 to-ink-800 flex items-center justify-center">
                    <Calendar className="w-10 h-10 text-zeal-500/40" />
                  </div>
                )}
                <div className="p-4 space-y-2">
                  <div>
                    <h3 className="text-white font-bold text-base">{ev.title}</h3>
                    {dept && <p className="text-xs text-zeal-400 mt-0.5">{dept}</p>}
                  </div>
                  {ev.description && <p className="text-gray-400 text-xs line-clamp-2">{ev.description}</p>}
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(ev.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    {ev.start_time && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatEventTime(ev.start_time)}</span>}
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Heart className="w-3.5 h-3.5" /> {formatNumber(ev.interested_count)} interested
                    </span>
                    {user && (
                      <button onClick={(e) => { e.stopPropagation(); handleToggle(ev.id) }}
                        className={`px-3.5 py-1 rounded-xl text-xs font-medium transition-all ${isAttending ? 'bg-zeal-500 text-white' : 'bg-ink-800 border border-ink-700 text-gray-300 hover:text-white'}`}>
                        {isAttending ? 'Interested ✓' : 'Interested'}
                      </button>
                    )}
                  </div>
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
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Event Banner</label>
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
                <span className="text-xs text-gray-500">Select event poster/banner</span>
              </button>
            )}
            {bannerError && <p className="text-xs text-rose-400 mt-1">{bannerError}</p>}
          </div>

          {/* Basic Details */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Event Name *</label>
            <input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="e.g. AI Hackathon 2026"
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
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Venue</label>
              <input value={formVenue} onChange={e => setFormVenue(e.target.value)} placeholder="Where?"
                className="w-full px-3 py-2.5 rounded-xl bg-ink-800 border border-ink-700 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-zeal-500" />
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

          {/* Department / Club */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Organizing Department / Club</label>
            <select value={formDept} onChange={e => setFormDept(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-ink-800 border border-ink-700 text-white text-sm focus:outline-none focus:border-zeal-500">
              <option value="">Select department / club</option>
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Organizer Name</label>
            <input value={formOrganizer} onChange={e => setFormOrganizer(e.target.value)} placeholder="e.g. Coding Club"
              className="w-full px-3 py-2.5 rounded-xl bg-ink-800 border border-ink-700 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-zeal-500" />
          </div>

          {/* Registration */}
          <div className="border-t border-ink-700 pt-4 space-y-3">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Registration</p>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Google Form / Registration Link</label>
              <input value={formRegUrl} onChange={e => setFormRegUrl(e.target.value)} placeholder="https://forms.gle/..."
                className="w-full px-3 py-2.5 rounded-xl bg-ink-800 border border-ink-700 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-zeal-500" />
            </div>
          </div>

          {/* Contact / Social */}
          <div className="border-t border-ink-700 pt-4 space-y-3">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Contact / Social</p>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">WhatsApp Contact Number</label>
              <input value={formWhatsappNumber} onChange={e => setFormWhatsappNumber(e.target.value)} placeholder="+91 98765 43210"
                className="w-full px-3 py-2.5 rounded-xl bg-ink-800 border border-ink-700 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-zeal-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">WhatsApp Group / Community Link</label>
              <input value={formWhatsappGroup} onChange={e => setFormWhatsappGroup(e.target.value)} placeholder="https://chat.whatsapp.com/..."
                className="w-full px-3 py-2.5 rounded-xl bg-ink-800 border border-ink-700 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-zeal-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Instagram Event Page</label>
              <input value={formInstaUrl} onChange={e => setFormInstaUrl(e.target.value)} placeholder="https://instagram.com/..."
                className="w-full px-3 py-2.5 rounded-xl bg-ink-800 border border-ink-700 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-zeal-500" />
            </div>
          </div>

          {createError && (
            <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2">{createError}</p>
          )}

          <button onClick={handleCreateEvent} disabled={!formTitle.trim() || !formDate || creating}
            className="w-full py-2.5 rounded-xl bg-zeal-500 text-white font-medium text-sm hover:bg-zeal-600 transition-colors disabled:opacity-50">
            {creating ? 'Creating...' : 'Create Event'}
          </button>
        </div>
      </Sheet>
    </div>
  )
}
