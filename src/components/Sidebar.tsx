import { Home, Flame, BookOpen, Heart, User, LayoutGrid, MapPin, LogOut } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Logo } from '@/components/Logo'
import { useAuth } from '@/context/AuthContext'
import { Avatar } from '@/components/Avatar'

const primaryItems = [
  { icon: Home, label: 'Home', path: '/home' },
  { icon: Flame, label: 'Gossip', path: '/gossip' },
  { icon: BookOpen, label: 'Learn', path: '/resources-learn' },
  { icon: Heart, label: 'Chat', path: '/match' },
  { icon: User, label: 'Profile', path: '/profile/me' },
]

const secondaryItems = [
  { icon: LayoutGrid, label: 'Campus', path: '/campus' },
  { icon: MapPin, label: 'Nearby', path: '/nearby' },
]

export function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { profile, signOut } = useAuth()

  return (
    <aside className="hidden lg:flex flex-col w-[220px] h-screen sticky top-0 border-r border-ink-800 bg-ink-900 shrink-0">
      <div className="p-5 pb-4">
        <button onClick={() => navigate('/home')}>
          <Logo size="md" />
        </button>
      </div>

      <nav className="flex flex-col gap-0.5 flex-1 px-3">
        {primaryItems.map((item) => {
          const isActive = item.path === '/profile/me'
            ? location.pathname.startsWith('/profile')
            : location.pathname.startsWith(item.path)
          const Icon = item.icon
          return (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-zeal-500/10 text-zeal-500'
                  : 'text-gray-400 hover:bg-ink-800 hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
              {item.label}
            </button>
          )
        })}

        <div className="my-3 border-t border-ink-800" />

        {secondaryItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path)
          const Icon = item.icon
          return (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-zeal-500/10 text-zeal-500'
                  : 'text-gray-500 hover:bg-ink-800 hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
              {item.label}
            </button>
          )
        })}
      </nav>

      <div className="border-t border-ink-800 p-3">
        {profile && (
          <button
            onClick={() => navigate(`/profile/${profile.username || 'me'}`)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all w-full ${
              location.pathname.startsWith('/profile')
                ? 'bg-zeal-500/10 text-zeal-500'
                : 'text-gray-400 hover:bg-ink-800 hover:text-white'
            }`}
          >
            <Avatar src={profile.avatar_url} alt={profile.full_name} size="xs" />
            <span className="truncate">{profile.full_name}</span>
          </button>
        )}
        <button
          onClick={signOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-ink-800 hover:text-white transition-all w-full"
        >
          <LogOut className="w-5 h-5" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
