import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Search, Plus, Star, MapPin, Clock, Phone, MessageCircle, X, Image as ImageIcon,
  ChevronRight, ArrowLeft, ExternalLink, Wifi, Home, BedDouble, Utensils,
  Store, MoreHorizontal, Heart, CheckCircle2, CircleDot, Navigation,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Avatar } from '@/components/Avatar'
import { SkeletonList } from '@/components/Skeleton'
import { EmptyState, ErrorState } from '@/components/States'
import { Sheet } from '@/components/Sheet'
import { ContactSheet } from '@/components/ContactSheet'
import {
  fetchNearbyPlaces, fetchNearbyPlaceById, createNearbyPlace, deleteNearbyPlace,
  fetchNearbyReviews, fetchNearbyReviewStats, createNearbyReview, deleteNearbyReview,
  fetchHousingListings, fetchHousingListingById, createHousingListing,
  updateHousingListingAvailability, toggleHousingInterest, fetchHousingInterestIds,
  addHousingListingImage, uploadItemImage, validateImageFile,
} from '@/lib/data'
import { timeAgo } from '@/lib/utils'
import type { NearbyPlace, NearbyReview, HousingListing } from '@/types'

const PLACE_CATEGORIES = ['All', 'Mess', 'Hostel', 'PG', 'Tiffin', 'Cafe', 'Other'] as const
const HOUSING_TYPES = ['All', 'Room', 'Flat', 'PG Available', 'Roommate'] as const

function StarRating({ rating, size = 'sm', onRate }: { rating: number; size?: 'sm' | 'md'; onRate?: (r: number) => void }) {
  const px = size === 'sm' ? 'w-3.5 h-3.5' : 'w-5 h-5'
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <button key={s} onClick={() => onRate?.(s)} disabled={!onRate} className={onRate ? 'cursor-pointer' : 'cursor-default'}>
          <Star className={`${px} ${s <= rating ? 'text-amber-400 fill-amber-400' : 'text-gray-600'}`} />
        </button>
      ))}
    </div>
  )
}

function normalizeWhatsAppNumber(num: string): string {
  const digits = num.replace(/\D/g, '')
  if (digits.length === 10) return `91${digits}`
  if (digits.length === 12 && digits.startsWith('91')) return digits
  return digits
}

function formatPrice(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
}

/* ================================================================ */
/*  PLACE DETAIL                                                     */
/* ================================================================ */

