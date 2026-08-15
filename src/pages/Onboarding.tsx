import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, ArrowRight, ArrowLeft, Sparkles, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { fetchBranches, checkUsernameAvailability, createHiddenProfile } from '@/lib/data'
import { generateAnonymousCode } from '@/lib/utils'
import { Logo } from '@/components/Logo'
import { HiddenAvatar } from '@/components/HiddenAvatar'
import type { Branch } from '@/types'

const TOTAL_STEPS = 7

const AURA_OPTIONS = [
  { id: '💻 Tech Builder', label: 'Tech Builder' },
  { id: '🧠 Problem Solver', label: 'Problem Solver' },
  { id: '🎮 Competitive Gamer', label: 'Competitive Gamer' },
  { id: '🚀 Founder', label: 'Founder' },
  { id: '🔥 Campus Creator', label: 'Campus Creator' },
  { id: '📸 Creative', label: 'Creative' },
  { id: '🤝 Community Helper', label: 'Community Helper' },
  { id: '🎤 Speaker', label: 'Speaker' },
]

const INTEREST_OPTIONS = ['AI', 'Coding', 'Gaming', 'Football', 'Cricket', 'Music', 'Photography', 'Startups', 'Design', 'Movies', 'Fitness', 'Reading', 'Dance', 'Anime']
const SKILL_OPTIONS = ['Python', 'Java', 'C++', 'React', 'UI/UX', 'Video Editing', 'Graphic Design', 'Public Speaking', 'JavaScript', 'Node.js', 'Machine Learning', 'Flutter', 'Photography', 'Content Writing']

const AVATAR_STYLES = ['1', '2', '3', '4', '5', '6', '7']

