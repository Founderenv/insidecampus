import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Camera, Loader2, AlertCircle, Check } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Avatar } from '@/components/Avatar'
import { updateProfile, uploadAvatar, checkUsernameAvailability, fetchBranches, fetchMyContactPhone, updateContactPhone, sanitizeText } from '@/lib/data'
import type { Branch } from '@/types'

function normalizePhone(raw: string): string | null {
  const cleaned = raw.replace(/[\s\-().]/g, '')
  if (!cleaned) return null
  if (!/^\+?\d{10,15}$/.test(cleaned)) return null
  const digits = cleaned.replace(/\D/g, '')
  if (cleaned.startsWith('+')) return `+${digits}`
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`
  return `+91${digits}`
}

export function EditProfile() {
  const navigate = useNavigate()
  const { profile, refreshProfile } = useAuth()
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [instagram, setInstagram] = useState('')
  const [phone, setPhone] = useState('')
  const [year, setYear] = useState(1)
  const [branchId, setBranchId] = useState('')
  const [branches, setBranches] = useState<Branch[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle')
  const [avatarUploading, setAvatarUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '')
      setUsername(profile.username || '')
      setBio(profile.bio || '')
      setInstagram(profile.instagram || '')
      setYear(profile.year || 1)
      setBranchId(profile.branch_id || '')
      fetchMyContactPhone(profile.id).then(p => setPhone(p || '')).catch(() => setPhone(''))
    }
    fetchBranches().then(setBranches).catch(() => {})
  }, [profile])

  useEffect(() => {
    if (!username || username === profile?.username) {
      setUsernameStatus('idle')
      return
    }
    const timer = setTimeout(async () => {
      setUsernameStatus('checking')
      try {
        const available = await checkUsernameAvailability(username, profile?.id)
        setUsernameStatus(available ? 'available' : 'taken')
      } catch {
        setUsernameStatus('idle')
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [username, profile])

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !profile) return
    setAvatarUploading(true)
    setError('')
    try {
      const url = await uploadAvatar(profile.id, file)
      await updateProfile(profile.id, { avatar_url: url } as any)
      await refreshProfile()
      setSuccess(true)
      setTimeout(() => setSuccess(false), 2000)
    } catch (err: any) {
      setError(err?.message || 'Failed to upload avatar')
    } finally {
      setAvatarUploading(false)
    }
  }

  const handleSave = async () => {
    if (!profile) return
    if (!fullName.trim()) {
      setError('Name cannot be empty')
      return
    }
    if (username && usernameStatus === 'taken') {
      setError('Username is already taken')
      return
    }
    const normalizedPhone = normalizePhone(phone.trim())
    if (phone.trim() && !normalizedPhone) {
      setError('Enter a valid phone number (e.g. 9876543210 or +919876543210)')
      return
    }
    setSaving(true)
    setError('')
    try {
      await updateProfile(profile.id, {
        full_name: sanitizeText(fullName),
        username: username || null,
        bio: sanitizeText(bio),
        instagram: instagram || null,
        year,
        branch_id: branchId || null,
      } as any)
      await updateContactPhone(profile.id, normalizedPhone || null)
      await refreshProfile()
      setSuccess(true)
      setTimeout(() => setSuccess(false), 2000)
    } catch (err: any) {
      setError(err?.message || 'Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  if (!profile) return null

  return (
    <div className="space-y-4 pb-24 lg:pb-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-ink-800 transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </button>
          <h1 className="text-lg font-semibold text-white">Edit Profile</h1>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || usernameStatus === 'taken'}
          className="btn-primary text-sm py-2 px-4"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      {/* Status messages */}
      {success && (
        <div className="flex items-center gap-2 text-sm text-green-400 px-1">
          <Check className="w-4 h-4" /> Profile updated
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-400 px-1">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* Avatar */}
      <div className="card p-5">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar src={profile.avatar_url} alt={profile.full_name} size="xl" />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleAvatarChange}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarUploading}
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-zeal-500 flex items-center justify-center text-ink-950 hover:bg-zeal-400 transition-colors"
            >
              {avatarUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
            </button>
          </div>
          <div>
            <p className="font-semibold text-white text-sm">{profile.full_name}</p>
            <p className="text-xs text-gray-500">@{profile.username || 'no username'}</p>
            <p className="text-xs text-gray-600 mt-1">Tap camera to change photo</p>
          </div>
        </div>
      </div>

      {/* Form fields */}
      <div className="card p-5 space-y-4">
        <div>
          <label className="text-sm text-gray-400 mb-1.5 block">Full Name</label>
          <input
            className="input"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            placeholder="Your name"
            maxLength={100}
          />
        </div>

        <div>
          <label className="text-sm text-gray-400 mb-1.5 block">Username</label>
          <input
            className="input"
            value={username}
            onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
            placeholder="username"
            maxLength={30}
          />
          {usernameStatus === 'checking' && <p className="text-xs text-gray-500 mt-1">Checking...</p>}
          {usernameStatus === 'available' && <p className="text-xs text-green-400 mt-1">Username available</p>}
          {usernameStatus === 'taken' && <p className="text-xs text-red-400 mt-1">Username already taken</p>}
        </div>

        <div>
          <label className="text-sm text-gray-400 mb-1.5 block">Bio</label>
          <textarea
            className="input resize-none"
            value={bio}
            onChange={e => setBio(e.target.value)}
            placeholder="Tell campus about yourself"
            rows={3}
            maxLength={160}
          />
          <p className="text-xs text-gray-600 mt-1 text-right">{bio.length}/160</p>
        </div>

        <div>
          <label className="text-sm text-gray-400 mb-1.5 block">Instagram</label>
          <input
            className="input"
            value={instagram}
            onChange={e => setInstagram(e.target.value)}
            placeholder="@username"
            maxLength={30}
          />
        </div>

        <div>
          <label className="text-sm text-gray-400 mb-1.5 block">Phone / WhatsApp <span className="text-gray-600">(optional)</span></label>
          <div className="flex gap-2">
            <input
              className="input flex-1"
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="9876543210 or +919876543210"
              maxLength={16}
            />
            {phone && (
              <button
                type="button"
                onClick={() => setPhone('')}
                className="shrink-0 px-3 rounded-xl bg-ink-800 border border-ink-700 text-gray-400 hover:text-white text-xs transition-colors"
              >
                Remove
              </button>
            )}
          </div>
          <p className="text-xs text-gray-600 mt-1">Used for WhatsApp / call contact on your listings. Never shown on your public profile.</p>
        </div>

        <div>
          <label className="text-sm text-gray-400 mb-1.5 block">Year</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4].map(y => (
              <button
                key={y}
                onClick={() => setYear(y)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  year === y ? 'bg-zeal-500 text-ink-950' : 'bg-ink-800 border border-ink-700 text-gray-400 hover:text-white'
                }`}
              >
                {y}{y === 1 ? 'st' : y === 2 ? 'nd' : y === 3 ? 'rd' : 'th'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm text-gray-400 mb-1.5 block">Branch</label>
          <select
            className="input"
            value={branchId}
            onChange={e => setBranchId(e.target.value)}
          >
            <option value="">Select branch</option>
            {branches.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}
