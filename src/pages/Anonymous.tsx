import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Rocket, Shield } from 'lucide-react'
import { HiddenAvatar } from '@/components/HiddenAvatar'
import { useAuth } from '@/context/AuthContext'
import { fetchMyHiddenProfile, createHiddenProfile } from '@/lib/data'
import { generateAnonymousCode } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import type { HiddenProfile } from '@/types'

const AVATAR_STYLES = ['1', '2', '3', '4', '5', '6', '7']

export function Anonymous() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [hidden, setHidden] = useState<HiddenProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showEditor, setShowEditor] = useState(false)
  const [saving, setSaving] = useState(false)
  const [nickname, setNickname] = useState('')
  const [avatarStyle, setAvatarStyle] = useState('1')
  const [gender, setGender] = useState('prefer_not_to_say')

  useEffect(() => {
    if (!user) { setLoading(false); return }
    fetchMyHiddenProfile(user.id).then(h => {
      if (h) {
        setHidden(h)
        setNickname(h.nickname || '')
        setAvatarStyle(h.avatar_style)
        setGender(h.gender)
      }
    }).catch(() => {}).finally(() => setLoading(false))
  }, [user])

  const handleCreate = async () => {
    if (!user) return
    setCreating(true)
    try {
      const hp = await createHiddenProfile(user.id, generateAnonymousCode(), '1', undefined, 'prefer_not_to_say')
      if (hp) {
        setHidden(hp)
        setNickname(hp.nickname || '')
        setAvatarStyle(hp.avatar_style)
        setGender(hp.gender)
      }
    } catch {} finally { setCreating(false) }
  }

  const handleSave = async () => {
    if (!user || !hidden) return
    setSaving(true)
    try {
      await supabase.from('hidden_profiles').update({
        nickname: nickname || null,
        avatar_style: avatarStyle,
        gender,
        updated_at: new Date().toISOString(),
      }).eq('id', hidden.id)
      setHidden({ ...hidden, nickname: nickname || null, avatar_style: avatarStyle, gender })
      setShowEditor(false)
    } catch {} finally { setSaving(false) }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/profile/me')} className="p-2 rounded-xl hover:bg-ink-800 transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </button>
          <div>
            <h1 className="text-xl font-display font-bold text-white">Anonymous ID</h1>
            <p className="text-gray-500 text-xs">Your hidden side of campus life</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="skeleton h-64 rounded-2xl" />
      ) : !hidden ? (
        /* No hidden identity yet */
        <div className="card p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-ink-800 flex items-center justify-center mx-auto text-3xl">🎭</div>
          <h2 className="text-lg font-semibold text-white">Create your hidden identity</h2>
          <p className="text-sm text-gray-500">
            An anonymous persona with a unique code (ZL-XXXX). Used for Confessions and Zeal Match.
            Nobody can trace it back to you.
          </p>
          <button onClick={handleCreate} disabled={creating}
            className="btn-primary w-full flex items-center justify-center gap-2">
            <Rocket className="w-4 h-4" /> {creating ? 'Creating...' : 'Create Anonymous ID'}
          </button>
        </div>
      ) : (
        <>
          {/* Identity card */}
          <div className="card p-5 text-center space-y-3">
            <HiddenAvatar seed={hidden.avatar_seed} style={hidden.avatar_style} size="xl" className="mx-auto" />
            <div>
              <p className="text-lg font-bold text-white font-mono">{hidden.anonymous_code}</p>
              <p className="text-xs text-gray-500">{hidden.nickname ? `"${hidden.nickname}"` : 'No nickname'}</p>
            </div>
            <div className="flex items-center justify-center gap-1.5 text-xs text-gray-600">
              <Shield className="w-3.5 h-3.5" /> Your identity is never linked publicly
            </div>
            <button onClick={() => setShowEditor(true)} className="btn-secondary text-sm w-full">
              Edit Anonymous ID
            </button>
          </div>

          {/* Feature entries */}
          <div className="space-y-2">
            <button onClick={() => navigate('/confessions')}
              className="w-full card p-4 flex items-center gap-3 hover:bg-ink-800 transition-colors text-left">
              <div className="w-11 h-11 rounded-2xl bg-rose-500/15 flex items-center justify-center text-xl shrink-0">🤫</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">Confessions</p>
                <p className="text-xs text-gray-500">Share secrets and rants anonymously</p>
              </div>
            </button>
            <button onClick={() => navigate('/match')}
              className="w-full card p-4 flex items-center gap-3 hover:bg-ink-800 transition-colors text-left">
              <div className="w-11 h-11 rounded-2xl bg-zeal-500/15 flex items-center justify-center text-xl shrink-0">💘</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">Zeal Match</p>
                <p className="text-xs text-gray-500">Meet someone before knowing who they are</p>
              </div>
            </button>
          </div>
        </>
      )}

      {/* Editor modal */}
      {showEditor && hidden && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowEditor(false)} />
          <div className="relative w-full sm:max-w-md bg-ink-850 border border-ink-700 rounded-t-3xl sm:rounded-3xl p-5 pb-8 safe-bottom animate-slide-up max-h-[85vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-white mb-4">Edit Anonymous ID</h2>
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-3 py-2">
                <HiddenAvatar seed={hidden.avatar_seed} style={avatarStyle} size="xl" />
                <p className="text-zeal-500 font-mono font-bold text-lg">{hidden.anonymous_code}</p>
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Avatar style</label>
                <div className="flex gap-2 flex-wrap">
                  {AVATAR_STYLES.map(s => (
                    <button key={s} onClick={() => setAvatarStyle(s)}
                      className={`rounded-xl overflow-hidden border-2 transition-all ${avatarStyle === s ? 'border-zeal-500' : 'border-transparent'}`}>
                      <HiddenAvatar seed={hidden.avatar_seed} style={s} size="sm" />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1.5 block">Hidden nickname (optional)</label>
                <input className="input" value={nickname} onChange={e => setNickname(e.target.value)} placeholder="nightowl" maxLength={30} />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1.5 block">Hidden gender (optional)</label>
                <div className="flex gap-2">
                  {[
                    { val: 'male', label: 'Male' },
                    { val: 'female', label: 'Female' },
                    { val: 'prefer_not_to_say', label: 'N/A' },
                  ].map(g => (
                    <button key={g.val} onClick={() => setGender(g.val)}
                      className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                        gender === g.val ? 'bg-zeal-500/15 border-zeal-500/40 text-zeal-400' : 'bg-ink-800 border-ink-700 text-gray-300'
                      }`}>
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowEditor(false)} className="btn-secondary flex-1 text-sm">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 text-sm">
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}