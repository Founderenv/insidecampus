import { useEffect, useState } from 'react'
import { Calendar, MapPin, Users, Tag, Clock } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { SkeletonList } from '@/components/Skeleton'
import { EmptyState, ErrorState } from '@/components/States'
import { fetchEvents, toggleEventAttend, fetchEventAttendeeIds } from '@/lib/data'
import { formatNumber } from '@/lib/utils'
import type { EventItem } from '@/types'

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'week', label: 'This Week' },
] as const

function formatEventDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatEventTime(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export function Events() {
  const { user } = useAuth()
  const [events, setEvents] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [filter, setFilter] = useState<string>('all')
  const [attendingIds, setAttendingIds] = useState<Set<string>>(new Set())

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
      ev.id === eventId
        ? { ...ev, interested_count: ev.interested_count + (wasAttending ? -1 : 1) }
        : ev
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
        ev.id === eventId
          ? { ...ev, interested_count: ev.interested_count + (wasAttending ? 1 : -1) }
          : ev
      ))
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-display font-bold text-white">Events</h1>
        <p className="text-gray-500 text-sm mt-0.5">Discover what's happening on campus</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 lg:mx-0 lg:px-0">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              filter === f.key
                ? 'bg-zeal-500 text-white'
                : 'bg-ink-800 text-gray-400 border border-ink-700 hover:text-white'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <SkeletonList count={4} />
      ) : error ? (
        <ErrorState onRetry={() => load(filter)} />
      ) : events.length === 0 ? (
        <EmptyState
          icon={<Calendar className="w-7 h-7" />}
          title="No events found"
          description="There are no events to show right now. Check back soon!"
        />
      ) : (
        <div className="space-y-3">
          {events.map(ev => {
            const isAttending = attendingIds.has(ev.id)
            return (
              <div key={ev.id} className="card p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-white font-semibold truncate">{ev.title}</h3>
                      {ev.category && (
                        <span className="shrink-0 px-2 py-0.5 rounded-full bg-zeal-500/10 text-zeal-400 text-xs font-medium">
                          {ev.category}
                        </span>
                      )}
                    </div>
                    {ev.description && (
                      <p className="text-gray-400 text-sm mt-1 line-clamp-2">{ev.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatEventDate(ev.event_date)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {formatEventTime(ev.event_date)}
                  </span>
                  {ev.venue && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {ev.venue}
                    </span>
                  )}
                  {ev.organizer && (
                    <span className="flex items-center gap-1">
                      <Tag className="w-3.5 h-3.5" />
                      {ev.organizer}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Users className="w-3.5 h-3.5" />
                    {formatNumber(ev.interested_count)} interested
                  </span>
                  {user && (
                    <button
                      onClick={() => handleToggle(ev.id)}
                      className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-all ${
                        isAttending
                          ? 'bg-zeal-500 text-white'
                          : 'bg-ink-800 border border-ink-700 text-gray-300 hover:text-white'
                      }`}
                    >
                      {isAttending ? 'Interested ✓' : 'Interested'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
