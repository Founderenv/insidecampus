import { useEffect, useState } from 'react'
import { ShoppingBag, Plus, Bookmark, BookmarkCheck, Tag, Image as ImageIcon, X, MessageCircle } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Avatar } from '@/components/Avatar'
import { SkeletonList } from '@/components/Skeleton'
import { EmptyState, ErrorState } from '@/components/States'
import { Sheet } from '@/components/Sheet'
import { ContactSheet } from '@/components/ContactSheet'
import { fetchMarketplace, createMarketplaceListing, toggleMarketplaceSave, fetchMarketplaceSaveIds, markListingSold, uploadItemImage, validateImageFile } from '@/lib/data'
import { formatNumber } from '@/lib/utils'
import type { MarketplaceListing } from '@/types'

const CATEGORIES = ['All', 'Books', 'Electronics', 'Cycles', 'Calculators', 'Other'] as const
const CONDITIONS = [
  { value: 'like_new', label: 'Like New' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
] as const

function formatPrice(n: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
}

export function Marketplace() {
  const { user } = useAuth()
  const [listings, setListings] = useState<MarketplaceListing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [category, setCategory] = useState<string>('All')
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [sheetOpen, setSheetOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [contactListing, setContactListing] = useState<MarketplaceListing | null>(null)

  const [formTitle, setFormTitle] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formPrice, setFormPrice] = useState('')
  const [formCondition, setFormCondition] = useState('good')
  const [formCategory, setFormCategory] = useState('Other')
  const [formImage, setFormImage] = useState<File | null>(null)
  const [formImagePreview, setFormImagePreview] = useState<string | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)

  const load = async (cat: string) => {
    setLoading(true)
    try {
      const data = await fetchMarketplace(cat === 'All' ? undefined : cat.toLowerCase())
      setListings(data)
      if (user) {
        const ids = await fetchMarketplaceSaveIds(user.id)
        setSavedIds(ids)
      }
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(category) }, [category, user])

  const resetForm = () => {
    setFormTitle('')
    setFormDesc('')
    setFormPrice('')
    setFormCondition('good')
    setFormCategory('Other')
    setFormImage(null)
    if (formImagePreview) URL.revokeObjectURL(formImagePreview)
    setFormImagePreview(null)
    setImageError(null)
  }

  const handleImagePick = () => {
    const inp = document.createElement('input')
    inp.type = 'file'
    inp.accept = 'image/jpeg,image/png,image/webp'
    inp.onchange = (e) => {
      const f = (e.target as HTMLInputElement).files?.[0]
      if (f) {
        const v = validateImageFile(f)
        if (!v.valid) { setImageError(v.error!); return }
        setFormImage(f)
        setFormImagePreview(URL.createObjectURL(f))
        setImageError(null)
      }
    }
    inp.click()
  }

  const handleSubmit = async () => {
    if (!user || !formTitle.trim() || !formDesc.trim() || !formPrice) return
    setSubmitting(true)
    try {
      let imageUrl: string | undefined
      if (formImage) {
        imageUrl = await uploadItemImage(user.id, formImage)
      }
      const listing = await createMarketplaceListing(
        user.id,
        formTitle.trim(),
        formDesc.trim(),
        Number(formPrice),
        formCondition,
        formCategory.toLowerCase(),
        imageUrl,
      )
      setListings(prev => [listing, ...prev])
      resetForm()
      setSheetOpen(false)
    } catch {
      // keep sheet open
    } finally {
      setSubmitting(false)
    }
  }

  const handleSave = async (listingId: string) => {
    if (!user) return
    const wasSaved = savedIds.has(listingId)
    setSavedIds(prev => {
      const next = new Set(prev)
      if (wasSaved) next.delete(listingId)
      else next.add(listingId)
      return next
    })
    setListings(prev => prev.map(l =>
      l.id === listingId ? { ...l, saved_count: l.saved_count + (wasSaved ? -1 : 1) } : l
    ))
    try {
      await toggleMarketplaceSave(listingId, user.id)
    } catch {
      setSavedIds(prev => {
        const next = new Set(prev)
        if (wasSaved) next.add(listingId)
        else next.delete(listingId)
        return next
      })
      setListings(prev => prev.map(l =>
        l.id === listingId ? { ...l, saved_count: l.saved_count + (wasSaved ? 1 : -1) } : l
      ))
    }
  }

  const handleSold = async (listingId: string) => {
    if (!user) return
    setListings(prev => prev.map(l => l.id === listingId ? { ...l, is_sold: true } : l))
    try {
      await markListingSold(listingId, user.id)
    } catch {
      setListings(prev => prev.map(l => l.id === listingId ? { ...l, is_sold: false } : l))
    }
  }

  const filtered = category === 'All'
    ? listings
    : listings.filter(l => l.category?.toLowerCase() === category.toLowerCase())

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Marketplace</h1>
          <p className="text-gray-500 text-sm mt-0.5">Buy and sell within your campus</p>
        </div>
        {user && (
          <button
            onClick={() => setSheetOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zeal-500 text-white text-sm font-medium hover:bg-zeal-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Sell
          </button>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 lg:mx-0 lg:px-0">
        {CATEGORIES.map(c => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              category === c
                ? 'bg-zeal-500 text-white'
                : 'bg-ink-800 text-gray-400 border border-ink-700 hover:text-white'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {loading ? (
        <SkeletonList count={4} />
      ) : error ? (
        <ErrorState onRetry={() => load(category)} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag className="w-7 h-7" />}
          title="No listings found"
          description={category !== 'All' ? 'Try a different category.' : 'Be the first to list something for sale.'}
          action={user ? (
            <button onClick={() => setSheetOpen(true)} className="btn-primary text-sm">
              Create Listing
            </button>
          ) : undefined}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map(listing => {
            const isSaved = savedIds.has(listing.id)
            const isOwner = user?.id === listing.seller_id
            return (
              <div key={listing.id} className="card p-4 space-y-3">
                <div className="flex items-start gap-3">
                  {listing.image_url ? (
                    <img src={listing.image_url} alt={listing.title} className="w-16 h-16 rounded-xl object-cover shrink-0" />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-ink-800 border border-ink-700 flex items-center justify-center shrink-0">
                      <Tag className="w-6 h-6 text-gray-600" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-white font-semibold truncate">{listing.title}</h3>
                      {listing.is_sold && (
                        <span className="shrink-0 px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 text-xs font-medium">
                          Sold
                        </span>
                      )}
                    </div>
                    <p className="text-zeal-400 font-bold text-sm mt-0.5">{formatPrice(listing.price)}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-xs text-gray-500 capitalize">{listing.condition?.replace('_', ' ')}</span>
                      {listing.category && (
                        <span className="px-2 py-0.5 rounded-full bg-ink-800 text-gray-400 text-xs border border-ink-700 capitalize">
                          {listing.category}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {listing.description && (
                  <p className="text-gray-400 text-sm line-clamp-2">{listing.description}</p>
                )}

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <Avatar src={listing.seller?.avatar_url} alt={listing.seller?.full_name || 'S'} size="xs" />
                    <span className="text-xs text-gray-500">{listing.seller?.full_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {user && !isOwner && !listing.is_sold && (
                      <button
                        onClick={() => setContactListing(listing)}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-zeal-500 text-white text-xs font-medium hover:bg-zeal-600 transition-colors"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        Contact Seller
                      </button>
                    )}
                    {user && !isOwner && (
                      <button
                        onClick={() => handleSave(listing.id)}
                        className="p-1.5 rounded-lg bg-ink-800 text-gray-400 hover:text-white transition-colors"
                      >
                        {isSaved ? <BookmarkCheck className="w-4 h-4 text-zeal-500" /> : <Bookmark className="w-4 h-4" />}
                      </button>
                    )}
                    {user && isOwner && !listing.is_sold && (
                      <button
                        onClick={() => handleSold(listing.id)}
                        className="px-3 py-1.5 rounded-xl bg-ink-800 border border-ink-700 text-gray-300 text-xs font-medium hover:text-white transition-colors"
                      >
                        Mark as Sold
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Sheet open={sheetOpen} onClose={() => { setSheetOpen(false); resetForm() }} title="New Listing">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Photo (optional)</label>
            {formImagePreview ? (
              <div className="relative">
                <img src={formImagePreview} alt="Preview" className="w-full h-40 object-cover rounded-xl" />
                <button
                  onClick={() => { setFormImage(null); URL.revokeObjectURL(formImagePreview); setFormImagePreview(null) }}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleImagePick}
                className="w-full py-6 rounded-xl border-2 border-dashed border-ink-600 hover:border-ink-500 flex flex-col items-center gap-2 transition-colors"
              >
                <ImageIcon className="w-6 h-6 text-gray-500" />
                <span className="text-xs text-gray-500">Add a photo of the item</span>
              </button>
            )}
            {imageError && <p className="text-xs text-rose-400 mt-1">{imageError}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Title</label>
            <input
              value={formTitle}
              onChange={e => setFormTitle(e.target.value)}
              placeholder="Item name"
              className="w-full px-3 py-2.5 rounded-xl bg-ink-800 border border-ink-700 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-zeal-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Description</label>
            <textarea
              value={formDesc}
              onChange={e => setFormDesc(e.target.value)}
              placeholder="Describe the item"
              rows={3}
              className="w-full px-3 py-2.5 rounded-xl bg-ink-800 border border-ink-700 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-zeal-500 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Price (₹)</label>
            <input
              type="number"
              value={formPrice}
              onChange={e => setFormPrice(e.target.value)}
              placeholder="0"
              min="0"
              className="w-full px-3 py-2.5 rounded-xl bg-ink-800 border border-ink-700 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-zeal-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Condition</label>
            <div className="flex gap-2">
              {CONDITIONS.map(c => (
                <button
                  key={c.value}
                  onClick={() => setFormCondition(c.value)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                    formCondition === c.value
                      ? 'bg-zeal-500 text-white'
                      : 'bg-ink-800 border border-ink-700 text-gray-400'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Category</label>
            <select
              value={formCategory}
              onChange={e => setFormCategory(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-ink-800 border border-ink-700 text-white text-sm focus:outline-none focus:border-zeal-500"
            >
              {CATEGORIES.filter(c => c !== 'All').map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleSubmit}
            disabled={!formTitle.trim() || !formDesc.trim() || !formPrice || submitting}
            className="w-full py-2.5 rounded-xl bg-zeal-500 text-white font-medium text-sm hover:bg-zeal-600 transition-colors disabled:opacity-50"
          >
            {submitting ? 'Creating...' : 'Create Listing'}
          </button>
        </div>
      </Sheet>

      <ContactSheet
        open={!!contactListing}
        onClose={() => setContactListing(null)}
        title="Contact Seller"
        ownerId={contactListing?.seller_id || ''}
        ownerName={contactListing?.seller?.full_name || 'Seller'}
        ownerAvatar={contactListing?.seller?.avatar_url || null}
        itemName={contactListing?.title || ''}
        whatsAppMessage={`Hi, I found your ${contactListing?.title || ''} listing on InsideZeal. Is it still available?`}
        requestType="marketplace"
        referenceId={contactListing?.id}
      />
    </div>
  )
}
