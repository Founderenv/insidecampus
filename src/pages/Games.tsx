import { useState, useEffect, useRef } from 'react'
import { Gamepad2, Zap, Brain, Timer, MousePointerClick, Trophy } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { saveGameScore, fetchGameScores } from '@/lib/data'
import type { GameScore } from '@/types'

const games = [
  { id: 'reaction', name: 'Reaction Test', desc: 'Test your reflexes', icon: Zap, color: 'text-yellow-400' },
  { id: 'memory', name: 'Memory Game', desc: 'Match the pairs', icon: Brain, color: 'text-purple-400' },
  { id: 'quiz', name: 'Tech Quiz', desc: 'Test your knowledge', icon: Timer, color: 'text-blue-400' },
]

export function Games() {
  const { profile } = useAuth()
  const [activeGame, setActiveGame] = useState<string | null>(null)
  const [scores, setScores] = useState<GameScore[]>([])

  useEffect(() => {
    if (profile) {
      fetchGameScores(profile.id).then(setScores).catch(() => {})
    }
  }, [profile])

  const getBest = (gameType: string) => scores.find((s) => s.game_type === gameType)

  function refreshScores() {
    if (profile) fetchGameScores(profile.id).then(setScores).catch(() => {})
  }

  if (activeGame === 'reaction') return <ReactionGame onBack={() => setActiveGame(null)} userId={profile?.id} onScoreSaved={refreshScores} />
  if (activeGame === 'memory') return <MemoryGame onBack={() => setActiveGame(null)} userId={profile?.id} onScoreSaved={refreshScores} />
  if (activeGame === 'quiz') return <QuizGame onBack={() => setActiveGame(null)} userId={profile?.id} onScoreSaved={refreshScores} />

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-display font-bold text-white mb-1 flex items-center gap-2">
          <Gamepad2 className="w-7 h-7 text-purple-400" /> Zeal Games
        </h1>
        <p className="text-gray-500 text-sm">Play games, earn XP, climb the leaderboard.</p>
      </div>

      {profile && (
        <div className="card p-4 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-zeal-500/10 flex items-center justify-center">
            <span className="text-2xl font-bold text-zeal-500">{profile.game_level}</span>
          </div>
          <div>
            <p className="text-xs text-gray-500">Level</p>
            <p className="font-bold text-white">Level {profile.game_level}</p>
            <p className="text-xs text-gray-500">{profile.game_xp.toLocaleString()} XP</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3">
        {games.map((g) => {
          const Icon = g.icon
          const best = getBest(g.id)
          return (
            <button
              key={g.id}
              onClick={() => setActiveGame(g.id)}
              className="card card-hover p-4 flex items-center gap-4 text-left"
            >
              <div className={`w-12 h-12 rounded-xl bg-ink-800 flex items-center justify-center ${g.color}`}>
                <Icon className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-white">{g.name}</p>
                <p className="text-xs text-gray-500">{g.desc}</p>
              </div>
              <div className="text-right">
                {best ? (
                  <>
                    <p className="text-xs text-gray-400 flex items-center gap-1 justify-end">
                      <Trophy className="w-3 h-3" /> {best.best_score}
                    </p>
                    <p className="text-[10px] text-gray-600">{best.plays} plays</p>
                  </>
                ) : (
                  <p className="text-xs text-gray-600">No plays yet</p>
                )}
              </div>
              <MousePointerClick className="w-5 h-5 text-gray-600" />
            </button>
          )
        })}
      </div>
    </div>
  )
}

function GameHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <button onClick={onBack} className="text-gray-400 hover:text-white text-sm">← Back</button>
      <h2 className="text-xl font-display font-bold text-white">{title}</h2>
    </div>
  )
}

