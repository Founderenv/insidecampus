import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Download, ArrowRight, Newspaper, Flame, BookOpen, MessageCircle, CalendarDays, MapPin, Users, Store, PackageSearch, Smartphone, ShieldCheck } from 'lucide-react'
import { Logo } from '@/components/Logo'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const FEATURES = [
  { icon: Newspaper, label: 'Campus Feed' },
  { icon: Flame, label: 'Gossip' },
  { icon: BookOpen, label: 'Learn' },
  { icon: MessageCircle, label: 'Messages' },
  { icon: CalendarDays, label: 'Events' },
  { icon: MapPin, label: 'Nearby' },
]

const SECTIONS = [
  { icon: Users, label: 'Campus Conversations' },
  { icon: BookOpen, label: 'Resources & Notes' },
  { icon: CalendarDays, label: 'Events' },
  { icon: Store, label: 'Marketplace' },
  { icon: PackageSearch, label: 'Lost & Found' },
  { icon: MapPin, label: 'Nearby' },
]

export function Welcome() {
  const navigate = useNavigate()
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isStandalone, setIsStandalone] = useState(false)
  const [justInstalled, setJustInstalled] = useState(false)

  useEffect(() => {
    setIsStandalone(
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true
    )

    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    const onAppInstalled = () => {
      setJustInstalled(true)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onAppInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onAppInstalled)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice
    if (choice.outcome === 'accepted') setJustInstalled(true)
    setDeferredPrompt(null)
  }

  const showInstallCta = !isStandalone && !justInstalled
  const canInstall = !!deferredPrompt && showInstallCta

  return (
    <div className="min-h-screen bg-ink-950 text-white overflow-x-hidden">
      <div className="relative min-h-screen flex flex-col">
        <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-zeal-500/10 rounded-full blur-3xl" />
        <div className="pointer-events-none absolute bottom-1/4 right-0 w-80 h-80 bg-zeal-600/5 rounded-full blur-3xl" />

        <header className="relative flex items-center justify-between px-5 pt-6 pb-2 max-w-md mx-auto w-full lg:max-w-2xl">
          <Logo size="md" />
          <button
            onClick={() => navigate('/login')}
            className="btn-secondary py-2 px-3.5 text-sm shrink-0"
          >
            Sign In
          </button>
        </header>

        <main className="relative flex-1 flex flex-col items-center px-5 py-10 max-w-md mx-auto w-full lg:max-w-2xl">
          <div className="flex flex-col items-center text-center gap-5">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-zeal-500/30 bg-zeal-500/10 px-3.5 py-1.5 text-xs font-medium text-zeal-400 tracking-wide">
              <ShieldCheck className="w-3.5 h-3.5" />
              Your campus. One community.
            </span>

            <h1 className="font-display font-bold tracking-tight text-3xl leading-tight sm:text-4xl">
              Everything happening in your{' '}
              <span className="text-zeal-500">campus</span>, in one place.
            </h1>

            <p className="text-gray-400 text-sm sm:text-base leading-relaxed">
              Connect with students, join campus conversations, discover events,
              share resources, explore nearby places, and more.
            </p>

            <div className="flex flex-col gap-3 w-full mt-2 sm:max-w-sm">
              {canInstall ? (
                <button onClick={handleInstall} className="btn-primary w-full py-3.5 flex items-center justify-center gap-2 text-base">
                  <Download className="w-5 h-5" />
                  Install InsideZeal
                </button>
              ) : showInstallCta ? (
                <>
                  <div className="w-full py-3.5 rounded-2xl bg-ink-800 border border-ink-700 flex items-center justify-center gap-2 text-base font-semibold">
                    <Smartphone className="w-5 h-5 text-zeal-500" />
                    Add InsideZeal to Home Screen
                  </div>
                  <ul className="text-xs text-gray-500 text-left space-y-1.5 max-w-xs mx-auto">
                    <li><span className="text-zeal-400">Android Chrome:</span> Menu → Add to Home screen / Install app</li>
                    <li><span className="text-zeal-400">iPhone Safari:</span> Share → Add to Home Screen</li>
                  </ul>
                </>
              ) : (
                <button onClick={() => navigate('/login')} className="btn-primary w-full py-3.5 flex items-center justify-center gap-2 text-base">
                  Continue to InsideZeal
                  <ArrowRight className="w-5 h-5" />
                </button>
              )}

              {showInstallCta && (
                <button
                  onClick={() => navigate('/login')}
                  className="text-sm text-gray-500 hover:text-gray-300 transition-colors py-1"
                >
                  Continue without installing
                </button>
              )}
            </div>
          </div>

          <div className="w-full mt-12 grid grid-cols-3 gap-3">
            {FEATURES.map((f) => (
              <div key={f.label} className="card flex flex-col items-center gap-2 py-4 text-center">
                <f.icon className="w-5 h-5 text-zeal-500" />
                <span className="text-xs font-medium text-gray-300">{f.label}</span>
              </div>
            ))}
          </div>

          <div className="w-full mt-10 bg-ink-900/60 border border-ink-800 rounded-3xl p-5">
            <h2 className="font-display font-semibold text-lg text-center">Made for your campus</h2>
            <div className="grid grid-cols-2 gap-3 mt-4">
              {SECTIONS.map((s) => (
                <div key={s.label} className="flex items-center gap-2.5 rounded-2xl bg-ink-800/70 border border-ink-700/60 px-3 py-3">
                  <s.icon className="w-4 h-4 text-zeal-500 shrink-0" />
                  <span className="text-xs text-gray-300">{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="w-full flex flex-col items-center gap-3 mt-10 pb-6">
            <button onClick={() => navigate('/login')} className="btn-primary w-full sm:max-w-sm py-3.5 flex items-center justify-center gap-2 text-base">
              Continue to InsideZeal
              <ArrowRight className="w-5 h-5" />
            </button>
            <p className="text-xs text-gray-600 text-center max-w-xs leading-relaxed">
              Free for students from your campus. Sign in with Google — no separate password to remember.
            </p>
          </div>
        </main>
      </div>
    </div>
  )
}