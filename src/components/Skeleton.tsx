export function SkeletonCard() {
  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="skeleton w-11 h-11 rounded-full" />
        <div className="space-y-1.5 flex-1">
          <div className="skeleton h-3.5 w-32 rounded" />
          <div className="skeleton h-2.5 w-20 rounded" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="skeleton h-3 w-full rounded" />
        <div className="skeleton h-3 w-4/5 rounded" />
      </div>
    </div>
  )
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}

export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card p-4 space-y-3">
          <div className="skeleton h-24 w-full rounded-xl" />
          <div className="skeleton h-3 w-3/4 rounded" />
          <div className="skeleton h-2.5 w-1/2 rounded" />
        </div>
      ))}
    </div>
  )
}

export function SkeletonProfile() {
  return (
    <div className="space-y-4">
      <div className="card p-6 space-y-4">
        <div className="flex items-start gap-4">
          <div className="skeleton w-20 h-20 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-5 w-32 rounded" />
            <div className="skeleton h-3 w-24 rounded" />
            <div className="skeleton h-3 w-full rounded" />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="skeleton h-9 w-24 rounded-xl" />
          <div className="skeleton h-9 w-24 rounded-xl" />
        </div>
      </div>
    </div>
  )
}
