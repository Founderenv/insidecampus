import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types'

interface AuthContextValue {
  session: Session | null
  user: User | null
  profile: Profile | null
  loading: boolean
  error: string | null
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  retry: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const profileLoadingRef = useRef<string | null>(null)

  const loadProfile = useCallback(async (userId: string, userMetadata?: Record<string, unknown>) => {
    if (profileLoadingRef.current === userId) return
    profileLoadingRef.current = userId

    try {
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (fetchError) {
        console.error('Profile fetch error:', fetchError)
        throw new Error('Failed to load profile')
      }

      if (data) {
        setProfile(data as Profile)
        setError(null)
      } else {
        const meta = (userMetadata || {}) as Record<string, string>
        const fullName = meta.full_name || meta.name || ''
        const avatarUrl = meta.avatar_url || meta.picture || null

        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            full_name: fullName,
            avatar_url: avatarUrl,
          })
          .select()
          .maybeSingle()

        if (insertError) {
          console.error('Profile insert error:', insertError)
          throw new Error('Failed to create profile')
        }

        if (newProfile) {
          setProfile(newProfile as Profile)
        }
        setError(null)
      }
    } catch (err) {
      console.error('loadProfile error:', err)
      setError('Sign-in couldn\'t be completed. Please try again.')
    } finally {
      profileLoadingRef.current = null
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    if (user) await loadProfile(user.id)
  }, [user, loadProfile])

  const retry = useCallback(() => {
    setError(null)
    setLoading(true)
    profileLoadingRef.current = null
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        loadProfile(session.user.id, session.user.user_metadata as Record<string, unknown>)
          .finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    }).catch(() => {
      setLoading(false)
    })
  }, [loadProfile])

  useEffect(() => {
    let mounted = true
    let initialLoadDone = false

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        loadProfile(session.user.id, session.user.user_metadata as Record<string, unknown>)
          .finally(() => {
            if (mounted) {
              setLoading(false)
              initialLoadDone = true
            }
          })
      } else {
        setLoading(false)
        initialLoadDone = true
      }
    }).catch(() => {
      if (mounted) {
        setLoading(false)
        initialLoadDone = true
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session)
      setUser(session?.user ?? null)

      if (session?.user) {
        try {
          await loadProfile(session.user.id, session.user.user_metadata as Record<string, unknown>)
        } catch {
          // Error already captured in loadProfile
        } finally {
          if (mounted) setLoading(false)
        }
      } else {
        setProfile(null)
        if (mounted) setLoading(false)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [loadProfile])

  const signInWithGoogle = async () => {
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/home',
      },
    })
    if (authError) {
      console.error('Google sign-in error:', authError)
      setError('Could not start Google sign-in. Please try again.')
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setProfile(null)
    setUser(null)
    setSession(null)
    setError(null)
  }

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, error, signInWithGoogle, signOut, refreshProfile, retry }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
