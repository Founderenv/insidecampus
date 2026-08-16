import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { isPreviewMode } from '@/lib/preview'
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
import { Builders } from '@/pages/Builders'
import { Notifications } from '@/pages/Notifications'
import { Create } from '@/pages/Create'
import { NotFound } from '@/pages/NotFound'
import { PostDetail } from '@/pages/PostDetail'
import { EditProfile } from '@/pages/EditProfile'
import Resources from '@/pages/Resources'

function ProtectedRoutes() {
  const { user, profile, loading } = useAuth()

  if (loading && !isPreviewMode) return <LoadingScreen />
  if (!user && !isPreviewMode) return <Navigate to="/login" replace />
  if (!isPreviewMode && !profile?.onboarding_completed) return <Navigate to="/onboarding" replace />

  return (
    <div className="min-h-screen flex bg-ink-950">
      {isPreviewMode && (
        <div className="fixed top-2 right-2 z-50 px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[10px] font-mono">
          PREVIEW
        </div>
      )}
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
              <Route path="/builders" element={<Builders />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/create" element={<Create />} />
              <Route path="/post/:id" element={<PostDetail />} />
              <Route path="/edit-profile" element={<EditProfile />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/resources" element={<Navigate to="/home" replace />} />
              <Route path="/resources-learn" element={<Resources />} />
              <Route path="/profile/:username" element={<Profile />} />
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
  const { loading } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/*" element={loading ? <LoadingScreen /> : <ProtectedRoutes />} />
    </Routes>
  )
}