export function Onboarding() {
  const { user, profile, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)

  // Form state
  const [fullName, setFullName] = useState(profile?.full_name || user?.user_metadata?.full_name || '')
  const [username, setUsername] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [bio, setBio] = useState('')
  const [branchId, setBranchId] = useState<string | null>(null)
  const [year, setYear] = useState(1)
  const [gender, setGender] = useState('prefer_not_to_say')
  const [instagram, setInstagram] = useState('')
  const [phone, setPhone] = useState('')
  const [emailVisible, setEmailVisible] = useState(false)
  const [interests, setInterests] = useState<string[]>([])
  const [skills, setSkills] = useState<string[]>([])
  const [auraBadges, setAuraBadges] = useState<string[]>([])
  const [createHidden, setCreateHidden] = useState(true)
  const [hiddenNickname, setHiddenNickname] = useState('')
  const [hiddenAvatarStyle, setHiddenAvatarStyle] = useState('1')
  const [hiddenGender, setHiddenGender] = useState('prefer_not_to_say')

  const [branches, setBranches] = useState<Branch[]>([])
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle')

  useEffect(() => {
    fetchBranches().then(setBranches).catch(() => {})
  }, [])

  useEffect(() => {
    if (!username || username.length < 3) {
      setUsernameStatus('idle')
      return
    }
    const timer = setTimeout(async () => {
      setUsernameStatus('checking')
      const available = await checkUsernameAvailability(username, user?.id)
      setUsernameStatus(available ? 'available' : 'taken')
    }, 500)
    return () => clearTimeout(timer)
  }, [username, user?.id])

  if (!user) {
    navigate('/login', { replace: true })
    return null
  }

  const toggleArray = (arr: string[], val: string, setter: (v: string[]) => void, max?: number) => {
    if (arr.includes(val)) {
      setter(arr.filter(v => v !== val))
    } else {
      if (max && arr.length >= max) return
      setter([...arr, val])
    }
  }

  const canProceed = () => {
    switch (step) {
      case 0: return true
      case 1: return fullName.trim().length >= 2 && usernameStatus === 'available'
      case 2: return branchId !== null
      case 3: return true
      case 4: return true
      case 5: return true
      case 6: return true
      default: return true
    }
  }

  const next = () => {
    if (step < TOTAL_STEPS - 1) setStep(s => s + 1)
    else finish()
  }

  const back = () => {
    if (step > 0) setStep(s => s - 1)
  }

  const finish = async () => {
    if (!user) return
    setSaving(true)
    try {
      // Update profile
      await supabase.from('profiles').update({
        full_name: fullName,
        username: username.toLowerCase(),
        avatar_url: avatarUrl,
        bio,
        branch_id: branchId,
        year,
        gender,
        instagram: instagram || null,
        phone: phone || null,
        email_visible: emailVisible,
        aura_badges: auraBadges,
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      }).eq('id', user.id)

      // Save skills
      if (skills.length > 0) {
        const skillRows = skills.map(name => ({ name }))
        await supabase.from('skills').upsert(skillRows, { onConflict: 'name', ignoreDuplicates: true })
        const { data: skillIds } = await supabase.from('skills').select('id, name').in('name', skills)
        if (skillIds) {
          await supabase.from('profile_skills').upsert(
            skillIds.map(s => ({ profile_id: user.id, skill_id: s.id })),
            { onConflict: 'profile_id, skill_id' }
          )
        }
      }

      // Save interests
      if (interests.length > 0) {
        const interestRows = interests.map(name => ({ name }))
        await supabase.from('interests').upsert(interestRows, { onConflict: 'name', ignoreDuplicates: true })
        const { data: interestIds } = await supabase.from('interests').select('id, name').in('name', interests)
        if (interestIds) {
          await supabase.from('profile_interests').upsert(
            interestIds.map(i => ({ profile_id: user.id, interest_id: i.id })),
            { onConflict: 'profile_id, interest_id' }
          )
        }
      }

      // Create hidden identity
      if (createHidden) {
        await createHiddenProfile(user.id, generateAnonymousCode(), hiddenAvatarStyle, hiddenNickname || undefined, hiddenGender)
      }

      await refreshProfile()
      navigate('/home', { replace: true })
    } catch (err) {
      console.error('Onboarding error:', err)
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-ink-950 flex flex-col">
      {/* Progress bar */}
      <div className="sticky top-0 z-10 bg-ink-950/80 backdrop-blur-lg border-b border-ink-800 px-6 py-3 safe-top">
        <div className="flex items-center gap-2 max-w-md mx-auto">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                i <= step ? 'bg-zeal-500' : 'bg-ink-700'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-8">
        <div className="w-full max-w-md">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {/* Step 0: Welcome */}
              {step === 0 && (
                <div className="text-center space-y-6">
                  <Logo size="lg" showTagline />
                  <div>
                    <h1 className="text-3xl font-display font-bold text-white mb-3">
                      Welcome to InsideZeal
                    </h1>
                    <p className="text-gray-400 text-lg">
                      Your campus. Your people. Your vibe.
                    </p>
                  </div>
                  <div className="card p-6 text-left space-y-3">
                    <div className="flex items-center gap-3">
                      <Sparkles className="w-5 h-5 text-zeal-500" />
                      <span className="text-sm text-gray-300">Discover students, clubs, and events</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Sparkles className="w-5 h-5 text-zeal-500" />
                      <span className="text-sm text-gray-300">Post, chat, and compete on leaderboards</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Sparkles className="w-5 h-5 text-zeal-500" />
                      <span className="text-sm text-gray-300">Build your Smart Score and campus identity</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 1: Basic Identity */}
              {step === 1 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-2xl font-display font-bold text-white mb-1">Your identity</h2>
                    <p className="text-gray-500 text-sm">This is how others will see you on campus.</p>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm text-gray-400 mb-1.5 block">Full Name</label>
                      <input className="input" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Sahil Dhumal" />
                    </div>
                    <div>
                      <label className="text-sm text-gray-400 mb-1.5 block">Username</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">@</span>
                        <input
                          className="input pl-8"
                          value={username}
                          onChange={e => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase())}
                          placeholder="sahil"
                        />
                        {usernameStatus === 'checking' && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-500">checking...</span>}
                        {usernameStatus === 'available' && <Check className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zeal-500" />}
                        {usernameStatus === 'taken' && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-rose-500">taken</span>}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-gray-400 mb-1.5 block">Bio (optional)</label>
                      <textarea className="input min-h-[80px] resize-none" value={bio} onChange={e => setBio(e.target.value)} placeholder="AI builder & campus founder" maxLength={160} />
                      <p className="text-xs text-gray-600 mt-1">{bio.length}/160</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: College Info */}
              {step === 2 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-2xl font-display font-bold text-white mb-1">College details</h2>
                    <p className="text-gray-500 text-sm">Tell us about your branch and year.</p>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm text-gray-400 mb-1.5 block">Branch / Department</label>
                      <div className="grid grid-cols-2 gap-2">
                        {branches.map(b => (
                          <button
                            key={b.id}
                            onClick={() => setBranchId(b.id)}
                            className={`px-4 py-3 rounded-xl border text-sm font-medium transition-all text-left ${
                              branchId === b.id
                                ? 'bg-zeal-500/15 border-zeal-500/40 text-zeal-400'
                                : 'bg-ink-800 border-ink-700 text-gray-300 hover:border-ink-600'
                            }`}
                          >
                            {b.name}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-gray-400 mb-1.5 block">Current Year</label>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4].map(y => (
                          <button
                            key={y}
                            onClick={() => setYear(y)}
                            className={`flex-1 py-3 rounded-xl border text-sm font-medium transition-all ${
                              year === y
                                ? 'bg-zeal-500/15 border-zeal-500/40 text-zeal-400'
                                : 'bg-ink-800 border-ink-700 text-gray-300 hover:border-ink-600'
                            }`}
                          >
                            {y}{y === 1 ? 'st' : y === 2 ? 'nd' : y === 3 ? 'rd' : 'th'} Year
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Gender */}
              {step === 3 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-2xl font-display font-bold text-white mb-1">What's your gender?</h2>
                    <p className="text-gray-500 text-sm">This is private by default. You can change who sees it later.</p>
                  </div>
                  <div className="space-y-2">
                    {[
                      { val: 'male', label: 'Male' },
                      { val: 'female', label: 'Female' },
                      { val: 'prefer_not_to_say', label: 'Prefer not to say' },
                    ].map(g => (
                      <button
                        key={g.val}
                        onClick={() => setGender(g.val)}
                        className={`w-full px-5 py-4 rounded-xl border text-left font-medium transition-all ${
                          gender === g.val
                            ? 'bg-zeal-500/15 border-zeal-500/40 text-zeal-400'
                            : 'bg-ink-800 border-ink-700 text-gray-300 hover:border-ink-600'
                        }`}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 4: Contact Details */}
              {step === 4 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-2xl font-display font-bold text-white mb-1">Contact details</h2>
                    <p className="text-gray-500 text-sm">Optional. These are private by default.</p>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm text-gray-400 mb-1.5 block">Instagram username (optional)</label>
                      <input className="input" value={instagram} onChange={e => setInstagram(e.target.value.replace('@', ''))} placeholder="sahil.builds" />
                    </div>
                    <div>
                      <label className="text-sm text-gray-400 mb-1.5 block">Phone number (optional)</label>
                      <input className="input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210" type="tel" />
                    </div>
                    <label className="flex items-center justify-between p-4 rounded-xl bg-ink-800 border border-ink-700 cursor-pointer">
                      <div>
                        <p className="text-sm font-medium text-white">Show email publicly</p>
                        <p className="text-xs text-gray-500">Off by default</p>
                      </div>
                      <button
                        onClick={() => setEmailVisible(!emailVisible)}
                        className={`w-12 h-6 rounded-full transition-colors ${emailVisible ? 'bg-zeal-500' : 'bg-ink-600'}`}
                      >
                        <div className={`w-5 h-5 rounded-full bg-white transition-transform ${emailVisible ? 'translate-x-6' : 'translate-x-0.5'}`} />
                      </button>
                    </label>
                  </div>
                </div>
              )}

              {/* Step 5: Interests & Skills */}
              {step === 5 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-2xl font-display font-bold text-white mb-1">Interests & skills</h2>
                    <p className="text-gray-500 text-sm">Pick what you're into and what you're good at.</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">Interests</label>
                    <div className="flex flex-wrap gap-2">
                      {INTEREST_OPTIONS.map(i => (
                        <button
                          key={i}
                          onClick={() => toggleArray(interests, i, setInterests)}
                          className={`chip ${interests.includes(i) ? 'chip-active' : ''}`}
                        >
                          {i}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">Skills</label>
                    <div className="flex flex-wrap gap-2">
                      {SKILL_OPTIONS.map(s => (
                        <button
                          key={s}
                          onClick={() => toggleArray(skills, s, setSkills)}
                          className={`chip ${skills.includes(s) ? 'chip-active' : ''}`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">Profile Aura (pick up to 3)</label>
                    <div className="flex flex-wrap gap-2">
                      {AURA_OPTIONS.map(a => (
                        <button
                          key={a.id}
                          onClick={() => toggleArray(auraBadges, a.id, setAuraBadges, 3)}
                          className={`chip ${auraBadges.includes(a.id) ? 'chip-active' : ''}`}
                        >
                          {a.id}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 6: Hidden Identity */}
              {step === 6 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-2xl font-display font-bold text-white mb-1">Your hidden identity</h2>
                    <p className="text-gray-500 text-sm">Create another side of your campus identity for anonymous features.</p>
                  </div>
                  <div className="card p-5 space-y-4">
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-sm font-medium text-white">Create hidden identity</span>
                      <button
                        onClick={() => setCreateHidden(!createHidden)}
                        className={`w-12 h-6 rounded-full transition-colors ${createHidden ? 'bg-zeal-500' : 'bg-ink-600'}`}
                      >
                        <div className={`w-5 h-5 rounded-full bg-white transition-transform ${createHidden ? 'translate-x-6' : 'translate-x-0.5'}`} />
                      </button>
                    </label>

                    {createHidden && (
                      <div className="space-y-4 animate-fade-in">
                        <div className="flex flex-col items-center gap-3 py-2">
                          <HiddenAvatar seed={username || 'preview'} style={hiddenAvatarStyle} size="xl" />
                          <p className="text-zeal-500 font-mono font-bold text-lg">ZL-••••</p>
                          <p className="text-xs text-gray-500">Your anonymous code will be generated automatically</p>
                        </div>
                        <div>
                          <label className="text-sm text-gray-400 mb-2 block">Avatar style</label>
                          <div className="flex gap-2 flex-wrap">
                            {AVATAR_STYLES.map(s => (
                              <button
                                key={s}
                                onClick={() => setHiddenAvatarStyle(s)}
                                className={`rounded-xl overflow-hidden border-2 transition-all ${hiddenAvatarStyle === s ? 'border-zeal-500' : 'border-transparent'}`}
                              >
                                <HiddenAvatar seed={username || 'preview'} style={s} size="sm" />
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="text-sm text-gray-400 mb-1.5 block">Hidden nickname (optional)</label>
                          <input className="input" value={hiddenNickname} onChange={e => setHiddenNickname(e.target.value)} placeholder="nightowl" />
                        </div>
                        <div>
                          <label className="text-sm text-gray-400 mb-1.5 block">Hidden gender (optional)</label>
                          <div className="flex gap-2">
                            {[
                              { val: 'male', label: 'Male' },
                              { val: 'female', label: 'Female' },
                              { val: 'prefer_not_to_say', label: 'N/A' },
                            ].map(g => (
                              <button
                                key={g.val}
                                onClick={() => setHiddenGender(g.val)}
                                className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                                  hiddenGender === g.val
                                    ? 'bg-zeal-500/15 border-zeal-500/40 text-zeal-400'
                                    : 'bg-ink-800 border-ink-700 text-gray-300'
                                }`}
                              >
                                {g.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center gap-3 mt-8">
            {step > 0 && (
              <button onClick={back} className="btn-secondary flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            )}
            <button
              onClick={next}
              disabled={!canProceed() || saving}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              {saving ? 'Finishing...' : step === TOTAL_STEPS - 1 ? 'Enter InsideZeal' : 'Continue'}
              {!saving && <ArrowRight className="w-4 h-4" />}
            </button>
          </div>
          {step === TOTAL_STEPS - 1 && createHidden === false && (
            <p className="text-xs text-gray-600 text-center mt-3">You can create your hidden identity later in Settings.</p>
          )}
        </div>
      </div>
    </div>
  )
}
