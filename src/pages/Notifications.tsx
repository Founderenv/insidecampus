import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Heart, UserPlus, MessageCircle, Trophy, Rocket, Calendar, UserCheck } from 'lucide-react'
import { Avatar } from '@/components/Avatar'
import { SkeletonList } from '@/components/Skeleton'
import { EmptyState } from '@/components/States'
import { fetchNotifications, markNotificationsRead } from '@/lib/data'
import { timeAgo } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'
import type { Notification } from '@/types'

const iconMap: Record<string, typeof Heart> = {
  like: Heart,
  comment: MessageCircle,
  follow: UserPlus,
  follow_request: UserPlus,
  event: Calendar,
  rank: Trophy,
  project_interest: Rocket,
  system: Bell,
}

function getNotificationRoute(n: Notification): string | null {
  if (n.entity_type === 'contact_request' && n.entity_id) return '/requests'
  if (n.entity_type === 'post' && n.entity_id) return `/post/${n.entity_id}`
  if (n.entity_type === 'user' && n.actor) return `/profile/${n.actor.username}`
  if (n.type === 'follow' && n.actor) return `/profile/${n.actor.username}`
  if (n.type === 'follow_request' && n.actor) return `/profile/${n.actor.username}`
  return null
}

function getNotificationText(n: Notification): string {
  const name = n.actor?.full_name || 'Someone'
  switch (n.type) {
    case 'like': return `${name} liked your post`
    case 'comment': return `${name} commented on your post`
    case 'follow': return `${name} followed you`
    case 'follow_request': return `${name} wants to follow you`
    case 'event': return n.content || `${name} shared an event`
    case 'rank': return n.content || 'Your campus rank updated'
    case 'project_interest': return `${name} is interested in your project`
    default: return n.content || `${name} did something`
  }
}

export function Notifications() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    fetchNotifications(user.id)
      .then(setNotifications)
      .catch(() => {})
      .finally(() => setLoading(false))
    markNotificationsRead(user.id)
  }, [user])

  const handleClick = (n: Notification) => {
    const route = getNotificationRoute(n)
    if (route) navigate(route)
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-display font-bold text-white mb-1 flex items-center gap-2">
          <Bell className="w-7 h-7 text-zeal-500" /> Notifications
        </h1>
        <div className="flex items-center justify-between">
          <p className="text-gray-500 text-sm">Stay updated on campus activity.</p>
          <button onClick={() => navigate('/requests')} className="text-xs text-zeal-400 hover:text-zeal-300 shrink-0">
            Contact requests →
          </button>
        </div>
      </div>

      {loading ? (
        <SkeletonList count={4} />
      ) : notifications.length === 0 ? (
        <EmptyState icon={<Bell className="w-7 h-7" />} title="No notifications" description="You're all caught up!" />
      ) : (
        <div className="space-y-2">
          {notifications.map(n => {
            const Icon = iconMap[n.type] || Bell
            const route = getNotificationRoute(n)
            return (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                className={`w-full card p-3 flex items-center gap-3 text-left transition-colors ${route ? 'hover:border-ink-600 cursor-pointer' : ''} ${!n.is_read ? 'border-zeal-500/20' : ''}`}
              >
                <div className="w-9 h-9 rounded-xl bg-ink-800 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-zeal-500" />
                </div>
                {n.actor && <Avatar src={n.actor.avatar_url} alt={n.actor.full_name} size="xs" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-200">{getNotificationText(n)}</p>
                  <p className="text-xs text-gray-600">{timeAgo(n.created_at)}</p>
                </div>
                {!n.is_read && <div className="w-2 h-2 rounded-full bg-zeal-500 shrink-0" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
