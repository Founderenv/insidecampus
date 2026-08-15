interface AvatarProps {
  src?: string | null
  alt: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  ring?: boolean
}

const sizeMap = {
  xs: 'w-7 h-7 text-xs',
  sm: 'w-9 h-9 text-sm',
  md: 'w-11 h-11 text-base',
  lg: 'w-14 h-14 text-lg',
  xl: 'w-20 h-20 text-2xl',
}

export function Avatar({ src, alt, size = 'md', className = '', ring = false }: AvatarProps) {
  const initials = alt
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const ringClass = ring ? 'ring-2 ring-zeal-500/40 ring-offset-2 ring-offset-ink-900' : ''

  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        className={`${sizeMap[size]} ${ringClass} rounded-full object-cover ${className}`}
      />
    )
  }

  return (
    <div
      className={`${sizeMap[size]} ${ringClass} rounded-full bg-ink-700 flex items-center justify-center font-semibold text-gray-300 shrink-0 ${className}`}
    >
      {initials || '?'}
    </div>
  )
}
