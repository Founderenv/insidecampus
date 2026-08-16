import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Sidebar } from '@/components/Sidebar'
import { BottomNav } from '@/components/BottomNav'
import { LoadingScreen } from '@/pages/LoadingScreen'

import { Login } from '@/pages/Login'
import { Onboarding } from '@/pages/Onboarding'
import { Home } from '@/pages/Home'
import { Campus } from '@/pages/Campus'
import { Profile } from '@/pages/Profile'
import { Settings } from '@/pages/Settings'
import { Gossip } from '@/pages/Gossip'
import { Confessions } from '@/pages/Confessions'
import { Teachers } from '@/pages/Teachers'
import { TeacherDetail } from '@/pages/TeacherDetail'
import { Events } from '@/pages/Events'
import { Clubs } from '@/pages/Clubs'
import { Chat } from '@/pages/Chat'
import { Messages } from '@/pages/Messages'
import { Match } from '@/pages/Match'
import { Games } from '@/pages/Games'
import { Smart } from '@/pages/Smart'
import { Rankings } from '@/pages/Rankings'
import { Projects } from '@/pages/Projects'
import { Marketplace } from '@/pages/Marketplace'
import { LostFound } from '@/pages/LostFound'
import { Nearby } from '@/pages/Nearby'
import { Builders } from '@/pages/Builders'
import { Notifications } from '@/pages/Notifications'
import { Requests } from '@/pages/Requests'
import { Create } from '@/pages/Create'
import { NotFound } from '@/pages/NotFound'
import { PostDetail } from '@/pages/PostDetail'
import { EditProfile } from '@/pages/EditProfile'
import Resources from '@/pages/Resources'

function AuthErrorScreen() {
  const { error, retry, signOut } = useAuth()
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-ink-950 px-6 gap-6">
      <div className="card p-8 max-w-sm w-full text-center">
        <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-white mb-2">Sign-in couldn't be completed</h2>
        <p className="text-sm text-gray-400 mb-6">{error || 'Something went wrong. Please try again.'}</p>
        <div className="flex gap-3">
          <button onClick={retry} className="flex-1 btn-primary py-3 text-sm">Try Again</button>
          <button onClick={signOut} className="flex-1 btn-secondary py-3 text-sm">Sign Out</button>
        </div>
      </div>
    </div>
  )
}

function ProtectedRoutes() {
  const { user, profile, loading, error } = useAuth()

  if (loading) return <LoadingScreen />
  if (error) return <AuthErrorScreen />
  if (!user) return <Navigate to="/login" replace />
  if (profile && !profile.onboarding_completed) return <Navigate to="/onboarding" replace />

  return (
    <div className="min-h-screen flex bg-ink-950">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <main className="flex-1 min-h-0 overflow-y-auto pb-20 lg:pb-0">
          <div className="mx-auto w-full max-w-[760px] px-4 py-4 lg:px-6">
            <Routes>
              <Route path="/home" element={<Home />} />
              <Route path="/explore" element={<Navigate to="/home" replace />} />
              <Route path="/campus" element={<Campus />} />
              <Route path="/gossip" element={<Gossip />} />
              <Route path="/confessions" element={<Confessions />} />
              <Route path="/teachers" element={<Teachers />} />
              <Route path="/teachers/:id" element={<TeacherDetail />} />
              <Route path="/events" element={<Events />} />
              <Route path="/events/:id" element={<Events />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/match" element={<Match />} />
              <Route path="/games" element={<Games />} />
              <Route path="/smart" element={<Smart />} />
              <Route path="/rankings" element={<Rankings />} />
              <Route path="/clubs" element={<Clubs />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/marketplace" element={<Marketplace />} />
              <Route path="/lost-found" element={<LostFound />} />
              <Route path="/nearby" element={<Nearby />} />
              <Route path="/nearby/:id" element={<Nearby />} />
              <Route path="/nearby/l/:lid" element={<Nearby />} />
              <Route path="/builders" element={<Builders />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/requests" element={<Requests />} />
              <Route path="/create" element={<Create />} />
              <Route path="/post/:id" element={<PostDetail />} />
              <Route path="/edit-profile" element={<EditProfile />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/resources" element={<Navigate to="/home" replace />} />
              <Route path="/resources-learn" element={<Resources />} />
              <Route path="/profile/:username" element={<Profile />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/" element={<Navigate to="/home" replace />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </main>
        <BottomNav />
      </div>
    </div>
  )
}

export default function App() {
  const { loading, error } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/*" element={loading ? <LoadingScreen /> : error ? <AuthErrorScreen /> : <ProtectedRoutes />} />
    </Routes>
  )
}
