import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Logo } from '@/components/Logo'

export function Login() {
  const { user, profile, signInWithGoogle, loading, authInitialized } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (loading || !authInitialized) return
    if (user && profile?.onboarding_completed) navigate('/home', { replace: true })
    else if (user && !profile?.onboarding_completed) navigate('/onboarding', { replace: true })
  }, [user, profile, loading, authInitialized, navigate])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-ink-950 relative overflow-hidden">
      {/* Background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-zeal-500/8 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-zeal-600/5 rounded-full blur-3xl" />

      <button
        onClick={() => navigate('/welcome')}
        className="absolute top-5 left-5 z-20 text-gray-500 hover:text-white transition-colors"
        aria-label="Back to welcome"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
      </button>

      <div className="relative z-10 flex flex-col items-center gap-8 max-w-sm w-full">
        {/* Logo + tagline */}
        <div className="animate-fade-in flex flex-col items-center gap-4">
          <Logo size="lg" showTagline />
        </div>

        {/* Login card */}
        <div className="card p-6 w-full text-center animate-slide-up">
          <h1 className="text-2xl font-display font-bold text-white mb-2">
            Your campus. Your people. Your vibe.
          </h1>
          <p className="text-gray-400 text-sm mb-6">
            One digital home for every student. Posts, chat, gossip, projects, and more.
          </p>

          <button
            onClick={signInWithGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white text-ink-950 font-semibold rounded-xl px-5 py-3.5 transition-all hover:bg-gray-100 active:scale-95 disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <p className="text-xs text-gray-600 mt-4">
            By continuing, you agree to InsideZeal's community guidelines.
          </p>
        </div>

        <p className="text-xs text-gray-600 text-center">
          InsideZeal is an unofficial student social network. Not affiliated with any college.
        </p>
      </div>
    </div>
  )
}
