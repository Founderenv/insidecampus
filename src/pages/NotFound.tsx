import { useNavigate } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { Logo } from '@/components/Logo'

export function NotFound() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-ink-950 gap-6">
      <Logo size="md" />
      <div className="text-center">
        <p className="text-6xl font-bold text-zeal-500 mb-2">404</p>
        <p className="text-gray-400 text-lg">This page wandered off campus.</p>
      </div>
      <button onClick={() => navigate('/home')} className="btn-primary flex items-center gap-2">
        <Compass className="w-4 h-4" /> Back to Home
      </button>
    </div>
  )
}
