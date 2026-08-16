import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { isPreviewMode } from '@/lib/preview'
import { DEMO_PROFILE } from '@/lib/demoProfile'
import type { Profile } from '@/types'

interface AuthContextValue {
  session: Session | null
  user: User | null
  profile: Profile | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
    if (data) {
      setProfile(data as Profile)
    } else {
      // Create a minimal profile row for new Google users
      const fullName = session?.user?.user_metadata?.full_name || session?.user?.user_metadata?.name || ''
      const { data: newProfile } = await supabase
        .from('profiles')
        .insert({ id: userId, full_name: fullName })
        .select()
        .maybeSingle()
      if (newProfile) setProfile(newProfile as Profile)
    }
  }, [session])

  const refreshProfile = useCallback(async () => {
    if (user) await loadProfile(user.id)
  }, [user, loadProfile])

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        loadProfile(session.user.id).finally(() => mounted && setLoading(false))
      } else {
        // Preview mode: inject demo profile
        if (isPreviewMode) {
          setProfile(DEMO_PROFILE)
        }
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        (async () => {
          await loadProfile(session.user.id)
          if (mounted) setLoading(false)
        })()
      } else {
        // Preview mode: inject demo profile
        if (isPreviewMode) {
          setProfile(DEMO_PROFILE)
        } else {
          setProfile(null)
        }
        if (mounted) setLoading(false)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [loadProfile])

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/home',
      },
    })
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setProfile(null)
  }

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, signInWithGoogle, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
