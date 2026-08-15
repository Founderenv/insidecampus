import { useNavigate } from 'react-router-dom'
import { Flame, Eye, Star, Calendar, Brain, Gamepad2, Trophy, Users, Handshake, BookOpen, Package, ShoppingBag, Rocket } from 'lucide-react'

const modules = [
  { icon: Flame, label: 'Gossip', desc: 'Trending campus buzz', path: '/gossip', color: 'text-orange-400' },
  { icon: Eye, label: 'Confessions', desc: 'Anonymous secrets', path: '/confessions', color: 'text-rose-400' },
  { icon: Star, label: 'Teacher Reviews', desc: 'Rate your professors', path: '/teachers', color: 'text-yellow-400' },
  { icon: Calendar, label: 'Events', desc: 'Campus happenings', path: '/events', color: 'text-zeal-500' },
  { icon: Brain, label: 'Smart League', desc: 'Build your Smart Score', path: '/smart', color: 'text-blue-400' },
  { icon: Gamepad2, label: 'Games', desc: 'Play & earn XP', path: '/games', color: 'text-purple-400' },
  { icon: Trophy, label: 'Rankings', desc: 'Campus leaderboards', path: '/rankings', color: 'text-amber-400' },
  { icon: Users, label: 'Clubs', desc: 'Join communities', path: '/clubs', color: 'text-cyan-400' },
  { icon: Handshake, label: 'Projects', desc: 'Find teammates', path: '/projects', color: 'text-teal-400' },
  { icon: BookOpen, label: 'Lost & Found', desc: 'Lost something?', path: '/lost-found', color: 'text-indigo-400' },
  { icon: Package, label: 'Marketplace', desc: 'Buy & sell items', path: '/marketplace', color: 'text-pink-400' },
  { icon: Rocket, label: 'Builders', desc: 'Student startups', path: '/builders', color: 'text-green-400' },
]

export function Campus() {
  const navigate = useNavigate()

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-display font-bold text-white mb-1">Campus Hub</h1>
        <p className="text-gray-500 text-sm">Everything happening at your college, in one place.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {modules.map(m => {
          const Icon = m.icon
          return (
            <button
              key={m.label}
              onClick={() => navigate(m.path)}
              className="card card-hover p-4 text-left flex flex-col gap-2 group"
            >
              <div className={`w-10 h-10 rounded-xl bg-ink-800 flex items-center justify-center ${m.color} group-hover:scale-110 transition-transform`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-white text-sm">{m.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{m.desc}</p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
