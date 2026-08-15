import { Logo } from '@/components/Logo'

export function LoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-ink-950 gap-6">
      <div className="animate-pulse">
        <Logo size="lg" />
      </div>
      <div className="w-8 h-8 border-2 border-ink-700 border-t-zeal-500 rounded-full animate-spin" />
    </div>
  )
}
