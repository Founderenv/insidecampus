import { Home, Compass, Users, MessageCircle, Trophy, Gamepad2, Bell, BookOpen, User, LogOut } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Logo } from '@/components/Logo'
import { useAuth } from '@/context/AuthContext'
import { Avatar } from '@/components/Avatar'

const navItems = [
  { icon: Home, label: 'Home', path: '/home' },
  { icon: Compass, label: 'Explore', path: '/explore' },
  { icon: Users, label: 'Campus', path: '/campus' },
  { icon: MessageCircle, label: 'Messages', path: '/messages' },
  { icon: Trophy, label: 'Rankings', path: '/rankings' },
  { icon: Gamepad2, label: 'Games', path: '/games' },
  { icon: BookOpen, label: 'Resources', path: '/resources' },
  { icon: Bell, label: 'Notifications', path: '/notifications' },
]

export function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { profile, signOut } = useAuth()

  return (
    <aside className="hidden lg:flex flex-col w-64 h-screen sticky top-0 border-r border-ink-800 bg-ink-900 p-5">
      <button onClick={() => navigate('/home')} className="mb-8">
        <Logo size="md" />
      </button>

      <nav className="flex flex-col gap-1 flex-1">
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path)
          const Icon = item.icon
          return (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-zeal-500/10 text-zeal-500 border border-zeal-500/20'
                  : 'text-gray-400 hover:bg-ink-800 hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
              {item.label}
            </button>
          )
        })}
      </nav>

      <div className="border-t border-ink-800 pt-4 space-y-1">
        {profile && (
          <button
            onClick={() => navigate(`/profile/${profile.username || 'me'}`)}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all w-full ${
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
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-400 hover:bg-ink-800 hover:text-white transition-all w-full"
        >
          <LogOut className="w-5 h-5" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
