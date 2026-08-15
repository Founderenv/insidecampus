import { useEffect, useState } from 'react'
import { Brain, Flame, Zap, Trophy, TrendingUp } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { fetchSmartProfile, submitChallengeAttempt, fetchSmartLeaderboard } from '@/lib/data'
import { SkeletonList } from '@/components/Skeleton'
import { EmptyState } from '@/components/States'
import { Avatar } from '@/components/Avatar'
import { formatNumber } from '@/lib/utils'
import type { SmartChallenge, Profile } from '@/types'
import { supabase } from '@/lib/supabase'

const CATEGORY_META: Record<string, { label: string; icon: string }> = {
  Coding: { label: 'Coding', icon: '💻' },
  'Problem Solving': { label: 'Problem Solving', icon: '🧩' },
  Knowledge: { label: 'Knowledge', icon: '🌎' },
  Contribution: { label: 'Contribution', icon: '🤝' },
  Academic: { label: 'Academic', icon: '📚' },
}

export function Smart() {
  const { user, profile, refreshProfile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [challenge, setChallenge] = useState<SmartChallenge | null>(null)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [submitted, setSubmitted] = useState(false)
  const [attemptResult, setAttemptResult] = useState<{ score: number; total: number; xp: number } | null>(null)
  const [alreadyAttempted, setAlreadyAttempted] = useState(false)
  const [breakdown, setBreakdown] = useState<{ category: string; score: number }[]>([])
  const [streak, setStreak] = useState(0)
  const [leaderboard, setLeaderboard] = useState<Profile[]>([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!user) return
    Promise.all([
      fetchSmartProfile(user.id).then(({ breakdown: b, streak: s }) => {
        setBreakdown(b || [])
        setStreak(s?.current_streak || 0)
      }),
      supabase
        .from('smart_challenges')
        .select('*')
        .eq('is_daily', true)
        .eq('is_active', true)
        .order('scheduled_date', { ascending: false })
        .limit(1)
        .then(({ data }) => {
          if (data && data.length > 0) setChallenge(data[0] as SmartChallenge)
        }),
      fetchSmartLeaderboard(undefined, 10).then(setLeaderboard),
    ])
      .then(() => setLoading(false))
      .catch(() => setLoading(false))
  }, [user])

  useEffect(() => {
    if (!user || !challenge) return
    supabase
      .from('smart_attempts')
      .select('id')
      .eq('user_id', user.id)
      .eq('challenge_id', challenge.id)
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) setAlreadyAttempted(true)
      })
  }, [user, challenge])

  const submit = async () => {
    if (!challenge || !user) return
    let correct = 0
    challenge.questions.forEach((q: any, i: number) => {
      if (answers[i] === q.correct) correct++
    })
    const xp = correct * (challenge.xp_reward || 10)
    setSubmitting(true)
    try {
      await submitChallengeAttempt(user.id, challenge.id, answers, correct, xp, challenge.category)
      setAttemptResult({ score: correct, total: challenge.questions.length, xp })
      setSubmitted(true)
      refreshProfile()
    } catch {
    } finally {
      setSubmitting(false)
    }
  }

  const getScoreForCategory = (cat: string) => {
    const found = breakdown.find((b) => b.category === cat)
    return found?.score || 0
  }

  const getScoreValue = (p: Profile) => {
    return p.smart_score
  }

  if (loading) return <SkeletonList count={2} />

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-display font-bold text-white mb-1 flex items-center gap-2">
          <Brain className="w-7 h-7 text-blue-400" /> Smart League
        </h1>
        <p className="text-gray-500 text-sm">Build your Smart Score across multiple dimensions.</p>
      </div>

      {/* Smart Score + Streak */}
      <div className="card p-6 text-center">
        <p className="text-xs text-gray-500 uppercase tracking-wide">Smart Score</p>
        <p className="text-5xl font-bold text-zeal-500 mt-1">{profile?.smart_score || 0}</p>
        <div className="flex items-center justify-center gap-4 mt-2">
          <div className="flex items-center gap-1.5 text-sm text-gray-400">
            <Flame className="w-4 h-4 text-orange-400" />
            <span>{streak} day streak</span>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="grid grid-cols-5 gap-2 mt-5">
          {Object.entries(CATEGORY_META).map(([key, meta]) => (
            <div key={key} className="text-center">
              <p className="text-lg">{meta.icon}</p>
              <p className="font-bold text-white text-sm mt-1">{getScoreForCategory(key)}</p>
              <p className="text-[10px] text-gray-500 truncate">{meta.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Daily Challenge */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Flame className="w-5 h-5 text-orange-400" />
          <h2 className="font-semibold text-white">Daily Smart Challenge</h2>
        </div>

        {!challenge ? (
          <EmptyState
            icon={<Brain className="w-7 h-7" />}
            title="No challenge today"
            description="Check back tomorrow for a new challenge!"
          />
        ) : alreadyAttempted && !submitted ? (
          <div className="text-center py-6">
            <p className="text-sm text-gray-400">You already attempted today's challenge.</p>
            <p className="text-xs text-gray-600 mt-1">Come back tomorrow for a new one!</p>
          </div>
        ) : submitted && attemptResult ? (
          <div className="text-center py-6 animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-zeal-500/10 flex items-center justify-center mx-auto mb-3">
              <Trophy className="w-8 h-8 text-zeal-500" />
            </div>
            <p className="text-3xl font-bold text-zeal-500">
              {attemptResult.score}/{attemptResult.total}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              +{attemptResult.xp} XP earned
            </p>
            <p className="text-xs text-gray-600 mt-2">Your Smart Score has been updated!</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-300">{challenge.title}</p>
            {challenge.questions.map((q: any, qi: number) => (
              <div key={qi}>
                <p className="text-sm text-white font-medium mb-2">
                  {qi + 1}. {q.question}
                </p>
                <div className="space-y-2">
                  {q.options.map((opt: string, oi: number) => (
                    <button
                      key={oi}
                      onClick={() => setAnswers({ ...answers, [qi]: oi })}
                      className={`w-full p-3 rounded-xl border text-sm text-left transition-all ${
                        answers[qi] === oi
                          ? 'bg-zeal-500/15 border-zeal-500/40 text-zeal-400'
                          : 'bg-ink-800 border-ink-700 text-gray-300 hover:border-ink-600'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <button
              onClick={submit}
              disabled={Object.keys(answers).length < challenge.questions.length || submitting}
              className="btn-primary w-full flex items-center justify-center gap-2 text-sm disabled:opacity-50"
            >
              <Zap className="w-4 h-4" />
              {submitting ? 'Submitting...' : 'Submit Answers'}
            </button>
          </div>
        )}
      </div>

      {/* Smart Leaderboard */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-5 h-5 text-zeal-500" />
          <h2 className="font-semibold text-white">Smart Leaderboard</h2>
        </div>
        {leaderboard.length === 0 ? (
          <EmptyState icon={<Trophy className="w-7 h-7" />} title="No rankings yet" description="Complete challenges to appear here." />
        ) : (
          <div className="space-y-2">
            {leaderboard.map((p, i) => (
              <div key={p.id} className={`card p-3 flex items-center gap-3 ${i < 3 ? 'border-zeal-500/20' : ''}`}>
                <div className={`w-8 text-center font-bold ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-orange-400' : 'text-gray-600'}`}>
                  {i + 1}
                </div>
                <Avatar src={p.avatar_url} alt={p.full_name} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white text-sm truncate">{p.full_name}</p>
                  <p className="text-xs text-gray-500">@{p.username}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-zeal-500 text-sm">{formatNumber(getScoreValue(p))}</p>
                  <p className="text-[10px] text-gray-600">smart</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
