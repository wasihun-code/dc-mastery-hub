import React, { useState, useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import Login from './components/Login'
import Signup from './components/Signup'
import Dashboard from './pages/Dashboard'
import Tracks from './pages/Tracks'
import CourseDetail from './pages/CourseDetail'
import StudySession from './pages/StudySession'
import MasteryMap from './pages/MasteryMap'
import ManageContent from './pages/ManageContent'
import Settings from './pages/Settings'
import Flashcards from './exercises/Flashcards'
import Quiz from './exercises/Quiz'
import FillBlank from './exercises/FillBlank'
import DatasetChallenge from './exercises/DatasetChallenge'
import MatchingGame from './exercises/MatchingGame'
import BossBattle from './exercises/BossBattle'
import TrackTest from './pages/TrackTest'
import WranglingSpeedrun from './pages/WranglingSpeedrun'
import CapstoneBattleSelection from './pages/CapstoneBattleSelection'
import ManageCourseDetail from './pages/ManageCourseDetail'
import IncorrectReview from './exercises/IncorrectReview'
import { ErrorBoundary } from './components/ErrorBoundary.jsx'

const routeTitles = [
  { pattern: /^\/$/, title: 'Dashboard' },
  { pattern: /^\/courses$/, title: 'My Courses' },
  { pattern: /^\/courses\/[^/]+$/, title: 'Course Detail' },
  { pattern: /^\/study-session$/, title: 'Study Session' },
  { pattern: /^\/speedrun$/, title: 'Wrangling Speedrun' },
  { pattern: /^\/capstone$/, title: 'Capstone Battle' },
  { pattern: /^\/mastery-map$/, title: 'Mastery Map' },
  { pattern: /^\/manage$/, title: 'Content Manager' },
  { pattern: /^\/manage\/courses\/[^/]+$/, title: 'Manage Course' },
  { pattern: /^\/settings$/, title: 'Settings' },
  { pattern: /^\/exercise\/flashcards\/[^/]+$/, title: 'Flashcards' },
  { pattern: /^\/exercise\/quiz\/[^/]+$/, title: 'Quiz' },
  { pattern: /^\/exercise\/fillblank\/[^/]+$/, title: 'Fill in the Blank' },
  { pattern: /^\/exercise\/dataset\/[^/]+$/, title: 'Dataset Challenge' },
  { pattern: /^\/exercise\/matching\/[^/]+$/, title: 'Matching Game' },
  { pattern: /^\/exercise\/boss\/[^/]+$/, title: 'Boss Battle' },
  { pattern: /^\/track-test\/[^/]+$/, title: 'Capstone Track Test' },
]

function getPageTitle(pathname) {
  return routeTitles.find((route) => route.pattern.test(pathname))?.title ?? 'DC Mastery Hub'
}

export default function App() {
  const location = useLocation()
  const title = getPageTitle(location.pathname)

  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authState, setAuthState] = useState('login') // 'login' or 'signup'
  
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    return parseInt(localStorage.getItem('sidebarWidth')) || 240
  })

  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-width', `${sidebarWidth}px`)
    localStorage.setItem('sidebarWidth', sidebarWidth)
  }, [sidebarWidth])

  const checkSession = async () => {
    // ... rest of checkSession ...
    try {
      const res = await fetch('/api/auth/session')
      const data = await res.json()
      if (res.ok && data.authenticated) {
        setUser(data.user)
      } else {
        setUser(null)
        if (data.code === 'NO_USERS') {
          setAuthState('signup')
        } else {
          setAuthState('login')
        }
      }
    } catch (err) {
      console.error('Error checking session:', err)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkSession()
  }, [])

  const handleAuthSuccess = () => {
    checkSession()
  }

  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' })
      if (res.ok) {
        setUser(null)
        setAuthState('login')
      }
    } catch (err) {
      console.error('Logout failed:', err)
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-black select-none z-[300]">
        {/* Dynamic Animated Ambient Background */}
        <div className="absolute inset-0 opacity-25 pointer-events-none overflow-hidden">
          <div className="absolute top-1/3 left-1/3 w-[300px] h-[300px] bg-[#03ef62] rounded-full blur-[120px] animate-pulse"></div>
        </div>
        <div className="relative z-10 flex flex-col items-center">
          <div className="relative flex items-center justify-center w-20 h-20 mb-6">
            <div className="absolute inset-0 rounded-full border-4 border-[#03ef62]/10 border-t-[#03ef62] animate-spin"></div>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#03ef62]/5 text-[#03ef62] border border-[#03ef62]/20">
              <span className="text-xl font-black italic tracking-tighter">DC</span>
            </div>
          </div>
          <div className="text-xs font-bold text-[#03ef62] uppercase tracking-widest animate-pulse">Initializing System</div>
          <div className="mt-1 text-sm font-semibold text-zinc-500">Checking authorization...</div>
        </div>
      </div>
    )
  }

  if (!user) {
    if (authState === 'signup') {
      return (
        <Signup
          onSignupSuccess={handleAuthSuccess}
          onNavigateToLogin={() => setAuthState('login')}
        />
      )
    } else {
      return (
        <Login
          onLoginSuccess={handleAuthSuccess}
          onNavigateToSignup={() => setAuthState('signup')}
        />
      )
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <ErrorBoundary context="Sidebar failed to load" fallback={(error, reset) => (
        <div style={{ width: '160px', background: 'var(--bg-sidebar)' }}>
          <a href="/" style={{ color: 'var(--text-primary)', padding: '16px', display: 'block' }}>← Home</a>
        </div>
      )}>
        <Sidebar user={user} onLogout={handleLogout} sidebarWidth={sidebarWidth} setSidebarWidth={setSidebarWidth} />
      </ErrorBoundary>
      <TopBar title={title} />
      <main 
        className="transition-all duration-300 h-screen overflow-y-auto px-4 md:px-8 pb-8 pt-[88px]"
        style={{ marginLeft: 'var(--sidebar-width)' }}
      >
        <Routes>
          <Route path="/" element={<ErrorBoundary context="Dashboard failed to load"><Dashboard /></ErrorBoundary>} />
          <Route path="/courses" element={<ErrorBoundary context="Courses page failed to load"><Tracks /></ErrorBoundary>} />
          <Route path="/courses/:courseSlug" element={<ErrorBoundary context="Course detail failed to load"><CourseDetail /></ErrorBoundary>} />
          <Route path="/study-session" element={<ErrorBoundary context="Study session failed to load"><StudySession /></ErrorBoundary>} />
          <Route path="/speedrun" element={<ErrorBoundary context="Speedrun failed to load"><WranglingSpeedrun /></ErrorBoundary>} />
          <Route path="/capstone" element={<ErrorBoundary context="Capstone battle failed to load"><CapstoneBattleSelection /></ErrorBoundary>} />
          <Route path="/mastery-map" element={<ErrorBoundary context="Mastery map failed to load"><MasteryMap /></ErrorBoundary>} />
          <Route path="/manage" element={<ErrorBoundary context="Content manager failed to load"><ManageContent /></ErrorBoundary>} />
          <Route path="/manage/courses/:courseSlug" element={<ErrorBoundary context="Manage course failed to load"><ManageCourseDetail /></ErrorBoundary>} />
          <Route path="/settings" element={<ErrorBoundary context="Settings failed to load"><Settings /></ErrorBoundary>} />
          <Route path="/exercise/flashcards/:courseSlug" element={<ErrorBoundary context="Flashcards exercise failed"><Flashcards /></ErrorBoundary>} />
          <Route path="/exercise/quiz/:courseSlug" element={<ErrorBoundary context="Quiz exercise failed"><Quiz /></ErrorBoundary>} />
          <Route path="/exercise/fillblank/:courseSlug" element={<ErrorBoundary context="Fill in the blank exercise failed"><FillBlank /></ErrorBoundary>} />
          <Route path="/exercise/dataset/:courseSlug" element={<ErrorBoundary context="Dataset challenge failed"><DatasetChallenge /></ErrorBoundary>} />
          <Route path="/exercise/matching/:courseSlug" element={<ErrorBoundary context="Matching game failed"><MatchingGame /></ErrorBoundary>} />
          <Route path="/exercise/boss/:courseSlug" element={<ErrorBoundary context="Boss battle failed"><BossBattle /></ErrorBoundary>} />
          <Route path="/exercise/review/:courseSlug" element={<ErrorBoundary context="Incorrect review failed"><IncorrectReview /></ErrorBoundary>} />
          <Route path="/track-test/:trackSlug" element={<ErrorBoundary context="Track test failed"><TrackTest /></ErrorBoundary>} />
        </Routes>
      </main>
    </div>
  )
}