function PlaceDetailPage({ placeId, user }: { placeId: string; user: any }) {
  const navigate = useNavigate()
  const [place, setPlace] = useState<NearbyPlace | null>(null)
  const [reviews, setReviews] = useState<NearbyReview[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showReview, setShowReview] = useState(false)
  const [myRating, setMyRating] = useState(0)
  const [myReview, setMyReview] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submittingDel, setSubmittingDel] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchNearbyPlaceById(placeId), fetchNearbyReviews(placeId), fetchNearbyReviewStats(placeId)])
      .then(([p, r, s]) => { setPlace(p); setReviews(r); setStats(s) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [placeId])

  const handleSubmitReview = async () => {
    if (!user || myRating === 0) return
    setSubmitting(true)
    try {
      const r = await createNearbyReview(user.id, placeId, myRating, myReview.trim() || undefined)
      setReviews(prev => [r, ...prev])
      const s = await fetchNearbyReviewStats(placeId)
      setStats(s)
      setShowReview(false); setMyRating(0); setMyReview('')
    } catch {} finally { setSubmitting(false) }
  }

  const handleDeleteReview = async (reviewId: string) => {
    if (!user) return
    setSubmittingDel(reviewId)
    try {
      await deleteNearbyReview(reviewId, user.id)
      setReviews(prev => prev.filter(r => r.id !== reviewId))
      const s = await fetchNearbyReviewStats(placeId)
      setStats(s)
    } catch {} finally { setSubmittingDel(null) }
  }

  if (loading) return <SkeletonList count={3} />
  if (!place) return <div className="text-center py-12"><p className="text-gray-500">Place not found.</p></div>

  const myExisting = user ? reviews.find(r => r.user_id === user.id) : null
  const isMessOrTiffin = ['Mess', 'Tiffin', 'Cafe'].includes(place.category)

  return (
    <div className="space-y-4 pb-8">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-white p-1"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-lg font-semibold text-white truncate flex-1">{place.name}</h1>
        {place.created_by === user?.id && (
          <button onClick={async () => { if (confirm('Delete this place?')) { await deleteNearbyPlace(placeId, user.id); navigate(-1) } }}
            className="text-xs text-rose-400 hover:text-rose-300">Delete</button>
        )}
      </div>

      {place.cover_image_url && <img src={place.cover_image_url} alt={place.name} className="w-full h-48 object-cover rounded-2xl" loading="lazy" />}

      <div className="card p-4 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2 py-0.5 rounded-full bg-zeal-500/15 text-zeal-400 text-xs font-medium">{place.category}</span>
          {stats && (
            <span className="flex items-center gap-1 text-sm text-amber-400 font-medium">
              <Star className="w-3.5 h-3.5 fill-amber-400" /> {stats.avg_rating} <span className="text-gray-500 font-normal">({stats.count})</span>
            </span>
          )}
        </div>
        {place.description && <p className="text-gray-300 text-sm leading-relaxed">{place.description}</p>}
        <div className="space-y-2 text-sm">
          {place.location_text && <div className="flex items-center gap-2 text-gray-400"><MapPin className="w-3.5 h-3.5" /> {place.location_text}</div>}
          {place.price_range && <div className="flex items-center gap-2 text-gray-400"><Store className="w-3.5 h-3.5" /> {place.price_range}</div>}
          {place.maps_url && (
            <a href={place.maps_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-zeal-400 hover:text-zeal-300">
              <Navigation className="w-3.5 h-3.5" /> View on Maps
            </a>
          )}
        </div>
      </div>

      {/* Rating Breakdown */}
      {stats && stats.count > 0 && (
        <div className="card p-4 space-y-2">
          <h3 className="text-sm font-semibold text-white">Rating Breakdown</h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
            {isMessOrTiffin ? (
              <>
                {stats.avg_food != null && <div className="flex justify-between"><span className="text-gray-400">Food Quality</span><span className="text-white">{stats.avg_food}</span></div>}
                {stats.avg_hygiene != null && <div className="flex justify-between"><span className="text-gray-400">Hygiene</span><span className="text-white">{stats.avg_hygiene}</span></div>}
                {stats.avg_price != null && <div className="flex justify-between"><span className="text-gray-400">Price</span><span className="text-white">{stats.avg_price}</span></div>}
                {stats.avg_quantity != null && <div className="flex justify-between"><span className="text-gray-400">Quantity</span><span className="text-white">{stats.avg_quantity}</span></div>}
              </>
            ) : (
              <>
                {stats.avg_cleanliness != null && <div className="flex justify-between"><span className="text-gray-400">Cleanliness</span><span className="text-white">{stats.avg_cleanliness}</span></div>}
                {stats.avg_safety != null && <div className="flex justify-between"><span className="text-gray-400">Safety</span><span className="text-white">{stats.avg_safety}</span></div>}
                {stats.avg_location != null && <div className="flex justify-between"><span className="text-gray-400">Location</span><span className="text-white">{stats.avg_location}</span></div>}
                {stats.avg_value != null && <div className="flex justify-between"><span className="text-gray-400">Value</span><span className="text-white">{stats.avg_value}</span></div>}
              </>
            )}
          </div>
        </div>
      )}

      {/* Reviews */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Reviews · {reviews.length}</h3>
          {user && !myExisting && (
            <button onClick={() => setShowReview(true)} className="flex items-center gap-1 text-xs text-zeal-400 hover:text-zeal-300">
              <Plus className="w-3.5 h-3.5" /> Add Review
            </button>
          )}
        </div>
        {reviews.length === 0 ? (
          <p className="text-xs text-gray-500">No reviews yet. Be the first to review!</p>
        ) : (
          reviews.map(r => (
            <div key={r.id} className="card p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Avatar src={r.user?.avatar_url || null} alt={r.user?.full_name || ''} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{r.user?.full_name || 'Student'}</p>
                  <p className="text-[10px] text-gray-500">{timeAgo(r.created_at)}</p>
                </div>
                <StarRating rating={r.rating} />
              </div>
              {r.review && <p className="text-xs text-gray-300">{r.review}</p>}
              {user && r.user_id === user.id && (
                <button onClick={() => handleDeleteReview(r.id)} disabled={submittingDel === r.id} className="text-[10px] text-rose-400 hover:text-rose-300">
                  {submittingDel === r.id ? '...' : 'Delete'}
                </button>
              )}
            </div>
          ))
        )}
      </div>

      <Sheet open={showReview} onClose={() => setShowReview(false)} title="Write Review">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Your Rating *</label>
            <StarRating rating={myRating} size="md" onRate={setMyRating} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Review (optional)</label>
            <textarea value={myReview} onChange={e => setMyReview(e.target.value)} placeholder="Share your experience..." rows={3}
              className="w-full px-3 py-2.5 rounded-xl bg-ink-800 border border-ink-700 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-zeal-500 resize-none" />
          </div>
          <button onClick={handleSubmitReview} disabled={myRating === 0 || submitting}
            className="w-full py-2.5 rounded-xl bg-zeal-500 text-white font-medium text-sm hover:bg-zeal-600 transition-colors disabled:opacity-50">
            {submitting ? 'Submitting...' : 'Submit Review'}
          </button>
        </div>
      </Sheet>
    </div>
  )
}

/* ================================================================ */
/*  HOUSING DETAIL                                                    */
/* ================================================================ */

function HousingDetailPage({ listingId, user }: { listingId: string; user: any }) {
  const navigate = useNavigate()
  const [listing, setListing] = useState<HousingListing | null>(null)
  const [loading, setLoading] = useState(true)
  const [interested, setInterested] = useState(false)
  const [showContact, setShowContact] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [activeImg, setActiveImg] = useState(0)

  useEffect(() => {
    setLoading(true)
    fetchHousingListingById(listingId).then(l => {
      setListing(l)
      if (user && l) {
        fetchHousingInterestIds(user.id).then(ids => setInterested(ids.has(listingId))).catch(() => {})
      }
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [listingId, user])

  const handleInterested = async () => {
    if (!user || toggling) return
    setToggling(true)
    try {
      const result = await toggleHousingInterest(listingId, user.id)
      setInterested(result)
      if (result) setShowContact(true)
    } catch {} finally { setToggling(false) }
  }

  if (loading) return <SkeletonList count={3} />
  if (!listing) return <div className="text-center py-12"><p className="text-gray-500">Listing not found.</p></div>

  const isOwner = user?.id === listing.owner_id
  const available = listing.availability_status === 'available'
  const images = listing.images || []

  const typeLabel: Record<string, string> = { room: 'Room', flat: 'Flat', pg: 'PG Available', roommate: 'Looking for Roommate' }

  return (
    <div className="space-y-4 pb-8">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-white p-1"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-lg font-semibold text-white truncate flex-1">{listing.title}</h1>
        {isOwner && (
          <button onClick={async () => { const newStatus = available ? 'not_available' : 'available'; await updateHousingListingAvailability(listingId, user.id, newStatus); setListing(prev => prev ? { ...prev, availability_status: newStatus } : prev) }}
            className={`px-3 py-1 rounded-xl text-xs font-medium ${available ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}`}>
            {available ? 'Available' : 'Not Available'}
          </button>
        )}
      </div>

      {/* Availability Badge */}
      {!isOwner && (
        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${available ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}`}>
          {available ? <CheckCircle2 className="w-3 h-3" /> : <CircleDot className="w-3 h-3" />}
          {available ? 'Available' : 'Not Available'}
        </div>
      )}

      {/* Images */}
      {images.length > 0 ? (
        <div className="space-y-2">
          <img src={images[activeImg]?.image_url} alt={listing.title} className="w-full h-56 object-cover rounded-2xl" />
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((img, i) => (
                <button key={img.id} onClick={() => setActiveImg(i)}
                  className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 ${i === activeImg ? 'border-zeal-500' : 'border-transparent'}`}>
                  <img src={img.image_url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="w-full h-40 bg-gradient-to-br from-zeal-500/20 to-ink-800 rounded-2xl flex items-center justify-center">
          <Home className="w-10 h-10 text-zeal-500/40" />
        </div>
      )}

      {/* Info */}
      <div className="card p-4 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2 py-0.5 rounded-full bg-zeal-500/15 text-zeal-400 text-xs font-medium">{typeLabel[listing.listing_type] || listing.listing_type}</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${available ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}`}>
            {available ? 'Available' : 'Not Available'}
          </span>
        </div>
        {listing.description && <p className="text-gray-300 text-sm">{listing.description}</p>}
        <div className="grid grid-cols-2 gap-3 text-sm">
          {listing.rent != null && <div><p className="text-gray-500 text-xs">Monthly Rent</p><p className="text-white font-semibold">{formatPrice(listing.rent)}</p></div>}
          {listing.deposit != null && <div><p className="text-gray-500 text-xs">Deposit</p><p className="text-white font-semibold">{formatPrice(listing.deposit)}</p></div>}
          {listing.sharing_type && <div><p className="text-gray-500 text-xs">Sharing</p><p className="text-white font-semibold">{listing.sharing_type}</p></div>}
          {listing.location_text && <div className="col-span-2"><p className="text-gray-500 text-xs">Location</p><p className="text-white font-semibold">{listing.location_text}</p></div>}
        </div>
        {listing.maps_url && (
          <a href={listing.maps_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-zeal-400 text-sm hover:text-zeal-300">
            <Navigation className="w-3.5 h-3.5" /> View on Maps
          </a>
        )}
        <div className="flex items-center gap-3 pt-2 border-t border-ink-700 text-xs text-gray-500">
          {listing.owner && <span>Posted by {listing.owner.full_name}</span>}
          <span>{timeAgo(listing.created_at)}</span>
        </div>
      </div>

      {/* Interested / Contact */}
      {user && !isOwner && available && (
        <button onClick={handleInterested} disabled={toggling}
          className={`w-full py-3 rounded-2xl font-semibold text-sm transition-all ${interested ? 'bg-ink-800 border border-ink-700 text-gray-300' : 'bg-zeal-500 text-white hover:bg-zeal-600'} disabled:opacity-50`}>
          {toggling ? '...' : interested ? 'Interested ✓' : 'Interested'}
        </button>
      )}
      {user && !isOwner && available && interested && listing.whatsapp_number && (
        <button onClick={() => setShowContact(true)}
          className="w-full py-3 rounded-2xl font-semibold text-sm bg-ink-800 border border-zeal-500/40 text-zeal-400 hover:bg-ink-700 transition-all">
          Contact Host
        </button>
      )}

      {/* Contact sheet */}
      <ContactSheet
        open={showContact}
        onClose={() => setShowContact(false)}
        title={listing.title}
        ownerId={listing.owner_id}
        ownerName={listing.owner?.full_name || 'Host'}
        ownerAvatar={listing.owner?.avatar_url}
        phone={listing.whatsapp_number || listing.phone_number || null}
        itemName={listing.title}
        whatsAppMessage={`Hi, I'm interested in your ${listing.title} listing on InsideZeal. Is it still available?`}
        requestType="housing"
        referenceId={listing.id}
      />

      {/* Owner: edit controls */}
      {isOwner && (
        <div className="card p-4 space-y-3">
          <h3 className="text-sm font-semibold text-white">Your Listing</h3>
          <p className="text-xs text-gray-400">Tap the availability badge above to toggle Available / Not Available.</p>
        </div>
      )}
    </div>
  )
}

/* ================================================================ */
/*  NEARBY LIST (main page)                                          */
/* ================================================================ */

export function Nearby() {
  const { id: urlPlaceId, lid: urlListingId } = useParams<{ id: string; lid: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [view, setView] = useState<'places' | 'housing'>('places')
  const [search, setSearch] = useState('')
  const [placesCategory, setPlacesCategory] = useState('All')
  const [housingType, setHousingType] = useState('All')
  const [places, setPlaces] = useState<(NearbyPlace & { review_count?: number; avg_rating?: number })[]>([])
  const [listings, setListings] = useState<HousingListing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [showCreatePlace, setShowCreatePlace] = useState(false)
  const [showCreateListing, setShowCreateListing] = useState(false)

  // Create place form
  const [pName, setPName] = useState('')
  const [pCategory, setPCategory] = useState('Mess')
  const [pDesc, setPDesc] = useState('')
  const [pLocation, setPLocation] = useState('')
  const [pMaps, setPMaps] = useState('')
  const [pPrice, setPPrice] = useState('')
  const [pImage, setPImage] = useState<File | null>(null)
  const [pImagePreview, setPImagePreview] = useState<string | null>(null)
  const [pImgErr, setPImgErr] = useState<string | null>(null)
  const [creatingPlace, setCreatingPlace] = useState(false)

  // Create listing form
  const [lType, setLType] = useState('room')
  const [lTitle, setLTitle] = useState('')
  const [lDesc, setLDesc] = useState('')
  const [lRent, setLRent] = useState('')
  const [lDeposit, setLDeposit] = useState('')
  const [lSharing, setLSharing] = useState('')
  const [lLocation, setLLocation] = useState('')
  const [lMaps, setLMaps] = useState('')
  const [lWhatsapp, setLWhatsapp] = useState('')
  const [lPhone, setLPhone] = useState('')
  const [lImages, setLImages] = useState<File[]>([])
  const [lImagePreviews, setLImagePreviews] = useState<string[]>([])
  const [lImgErr, setLImgErr] = useState<string | null>(null)
  const [creatingListing, setCreatingListing] = useState(false)

  // Detail routing
  if (urlPlaceId) return <PlaceDetailPage placeId={urlPlaceId} user={user} />
  if (urlListingId) return <HousingDetailPage listingId={urlListingId} user={user} />

  const loadPlaces = useCallback(async () => {
    setLoading(true); setError(false)
    try { setPlaces(await fetchNearbyPlaces(placesCategory, search || undefined)) }
    catch { setError(true) } finally { setLoading(false) }
  }, [placesCategory, search])

  const loadListings = useCallback(async () => {
    setLoading(true); setError(false)
    try { setListings(await fetchHousingListings(housingType === 'All' ? undefined : housingType)) }
    catch { setError(true) } finally { setLoading(false) }
  }, [housingType])

  useEffect(() => { if (view === 'places') loadPlaces() }, [view, loadPlaces])
  useEffect(() => { if (view === 'housing') loadListings() }, [view, loadListings])

  const resetPlaceForm = () => { setPName(''); setPCategory('Mess'); setPDesc(''); setPLocation(''); setPMaps(''); setPPrice(''); setPImage(null); if (pImagePreview) URL.revokeObjectURL(pImagePreview); setPImagePreview(null); setPImgErr(null) }
  const resetListingForm = () => { setLType('room'); setLTitle(''); setLDesc(''); setLRent(''); setLDeposit(''); setLSharing(''); setLLocation(''); setLMaps(''); setLWhatsapp(''); setLPhone(''); lImagePreviews.forEach(u => URL.revokeObjectURL(u)); setLImages([]); setLImagePreviews([]); setLImgErr(null) }

  const handleCreatePlace = async () => {
    if (!user || !pName.trim()) return
    setCreatingPlace(true)
    try {
      let coverUrl: string | undefined
      if (pImage) coverUrl = await uploadItemImage(user.id, pImage)
      const p = await createNearbyPlace(user.id, pName.trim(), pCategory, pDesc.trim() || undefined, pLocation.trim() || undefined, pMaps.trim() || undefined, pPrice.trim() || undefined, coverUrl)
      setPlaces(prev => [{ ...p, review_count: 0, avg_rating: 0 }, ...prev])
      resetPlaceForm(); setShowCreatePlace(false)
    } catch {} finally { setCreatingPlace(false) }
  }

  const handleCreateListing = async () => {
    if (!user || !lTitle.trim()) return
    setCreatingListing(true)
    try {
      const l = await createHousingListing(user.id, lType, lTitle.trim(), lDesc.trim() || undefined, lRent ? parseFloat(lRent) : undefined, lDeposit ? parseFloat(lDeposit) : undefined, lSharing.trim() || undefined, lLocation.trim() || undefined, lMaps.trim() || undefined, lWhatsapp.trim() || undefined, lPhone.trim() || undefined)
      for (let i = 0; i < lImages.length; i++) {
        const url = await uploadItemImage(user.id, lImages[i])
        await addHousingListingImage(l.id, url, i)
      }
      setListings(prev => [l, ...prev])
      resetListingForm(); setShowCreateListing(false)
    } catch {} finally { setCreatingListing(false) }
  }

  const handleListingImgPick = () => {
    const inp = document.createElement('input')
    inp.type = 'file'; inp.accept = 'image/jpeg,image/png,image/webp'; inp.multiple = true
    inp.onchange = (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || [])
      for (const f of files) {
        const v = validateImageFile(f)
        if (!v.valid) { setLImgErr(v.error!); return }
      }
      setLImages(prev => [...prev, ...files])
      setLImagePreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))])
      setLImgErr(null)
    }
    inp.click()
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold text-white">Nearby</h1>
        {user && (
          <button onClick={() => view === 'places' ? setShowCreatePlace(true) : setShowCreateListing(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zeal-500 text-white text-sm font-medium hover:bg-zeal-600 transition-colors">
            <Plus className="w-4 h-4" /> Add
          </button>
        )}
      </div>

      {/* View Toggle */}
      <div className="flex gap-1 border-b border-ink-800">
        <button onClick={() => setView('places')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${view === 'places' ? 'border-zeal-500 text-zeal-500' : 'border-transparent text-gray-500 hover:text-white'}`}>
          Reviews
        </button>
        <button onClick={() => setView('housing')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${view === 'housing' ? 'border-zeal-500 text-zeal-500' : 'border-transparent text-gray-500 hover:text-white'}`}>
          Housing
        </button>
      </div>

      {/* Search */}
      {view === 'places' && (
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input className="input pl-10 pr-10 text-sm" placeholder="Search mess, hostel, rooms, flats..."
            value={search} onChange={e => setSearch(e.target.value)} />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3.5 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-gray-500 hover:text-white" />
            </button>
          )}
        </div>
      )}

      {/* Category Chips */}
      {view === 'places' ? (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 lg:mx-0 lg:px-0">
          {PLACE_CATEGORIES.map(c => (
            <button key={c} onClick={() => setPlacesCategory(c)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${placesCategory === c ? 'bg-zeal-500 text-white' : 'bg-ink-800 text-gray-400 border border-ink-700 hover:text-white'}`}>
              {c}
            </button>
          ))}
        </div>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 lg:mx-0 lg:px-0">
          {HOUSING_TYPES.map(t => (
            <button key={t} onClick={() => setHousingType(t)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${housingType === t ? 'bg-zeal-500 text-white' : 'bg-ink-800 text-gray-400 border border-ink-700 hover:text-white'}`}>
              {t}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {loading ? <SkeletonList count={4} /> : error ? <ErrorState onRetry={() => view === 'places' ? loadPlaces() : loadListings()} /> : view === 'places' ? (
        places.length === 0 ? (
          <EmptyState icon={<Store className="w-7 h-7" />} title="No places yet" description="Be the first to recommend a place near campus."
            action={user ? <button onClick={() => setShowCreatePlace(true)} className="btn-primary text-sm">Add Place</button> : undefined} />
        ) : (
          <div className="space-y-3">
            {places.map(p => (
              <button key={p.id} onClick={() => navigate(`/nearby/${p.id}`)}
                className="w-full text-left card overflow-hidden hover:bg-ink-800 transition-colors">
                {p.cover_image_url ? (
                  <img src={p.cover_image_url} alt={p.name} className="w-full h-32 object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-20 bg-gradient-to-br from-zeal-500/20 to-ink-800 flex items-center justify-center">
                    <Store className="w-8 h-8 text-zeal-500/40" />
                  </div>
                )}
                <div className="p-3 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-white text-sm truncate">{p.name}</h3>
                    {p.avg_rating != null && p.avg_rating > 0 && (
                      <span className="shrink-0 flex items-center gap-1 text-xs text-amber-400">
                        <Star className="w-3 h-3 fill-amber-400" /> {p.avg_rating}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="px-2 py-0.5 rounded-full bg-zeal-500/15 text-zeal-400">{p.category}</span>
                    {p.review_count != null && <span className="text-gray-500">{p.review_count} reviews</span>}
                  </div>
                  {p.location_text && <p className="flex items-center gap-1 text-xs text-gray-400"><MapPin className="w-3 h-3" /> {p.location_text}</p>}
                  {p.price_range && <p className="text-xs text-gray-500">{p.price_range}</p>}
                </div>
              </button>
            ))}
          </div>
        )
      ) : (
        listings.length === 0 ? (
          <EmptyState icon={<Home className="w-7 h-7" />} title="No listings yet" description="Be the first to post a housing listing."
            action={user ? <button onClick={() => setShowCreateListing(true)} className="btn-primary text-sm">Post Listing</button> : undefined} />
        ) : (
          <div className="space-y-3">
            {listings.map(l => (
              <button key={l.id} onClick={() => navigate(`/nearby/l/${l.id}`)}
                className="w-full text-left card overflow-hidden hover:bg-ink-800 transition-colors">
                <div className="p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-white text-sm truncate">{l.title}</h3>
                    <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium ${l.availability_status === 'available' ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}`}>
                      {l.availability_status === 'available' ? 'Available' : 'Not Available'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="px-2 py-0.5 rounded-full bg-ink-700 text-gray-300 capitalize">{l.listing_type}</span>
                    {l.rent != null && <span className="text-zeal-400 font-semibold">{formatPrice(l.rent)}/mo</span>}
                  </div>
                  {l.location_text && <p className="flex items-center gap-1 text-xs text-gray-400"><MapPin className="w-3 h-3" /> {l.location_text}</p>}
                  {l.description && <p className="text-xs text-gray-400 line-clamp-2">{l.description}</p>}
                </div>
              </button>
            ))}
          </div>
        )
      )}

      {/* Create Place Sheet */}
      <Sheet open={showCreatePlace} onClose={() => { setShowCreatePlace(false); resetPlaceForm() }} title="Add Place">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Cover Photo</label>
            {pImagePreview ? (
              <div className="relative">
                <img src={pImagePreview} alt="Preview" className="w-full h-32 object-cover rounded-xl" />
                <button onClick={() => { setPImage(null); URL.revokeObjectURL(pImagePreview); setPImagePreview(null) }}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center text-white"><X className="w-4 h-4" /></button>
              </div>
            ) : (
              <button onClick={() => { const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/jpeg,image/png,image/webp'; i.onchange = (e) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) { const v = validateImageFile(f); if (!v.valid) { setPImgErr(v.error!); return } setPImage(f); setPImagePreview(URL.createObjectURL(f)); setPImgErr(null) } }; i.click() }}
                className="w-full py-6 rounded-xl border-2 border-dashed border-ink-600 hover:border-ink-500 flex flex-col items-center gap-2 transition-colors">
                <ImageIcon className="w-6 h-6 text-gray-500" />
                <span className="text-xs text-gray-500">Add cover photo</span>
              </button>
            )}
            {pImgErr && <p className="text-xs text-rose-400 mt-1">{pImgErr}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Place Name *</label>
            <input value={pName} onChange={e => setPName(e.target.value)} placeholder="e.g. Sagar Mess"
              className="w-full px-3 py-2.5 rounded-xl bg-ink-800 border border-ink-700 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-zeal-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Category</label>
            <select value={pCategory} onChange={e => setPCategory(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-ink-800 border border-ink-700 text-white text-sm focus:outline-none focus:border-zeal-500">
              {PLACE_CATEGORIES.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Description</label>
            <textarea value={pDesc} onChange={e => setPDesc(e.target.value)} placeholder="How is this place?" rows={3}
              className="w-full px-3 py-2.5 rounded-xl bg-ink-800 border border-ink-700 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-zeal-500 resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Location</label>
            <input value={pLocation} onChange={e => setPLocation(e.target.value)} placeholder="e.g. Narhe, near college gate"
              className="w-full px-3 py-2.5 rounded-xl bg-ink-800 border border-ink-700 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-zeal-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Google Maps URL (optional)</label>
            <input value={pMaps} onChange={e => setPMaps(e.target.value)} placeholder="https://maps.google.com/..."
              className="w-full px-3 py-2.5 rounded-xl bg-ink-800 border border-ink-700 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-zeal-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Price Range</label>
            <input value={pPrice} onChange={e => setPPrice(e.target.value)} placeholder="e.g. ₹30-50 per meal"
              className="w-full px-3 py-2.5 rounded-xl bg-ink-800 border border-ink-700 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-zeal-500" />
          </div>
          <button onClick={handleCreatePlace} disabled={!pName.trim() || creatingPlace}
            className="w-full py-2.5 rounded-xl bg-zeal-500 text-white font-medium text-sm hover:bg-zeal-600 transition-colors disabled:opacity-50">
            {creatingPlace ? 'Creating...' : 'Add Place'}
          </button>
        </div>
      </Sheet>

      {/* Create Listing Sheet */}
      <Sheet open={showCreateListing} onClose={() => { setShowCreateListing(false); resetListingForm() }} title="Post Listing">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Type *</label>
            <select value={lType} onChange={e => setLType(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-ink-800 border border-ink-700 text-white text-sm focus:outline-none focus:border-zeal-500">
              <option value="room">Room</option>
              <option value="flat">Flat</option>
              <option value="pg">PG Available</option>
              <option value="roommate">Looking for Roommate</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Title *</label>
            <input value={lTitle} onChange={e => setLTitle(e.target.value)} placeholder="e.g. 2BHK Flat near Narhe"
              className="w-full px-3 py-2.5 rounded-xl bg-ink-800 border border-ink-700 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-zeal-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Description</label>
            <textarea value={lDesc} onChange={e => setLDesc(e.target.value)} placeholder="Describe the space..." rows={3}
              className="w-full px-3 py-2.5 rounded-xl bg-ink-800 border border-ink-700 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-zeal-500 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Monthly Rent (₹)</label>
              <input type="number" value={lRent} onChange={e => setLRent(e.target.value)} placeholder="e.g. 5000"
                className="w-full px-3 py-2.5 rounded-xl bg-ink-800 border border-ink-700 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-zeal-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Deposit (₹)</label>
              <input type="number" value={lDeposit} onChange={e => setLDeposit(e.target.value)} placeholder="e.g. 10000"
                className="w-full px-3 py-2.5 rounded-xl bg-ink-800 border border-ink-700 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-zeal-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Sharing / Occupants</label>
            <input value={lSharing} onChange={e => setLSharing(e.target.value)} placeholder="e.g. Single, Double sharing"
              className="w-full px-3 py-2.5 rounded-xl bg-ink-800 border border-ink-700 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-zeal-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Location</label>
            <input value={lLocation} onChange={e => setLLocation(e.target.value)} placeholder="e.g. Narhe, Ambegaon"
              className="w-full px-3 py-2.5 rounded-xl bg-ink-800 border border-ink-700 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-zeal-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Google Maps URL (optional)</label>
            <input value={lMaps} onChange={e => setLMaps(e.target.value)} placeholder="https://maps.google.com/..."
              className="w-full px-3 py-2.5 rounded-xl bg-ink-800 border border-ink-700 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-zeal-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">WhatsApp Number</label>
              <input value={lWhatsapp} onChange={e => setLWhatsapp(e.target.value)} placeholder="+91..."
                className="w-full px-3 py-2.5 rounded-xl bg-ink-800 border border-ink-700 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-zeal-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Phone Number</label>
              <input value={lPhone} onChange={e => setLPhone(e.target.value)} placeholder="+91..."
                className="w-full px-3 py-2.5 rounded-xl bg-ink-800 border border-ink-700 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-zeal-500" />
            </div>
          </div>
          {/* Images */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Photos</label>
            {lImagePreviews.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-2 mb-2">
                {lImagePreviews.map((url, i) => (
                  <div key={i} className="relative shrink-0">
                    <img src={url} alt="" className="w-20 h-20 rounded-lg object-cover" />
                    <button onClick={() => { URL.revokeObjectURL(url); setLImages(prev => prev.filter((_, j) => j !== i)); setLImagePreviews(prev => prev.filter((_, j) => j !== i)) }}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center text-white"><X className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            )}
            <button onClick={handleListingImgPick}
              className="w-full py-4 rounded-xl border-2 border-dashed border-ink-600 hover:border-ink-500 flex flex-col items-center gap-1 transition-colors">
              <ImageIcon className="w-5 h-5 text-gray-500" />
              <span className="text-xs text-gray-500">Add photos</span>
            </button>
            {lImgErr && <p className="text-xs text-rose-400 mt-1">{lImgErr}</p>}
          </div>
          <button onClick={handleCreateListing} disabled={!lTitle.trim() || creatingListing}
            className="w-full py-2.5 rounded-xl bg-zeal-500 text-white font-medium text-sm hover:bg-zeal-600 transition-colors disabled:opacity-50">
            {creatingListing ? 'Posting...' : 'Post Listing'}
          </button>
        </div>
      </Sheet>
    </div>
  )
}
