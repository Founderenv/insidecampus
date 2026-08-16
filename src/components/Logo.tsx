interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  showTagline?: boolean
}

export function Logo({ size = 'md', showTagline = false }: LogoProps) {
  const sizes = {
    sm: { icon: 'w-7 h-7', text: 'text-lg', sub: 'text-xs' },
    md: { icon: 'w-9 h-9', text: 'text-2xl', sub: 'text-sm' },
    lg: { icon: 'w-12 h-12', text: 'text-3xl', sub: 'text-base' },
  }
  const s = sizes[size]

  return (
    <div className="flex items-center gap-2.5">
      <div className={`${s.icon} relative shrink-0`}>
        <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
          <rect width="64" height="64" rx="16" fill="#0a0b0f" />
          <rect width="64" height="64" rx="16" stroke="#1f2330" strokeWidth="1" />
          <path d="M20 44V20h5v19h12v5H20z" fill="#ffffff" />
          <circle cx="42" cy="38" r="9" fill="#3b82f6" />
          <circle cx="42" cy="38" r="4" fill="#0a0b0f" />
        </svg>
      </div>
      <div className="flex flex-col leading-none">
        <span className={`${s.text} font-display font-bold tracking-tight`}>
          <span className="text-white">inside</span>
          <span className="text-zeal-500">Zeal</span>
        </span>
        {showTagline && (
          <span className={`${s.sub} text-gray-500 mt-0.5 tracking-widest uppercase`}>Connect &bull; Collaborate &bull; Grow</span>
        )}
      </div>
    </div>
  )
}