function ReactionGame({ onBack, userId, onScoreSaved }: { onBack: () => void; userId?: string; onScoreSaved: () => void }) {
  const [state, setState] = useState<'idle' | 'waiting' | 'ready' | 'result'>('idle')
  const [startTime, setStartTime] = useState(0)
  const [reaction, setReaction] = useState(0)
  const [best, setBest] = useState<number | null>(null)

  const start = () => {
    setState('waiting')
    const delay = 1500 + Math.random() * 3000
    setTimeout(() => {
      setState('ready')
      setStartTime(Date.now())
    }, delay)
  }

  const handleClick = async () => {
    if (state === 'waiting') {
      setState('idle')
    } else if (state === 'ready') {
      const time = Date.now() - startTime
      setReaction(time)
      setState('result')
      if (best === null || time < best) setBest(time)
      const score = Math.max(0, 1000 - time)
      const xp = Math.max(5, Math.floor(score / 10))
      if (userId) {
        await saveGameScore(userId, 'reaction', score, xp)
        onScoreSaved()
      }
    }
  }

  return (
    <div>
      <GameHeader title="Reaction Test" onBack={onBack} />
      <div
        onClick={state === 'idle' ? start : handleClick}
        className={`cursor-pointer rounded-2xl h-64 flex flex-col items-center justify-center transition-colors ${
          state === 'waiting'
            ? 'bg-rose-500/20 border-2 border-rose-500/40'
            : state === 'ready'
              ? 'bg-zeal-500/20 border-2 border-zeal-500/40'
              : 'bg-ink-800 border border-ink-700'
        }`}
      >
        {state === 'idle' && <p className="text-gray-400">Click to start</p>}
        {state === 'waiting' && <p className="text-rose-400 font-semibold">Wait for green...</p>}
        {state === 'ready' && <p className="text-zeal-500 font-bold text-xl">CLICK!</p>}
        {state === 'result' && (
          <div className="text-center">
            <p className="text-3xl font-bold text-white">{reaction}ms</p>
            {best !== null && <p className="text-sm text-gray-500 mt-1">Best: {best}ms</p>}
            <p className="text-xs text-gray-600 mt-2">Click to try again</p>
          </div>
        )}
      </div>
    </div>
  )
}

function MemoryGame({ onBack, userId, onScoreSaved }: { onBack: () => void; userId?: string; onScoreSaved: () => void }) {
  const emojis = ['🎮', '🚀', '🤖', '⚡', '🎯', '💡']
  const [cards, setCards] = useState<{ emoji: string; flipped: boolean; matched: boolean }[]>([])
  const [flipped, setFlipped] = useState<number[]>([])
  const [moves, setMoves] = useState(0)
  const [won, setWon] = useState(false)

  const init = () => {
    const shuffled = [...emojis, ...emojis]
      .sort(() => Math.random() - 0.5)
      .map((e) => ({ emoji: e, flipped: false, matched: false }))
    setCards(shuffled)
    setFlipped([])
    setMoves(0)
    setWon(false)
  }

  useEffect(() => {
    init()
  }, [])

  const flip = (idx: number) => {
    if (flipped.length === 2 || cards[idx].flipped || cards[idx].matched) return
    const newCards = [...cards]
    newCards[idx].flipped = true
    setCards(newCards)
    const newFlipped = [...flipped, idx]
    setFlipped(newFlipped)

    if (newFlipped.length === 2) {
      setMoves((m) => m + 1)
      const [a, b] = newFlipped
      if (cards[a].emoji === cards[b].emoji) {
        setTimeout(() => {
          setCards((prev) => {
            const updated = [...prev]
            updated[a].matched = true
            updated[b].matched = true
            if (updated.every((c) => c.matched)) {
              setWon(true)
              const score = Math.max(0, 100 - moves * 5)
              if (userId) {
                saveGameScore(userId, 'memory', score, 20).then(onScoreSaved)
              }
            }
            return updated
          })
          setFlipped([])
        }, 500)
      } else {
        setTimeout(() => {
          setCards((prev) => {
            const updated = [...prev]
            updated[a].flipped = false
            updated[b].flipped = false
            return updated
          })
          setFlipped([])
        }, 1000)
      }
    }
  }

  return (
    <div>
      <GameHeader title="Memory Game" onBack={onBack} />
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-400">Moves: {moves}</p>
        <button onClick={init} className="btn-secondary text-xs">Restart</button>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {cards.map((c, i) => (
          <button
            key={i}
            onClick={() => flip(i)}
            className={`aspect-square rounded-xl flex items-center justify-center text-2xl transition-all ${
              c.flipped || c.matched ? 'bg-ink-700' : 'bg-ink-800 border border-ink-700'
            } ${c.matched ? 'opacity-50' : ''}`}
          >
            {c.flipped || c.matched ? c.emoji : ''}
          </button>
        ))}
      </div>
      {won && (
        <div className="card p-6 text-center mt-4 animate-scale-in">
          <p className="text-xl font-bold text-zeal-500">You won in {moves} moves!</p>
          <button onClick={init} className="btn-primary mt-3 text-sm">Play again</button>
        </div>
      )}
    </div>
  )
}

