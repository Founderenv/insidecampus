import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, User, Eye, EyeOff, Shield, Bell, Ban, HelpCircle, Rocket, Loader2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Avatar } from '@/components/Avatar'
import { HiddenAvatar } from '@/components/HiddenAvatar'
import { supabase } from '@/lib/supabase'
import { fetchMyHiddenProfile, createHiddenProfile, fetchBlockedUsers, blockUser, unblockUser } from '@/lib/data'
import { generateAnonymousCode } from '@/lib/utils'
import type { HiddenProfile, Profile } from '@/types'

const AVATAR_STYLES = ['1', '2', '3', '4', '5', '6', '7']

const SETTINGS_WHITELIST = new Set([
  'full_name', 'username', 'bio', 'avatar_url',
  'branch_id', 'year', 'gender', 'show_gender', 'show_year',
  'instagram', 'email_visible', 'is_private', 'show_rankings',
])

export function Settings() {
  const { user, profile, signOut, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [hidden, setHidden] = useState<HiddenProfile | null>(null)
  const [blocked, setBlocked] = useState<Profile[]>([])
  const [saving, setSaving] = useState(false)
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)
  const [nickname, setNickname] = useState('')
  const [avatarStyle, setAvatarStyle] = useState('1')

  useEffect(() => {
    if (!user) return
    fetchMyHiddenProfile(user.id).then(h => {
      if (h) {
        setHidden(h)
        setNickname(h.nickname || '')
        setAvatarStyle(h.avatar_style)
      }
    }).catch(() => {})
    fetchBlockedUsers(user.id).then(setBlocked).catch(() => {})
  }, [user])

  const updateProfileField = async (field: string, value: any) => {
    if (!user) return
    if (!SETTINGS_WHITELIST.has(field)) return
    setSaving(true)
    await supabase.from('profiles').update({ [field]: value, updated_at: new Date().toISOString() }).eq('id', user.id)
    await refreshProfile()
    setSaving(false)
  }

  const createHidden = async () => {
    if (!user) return
    setSaving(true)
    const hp = await createHiddenProfile(user.id, generateAnonymousCode(), avatarStyle, nickname || undefined)
    if (hp) setHidden(hp)
    setSaving(false)
    setShowAvatarPicker(false)
  }

  const updateHidden = async () => {
    if (!user || !hidden) return
    setSaving(true)
    await supabase.from('hidden_profiles').update({ nickname: nickname || null, avatar_style: avatarStyle, updated_at: new Date().toISOString() }).eq('id', hidden.id)
    setHidden({ ...hidden, nickname: nickname || null, avatar_style: avatarStyle })
    setSaving(false)
    setShowAvatarPicker(false)
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  if (!profile) return null

  const unblock = async (b: Profile) => {
    if (!user) return
    try {
      await unblockUser(user.id, b.id)
      setBlocked(prev => prev.filter(x => x.id !== b.id))
    } catch {}
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-display font-bold text-white mb-1">Settings</h1>
        <p className="text-gray-500 text-sm">Manage your account, privacy, and identity.</p>
      </div>

      {saving && (
        <div className="flex items-center gap-2 text-sm text-zeal-500">
          <Loader2 className="w-4 h-4 animate-spin" /> Saving...
        </div>
      )}

      {/* Account */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2"><User className="w-4 h-4" /> Account</h2>
        <div className="flex items-center gap-3 mb-4">
          <Avatar src={profile.avatar_url} alt={profile.full_name} size="md" />
          <div>
            <p className="font-semibold text-white text-sm">{profile.full_name}</p>
            <p className="text-xs text-gray-500">@{profile.username}</p>
          </div>
        </div>
        <button onClick={() => navigate('/edit-profile')} className="btn-secondary text-sm w-full mb-2">Edit Profile</button>
        <button onClick={handleSignOut} className="btn-ghost text-sm w-full flex items-center justify-center gap-2 text-rose-400">
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </div>

      {/* Privacy */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2"><Shield className="w-4 h-4" /> Privacy</h2>
        <div className="space-y-3">
          <ToggleRow
            label="Private account"
            desc="Only followers can see your posts"
            value={profile.is_private}
            onChange={(v) => updateProfileField('is_private', v)}
          />
          <ToggleRow
            label="Show year"
            desc="Display your current year on profile"
            value={profile.show_year}
            onChange={(v) => updateProfileField('show_year', v)}
          />
          <ToggleRow
            label="Show gender"
            desc="Display your gender on profile"
            value={profile.show_gender}
            onChange={(v) => updateProfileField('show_gender', v)}
          />
          <ToggleRow
            label="Show email"
            desc="Allow others to see your email"
            value={profile.email_visible}
            onChange={(v) => updateProfileField('email_visible', v)}
          />
          <ToggleRow
            label="Show rankings"
            desc="Display your rank badges on your profile"
            value={profile.show_rankings}
            onChange={(v) => updateProfileField('show_rankings', v)}
          />
        </div>
      </div>

      {/* Hidden Identity */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2"><Eye className="w-4 h-4" /> Hidden Identity</h2>
        {hidden ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <HiddenAvatar seed={hidden.avatar_seed} style={hidden.avatar_style} size="md" />
              <div>
                <p className="font-semibold text-white font-mono text-sm">{hidden.anonymous_code}</p>
                <p className="text-xs text-gray-500">{hidden.nickname || 'No nickname'}</p>
              </div>
            </div>
            <button onClick={() => setShowAvatarPicker(true)} className="btn-secondary text-sm w-full">Edit Hidden Identity</button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-500">You haven't created a hidden identity yet. Create one for anonymous features like gossip, confessions, and Zeal Match.</p>
            <button onClick={() => setShowAvatarPicker(true)} className="btn-primary text-sm w-full flex items-center justify-center gap-2">
              <Rocket className="w-4 h-4" /> Create Hidden Identity
            </button>
          </div>
        )}
      </div>

      {/* Blocked Accounts */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2"><Ban className="w-4 h-4" /> Blocked Accounts</h2>
        {blocked.length === 0 ? (
          <p className="text-sm text-gray-500">You haven't blocked anyone.</p>
        ) : (
          <div className="space-y-2">
            {blocked.map(b => (
              <div key={b.id} className="flex items-center gap-3">
                <Avatar src={b.avatar_url} alt={b.full_name} size="sm" />
                <span className="text-sm text-gray-300 flex-1">{b.full_name}</span>
                <button onClick={() => unblock(b)} className="btn-ghost text-xs text-rose-400">Unblock</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Help */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2"><HelpCircle className="w-4 h-4" /> Help & Support</h2>
        <p className="text-sm text-gray-500">InsideZeal is an unofficial student social network. For help, report issues through the report button on any content.</p>
      </div>

      <p className="text-xs text-gray-600 text-center pb-4">InsideZeal V1 · Inside your campus. Inside the vibe.</p>

      {/* Hidden Identity Editor */}
      {showAvatarPicker && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAvatarPicker(false)} />
          <div className="relative w-full sm:max-w-md bg-ink-850 border border-ink-700 rounded-t-3xl sm:rounded-3xl p-5 pb-8 safe-bottom animate-slide-up max-h-[85vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-white mb-4">{hidden ? 'Edit Hidden Identity' : 'Create Hidden Identity'}</h2>
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-3 py-2">
                <HiddenAvatar seed={profile.username || 'preview'} style={avatarStyle} size="xl" />
                <p className="text-zeal-500 font-mono font-bold text-lg">{hidden?.anonymous_code || 'ZL-••••'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Avatar style</label>
                <div className="flex gap-2 flex-wrap">
                  {AVATAR_STYLES.map(s => (
                    <button key={s} onClick={() => setAvatarStyle(s)} className={`rounded-xl overflow-hidden border-2 transition-all ${avatarStyle === s ? 'border-zeal-500' : 'border-transparent'}`}>
                      <HiddenAvatar seed={profile.username || 'preview'} style={s} size="sm" />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1.5 block">Hidden nickname (optional)</label>
                <input className="input" value={nickname} onChange={e => setNickname(e.target.value)} placeholder="nightowl" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowAvatarPicker(false)} className="btn-secondary flex-1 text-sm">Cancel</button>
                <button onClick={hidden ? updateHidden : createHidden} className="btn-primary flex-1 text-sm">{hidden ? 'Save' : 'Create'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ToggleRow({ label, desc, value, onChange }: { label: string; desc: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-ink-800 border border-ink-700">
      <div>
        <p className="text-sm font-medium text-white">{label}</p>
        <p className="text-xs text-gray-500">{desc}</p>
      </div>
      <button
        role="switch"
        aria-checked={value}
        aria-label={label}
        onClick={() => onChange(!value)}
        className={`w-12 h-6 rounded-full transition-colors shrink-0 ${value ? 'bg-zeal-500' : 'bg-ink-600'}`}
      >
        <div className={`w-5 h-5 rounded-full bg-white transition-transform ${value ? 'translate-x-6' : 'translate-x-0.5'}`} />
      </button>
    </div>
  )
}
