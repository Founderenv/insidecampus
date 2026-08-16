import { Home, Flame, BookOpen, Heart, User } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'

const items = [
  { icon: Home, label: 'Home', path: '/home' },
  { icon: Flame, label: 'Gossip', path: '/gossip' },
  { icon: BookOpen, label: 'Learn', path: '/resources-learn' },
  { icon: Heart, label: 'Chat', path: '/match' },
  { icon: User, label: 'Profile', path: '/profile' },
]

export function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 glass border-t border-ink-700 safe-bottom">
      <div className="flex items-center justify-around px-1 py-1 max-w-lg mx-auto">
        {items.map((item) => {
          const isActive = item.path === '/profile'
            ? location.pathname.startsWith('/profile')
            : location.pathname.startsWith(item.path)
          const Icon = item.icon

          return (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors min-w-[52px]"
              aria-label={item.label}
            >
              <Icon
                className={`w-5 h-5 transition-colors ${isActive ? 'text-zeal-500' : 'text-gray-500'}`}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span className={`text-[10px] font-medium transition-colors ${isActive ? 'text-zeal-500' : 'text-gray-500'}`}>
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
