import { Route, Routes, useLocation } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import Dashboard from './pages/Dashboard'
import Tracks from './pages/Tracks'
import TrackDetail from './pages/TrackDetail'
import CourseDetail from './pages/CourseDetail'
import StudySession from './pages/StudySession'
import MasteryMap from './pages/MasteryMap'
import TrackTest from './pages/TrackTest'
import Settings from './pages/Settings'
import Flashcards from './exercises/Flashcards'
import Quiz from './exercises/Quiz'
import FillBlank from './exercises/FillBlank'
import DatasetChallenge from './exercises/DatasetChallenge'
import MatchingGame from './exercises/MatchingGame'
import BossBattle from './exercises/BossBattle'

const routeTitles = [
  { pattern: /^\/$/, title: 'Dashboard' },
  { pattern: /^\/tracks$/, title: 'My Tracks' },
  { pattern: /^\/tracks\/[^/]+$/, title: 'Track Detail' },
  { pattern: /^\/courses\/[^/]+$/, title: 'Course Detail' },
  { pattern: /^\/study-session$/, title: 'Study Session' },
  { pattern: /^\/mastery-map$/, title: 'Mastery Map' },
  { pattern: /^\/track-test\/[^/]+$/, title: 'Track Test' },
  { pattern: /^\/settings$/, title: 'Settings' },
  { pattern: /^\/exercise\/flashcards\/[^/]+$/, title: 'Flashcards' },
  { pattern: /^\/exercise\/quiz\/[^/]+$/, title: 'Quiz' },
  { pattern: /^\/exercise\/fillblank\/[^/]+$/, title: 'Fill in the Blank' },
  { pattern: /^\/exercise\/dataset\/[^/]+$/, title: 'Dataset Challenge' },
  { pattern: /^\/exercise\/matching\/[^/]+$/, title: 'Matching Game' },
  { pattern: /^\/exercise\/boss\/[^/]+$/, title: 'Boss Battle' },
]

function getPageTitle(pathname) {
  return routeTitles.find((route) => route.pattern.test(pathname))?.title ?? 'DC Mastery Hub'
}

export default function App() {
  const location = useLocation()
  const title = getPageTitle(location.pathname)

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Sidebar />
      <TopBar title={title} />
      <main className="ml-[240px] h-screen overflow-y-auto px-8 pb-8 pt-[88px]">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/tracks" element={<Tracks />} />
          <Route path="/tracks/:trackSlug" element={<TrackDetail />} />
          <Route path="/courses/:courseSlug" element={<CourseDetail />} />
          <Route path="/study-session" element={<StudySession />} />
          <Route path="/mastery-map" element={<MasteryMap />} />
          <Route path="/track-test/:trackSlug" element={<TrackTest />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/exercise/flashcards/:courseSlug" element={<Flashcards />} />
          <Route path="/exercise/quiz/:courseSlug" element={<Quiz />} />
          <Route path="/exercise/fillblank/:courseSlug" element={<FillBlank />} />
          <Route path="/exercise/dataset/:courseSlug" element={<DatasetChallenge />} />
          <Route path="/exercise/matching/:courseSlug" element={<MatchingGame />} />
          <Route path="/exercise/boss/:courseSlug" element={<BossBattle />} />
        </Routes>
      </main>
    </div>
  )
}
