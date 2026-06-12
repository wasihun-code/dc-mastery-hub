import { Route, Routes, useLocation } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
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

const routeTitles = [
  { pattern: /^\/$/, title: 'Dashboard' },
  { pattern: /^\/courses$/, title: 'My Courses' },
  { pattern: /^\/courses\/[^/]+$/, title: 'Course Detail' },
  { pattern: /^\/study-session$/, title: 'Study Session' },
  { pattern: /^\/speedrun$/, title: 'Wrangling Speedrun' },
  { pattern: /^\/capstone$/, title: 'Capstone Battle' },
  { pattern: /^\/mastery-map$/, title: 'Mastery Map' },
  { pattern: /^\/manage$/, title: 'Content Manager' },
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

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Sidebar />
      <TopBar title={title} />
      <main className="ml-16 md:ml-[240px] transition-all duration-300 h-screen overflow-y-auto px-4 md:px-8 pb-8 pt-[88px]">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/courses" element={<Tracks />} />
          <Route path="/courses/:courseSlug" element={<CourseDetail />} />
          <Route path="/study-session" element={<StudySession />} />
          <Route path="/speedrun" element={<WranglingSpeedrun />} />
          <Route path="/capstone" element={<CapstoneBattleSelection />} />
          <Route path="/mastery-map" element={<MasteryMap />} />
          <Route path="/manage" element={<ManageContent />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/exercise/flashcards/:courseSlug" element={<Flashcards />} />
          <Route path="/exercise/quiz/:courseSlug" element={<Quiz />} />
          <Route path="/exercise/fillblank/:courseSlug" element={<FillBlank />} />
          <Route path="/exercise/dataset/:courseSlug" element={<DatasetChallenge />} />
          <Route path="/exercise/matching/:courseSlug" element={<MatchingGame />} />
          <Route path="/exercise/boss/:courseSlug" element={<BossBattle />} />
          <Route path="/track-test/:trackSlug" element={<TrackTest />} />
        </Routes>
      </main>
    </div>
  )
}