const QUIZ_QUESTIONS = [
  { q: 'What does CSS stand for?', options: ['Computer Style Sheets', 'Cascading Style Sheets', 'Creative Style System', 'Colorful Style Sheets'], correct: 1 },
  { q: 'Which is NOT a programming language?', options: ['Python', 'Java', 'HTTP', 'Rust'], correct: 2 },
  { q: 'What is the time complexity of accessing an array element by index?', options: ['O(n)', 'O(log n)', 'O(1)', 'O(n²)'], correct: 2 },
  { q: 'Which data structure uses FIFO?', options: ['Stack', 'Queue', 'Tree', 'Graph'], correct: 1 },
  { q: 'What does SQL stand for?', options: ['Simple Query Language', 'Structured Query Language', 'Standard Query Logic', 'System Query Language'], correct: 1 },
]

function QuizGame({ onBack, userId, onScoreSaved }: { onBack: () => void; userId?: string; onScoreSaved: () => void }) {
  const [current, setCurrent] = useState(0)
  const [score, setScore] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [finished, setFinished] = useState(false)
  const scoreRef = useRef(0)

  const answer = (idx: number) => {
    if (selected !== null) return
    setSelected(idx)
    const isCorrect = idx === QUIZ_QUESTIONS[current].correct
    if (isCorrect) {
      scoreRef.current += 1
      setScore((s) => s + 1)
    }
    setTimeout(() => {
      if (current + 1 < QUIZ_QUESTIONS.length) {
        setCurrent((c) => c + 1)
        setSelected(null)
      } else {
        setFinished(true)
        const finalScore = scoreRef.current
        const gameScore = finalScore * 20
        const xp = finalScore * 10
        if (userId) {
          saveGameScore(userId, 'quiz', gameScore, xp).then(onScoreSaved)
        }
      }
    }, 1000)
  }

  const restart = () => {
    setCurrent(0)
    setScore(0)
    scoreRef.current = 0
    setSelected(null)
    setFinished(false)
  }

  if (finished) {
    return (
      <div>
        <GameHeader title="Tech Quiz" onBack={onBack} />
        <div className="card p-6 text-center">
          <p className="text-3xl font-bold text-zeal-500">{score}/{QUIZ_QUESTIONS.length}</p>
          <p className="text-sm text-gray-500 mt-1">Correct answers</p>
          <button onClick={restart} className="btn-primary mt-4 text-sm">Play again</button>
        </div>
      </div>
    )
  }

  const q = QUIZ_QUESTIONS[current]
  return (
    <div>
      <GameHeader title="Tech Quiz" onBack={onBack} />
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-400">Question {current + 1}/{QUIZ_QUESTIONS.length}</p>
        <p className="text-sm text-zeal-500">Score: {score}</p>
      </div>
      <div className="card p-5">
        <p className="text-white font-medium mb-4">{q.q}</p>
        <div className="space-y-2">
          {q.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => answer(i)}
              disabled={selected !== null}
              className={`w-full p-3.5 rounded-xl border text-sm font-medium text-left transition-all ${
                selected === null
                  ? 'bg-ink-800 border-ink-700 text-gray-300 hover:border-ink-600'
                  : i === q.correct
                    ? 'bg-zeal-500/15 border-zeal-500/40 text-zeal-400'
                    : selected === i
                      ? 'bg-rose-500/15 border-rose-500/40 text-rose-400'
                      : 'bg-ink-800 border-ink-700 text-gray-500'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
