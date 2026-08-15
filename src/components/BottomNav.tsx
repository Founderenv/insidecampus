import { Home, Compass, Plus, MessageCircle, BookOpen, User } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'

const items = [
  { icon: Home, label: 'Home', path: '/home' },
  { icon: Compass, label: 'Explore', path: '/explore' },
  { icon: Plus, label: 'Create', path: '/create', isCenter: true },
  { icon: MessageCircle, label: 'Chat', path: '/chat' },
  { icon: BookOpen, label: 'Learn', path: '/resources' },
  { icon: User, label: 'Profile', path: '/profile/me' },
]

export function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 glass border-t border-ink-700 safe-bottom">
      <div className="flex items-center justify-around px-2 py-1.5">
        {items.map((item) => {
          const isActive = item.path === '/profile/me'
            ? location.pathname.startsWith('/profile')
            : location.pathname.startsWith(item.path)
          const Icon = item.icon

          if (item.isCenter) {
            return (
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                className="flex items-center justify-center w-12 h-12 rounded-2xl bg-zeal-500 text-ink-950 shadow-glow active:scale-90 transition-transform"
                aria-label={item.label}
              >
                <Icon className="w-6 h-6" strokeWidth={2.5} />
              </button>
            )
          }

          return (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-colors"
              aria-label={item.label}
            >
              <Icon
                className={`w-6 h-6 transition-colors ${isActive ? 'text-zeal-500' : 'text-gray-500'}`}
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
