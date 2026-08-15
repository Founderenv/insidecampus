interface HiddenAvatarProps {
  seed: string
  style?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizeMap = {
  sm: 'w-9 h-9',
  md: 'w-11 h-11',
  lg: 'w-14 h-14',
  xl: 'w-20 h-20',
}

// Deterministic gradient avatar based on seed
export function HiddenAvatar({ seed, style = '1', size = 'md', className = '' }: HiddenAvatarProps) {
  const palettes: Record<string, [string, string, string]> = {
    '1': ['#00e676', '#007a31', '#0a0b0f'],
    '2': ['#3b82f6', '#1e3a5f', '#0a0b0f'],
    '3': ['#f43f5e', '#7f1d1d', '#0a0b0f'],
    '4': ['#f59e0b', '#7c2d12', '#0a0b0f'],
    '5': ['#8b5cf6', '#4c1d95', '#0a0b0f'],
    '6': ['#06b6d4', '#164e63', '#0a0b0f'],
    '7': ['#ec4899', '#831843', '#0a0b0f'],
  }
  const palette = palettes[style] || palettes['1']

  const hash = seed.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const cx = 20 + (hash % 24)
  const cy = 20 + ((hash >> 3) % 24)

  return (
    <div
      className={`${sizeMap[size]} rounded-full shrink-0 relative overflow-hidden ${className}`}
      style={{ background: `linear-gradient(135deg, ${palette[0]}, ${palette[1]})` }}
    >
      <svg viewBox="0 0 64 64" className="w-full h-full">
        <circle cx={cx} cy={cy} r="14" fill={palette[2]} opacity="0.4" />
        <circle cx={32} cy="26" r="10" fill="rgba(255,255,255,0.9)" />
        <path d="M14 52c0-10 8-16 18-16s18 6 18 16" fill="rgba(255,255,255,0.9)" />
      </svg>
    </div>
  )
}
