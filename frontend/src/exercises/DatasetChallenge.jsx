import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { datasetChallengeFeedback, triggerCorrectFeedback, triggerWrongFeedback, triggerSuccessFeedback } from '../services/feedbackService'
import { ChevronLeft, ChevronDown, ChevronUp, CheckCircle2, XCircle, Award, Terminal as TerminalIcon, RotateCcw, ArrowRight, Database, History, SkipForward, Trash2, Edit2, Eye, Lightbulb, X } from 'lucide-react'
import Editor from '@monaco-editor/react'
import { getSessionLimit, getTimerEnabled, getTimerDuration } from '../services/settingsService'
import EditQuestionModal from '../components/EditQuestionModal'
import ExerciseTimer from '../components/ExerciseTimer'

export default function DatasetChallenge() {
  const { courseSlug } = useParams()
  const navigate = useNavigate()
  const [challenges, setChallenges] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [code, setCode] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState(null)
  const [hintsShown, setHintsShown] = useState([false, false])
  const [sessionScore, setSessionScore] = useState({ correct: 0, total: 0 })
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState(null)
  const [course, setCourse] = useState(null)
  const [activeFile, setActiveFile] = useState('script')
  const [solutionUnlocked, setSolutionUnlocked] = useState(false)
  const [showSolutionModal, setShowSolutionModal] = useState(false)
  const [loadingExpectedOutput, setLoadingExpectedOutput] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState(null)
  const [timerEnabled] = useState(() => getTimerEnabled('dataset'))
  const [timerDuration] = useState(() => getTimerDuration('dataset'))
  const [timerExpired, setTimerExpired] = useState(false)

  // Mobile tab state
  const [mobileTab, setMobileTab] = useState('problem')

  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024)
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const mq = window.matchMedia('(min-width: 1024px)')
    const handler = (e) => setIsDesktop(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // Console panel states
  const [consoleTab, setConsoleTab] = useState('console')
  const [lastRun, setLastRun] = useState(null)
  const [runHistory, setRunHistory] = useState([])
  const [snippetInput, setSnippetInput] = useState('')
  const [snippetHistory, setSnippetHistory] = useState([])
  const [snippetHistoryIndex, setSnippetHistoryIndex] = useState(-1)

  const terminalEndRef = useRef(null)
  const snippetInputRef = useRef(null)
  const codeRef = useRef(code)
  const handleRunRef = useRef(handleRun)
  const handleSubmitRef = useRef(handleSubmit)
  const activeFileRef = useRef(activeFile)

  const [terminalHeight, setTerminalHeight] = useState(250)
  const [leftWidth, setLeftWidth] = useState(38)
  const [consoleVisible, setConsoleVisible] = useState(true)
  const isResizingRef = useRef(false)
  const rightPanelRef = useRef(null)
  const isDragging = useRef(false)
  const containerRef = useRef(null)

  function getUserCodePortion(starterCode) {
    const lines = starterCode.split('\n')
    let i = 0
    while (i < lines.length) {
      const trimmed = lines[i].trim()
      if (trimmed === '' || trimmed.startsWith('#')) {
        i++
      } else {
        break
      }
    }
    return lines.slice(i).join('\n').trimStart()
  }

  const generatePreLoadedComments = useCallback((challenge) => {
    if (!challenge?.pre_loaded_data) return ''
    const lines = ['# Pre-loaded variables available in your script:']
    for (const [key, val] of Object.entries(challenge.pre_loaded_data)) {
      let typeHint = val.type || 'unknown'
      if (val.type === 'csv') typeHint = 'DataFrame (from ' + (val.path || 'csv') + ')'
      else if (val.type === 'csv_column') typeHint = 'numpy array (column from ' + (val.path || 'csv') + ')'
      else if (val.type === 'csv_list') typeHint = 'list (column from ' + (val.path || 'csv') + ')'
      else if (val.type === 'pickle') typeHint = 'pickle object (from ' + (val.path || 'pkl') + ')'
      else if (val.type === 'sqlite') typeHint = 'sqlite3.Connection'
      else if (val.type === 'dataframe') typeHint = 'DataFrame'
      else if (val.type === 'value') typeHint = typeof val.data
      lines.push('# ' + key + ' : ' + typeHint)
    }
    return lines.join('\n') + '\n'
  }, [])

  const handleMouseDown = (e) => {
    e.preventDefault()
    isResizingRef.current = true
    document.body.style.cursor = 'row-resize'
    document.body.style.userSelect = 'none'
  }

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizingRef.current) return
      if (rightPanelRef.current) {
        const rect = rightPanelRef.current.getBoundingClientRect()
        let newHeight = rect.bottom - e.clientY
        const minHeight = 120
        const maxHeight = rect.height - 150
        if (newHeight < minHeight) newHeight = minHeight
        if (newHeight > maxHeight) newHeight = maxHeight
        setTerminalHeight(newHeight)
      }
    }

    const handleMouseUp = () => {
      if (isResizingRef.current) {
        isResizingRef.current = false
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  useEffect(() => {
    codeRef.current = code
  }, [code])

  useEffect(() => {
    activeFileRef.current = activeFile
  }, [activeFile])

  useEffect(() => {
    handleRunRef.current = handleRun
  }, [handleRun])

  useEffect(() => {
    handleSubmitRef.current = handleSubmit
  }, [handleSubmit])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey) {
        if (e.shiftKey && e.key === 'Enter') {
          e.preventDefault()
          handleSubmitRef.current()
        } else if (e.key === 'Enter') {
          e.preventDefault()
          handleRunRef.current()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  // Splitter mouse handlers
  const onDividerMouseDown = (e) => {
    isDragging.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    e.preventDefault()
  }

  useEffect(() => {
    const onMouseMove = (e) => {
      if (!isDragging.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const newLeftPercent = ((e.clientX - rect.left) / rect.width) * 100
      setLeftWidth(Math.min(65, Math.max(25, newLeftPercent)))
    }
    const onMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  useEffect(() => {
    const handler = (e) => {
      if (e.ctrlKey && e.key === 'j') {
        e.preventDefault()
        toggleConsole()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [lastRun, consoleTab, currentIndex, snippetHistory])

  useEffect(() => {
    if (consoleTab === 'console' && snippetInputRef.current) {
      snippetInputRef.current.focus()
    }
  }, [consoleTab])

  const fetchExpectedOutput = async (challenge, index) => {
    if (!challenge) return
    if (challenge.expected_output) return

    setLoadingExpectedOutput(true)
    const expectedCode = challenge.solution_code || challenge.expected_output_code
    if (!expectedCode) {
      setLoadingExpectedOutput(false)
      return
    }

    try {
      const res = await fetch('/api/content/run-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          solution_code: expectedCode,
          courseSlug,
          challenge_id: challenge.id
        })
      })
      const data = await res.json()
      if (!data.stderr) {
        setChallenges(prev => {
          const updated = [...prev]
          if (updated[index]) {
            updated[index] = {
              ...updated[index],
              expected_output: data.stdout
            }
          }
          return updated
        })
      } else {
        setChallenges(prev => {
          const updated = [...prev]
          if (updated[index]) {
            updated[index] = {
              ...updated[index],
              expected_output: `Error generating expected output:\n${data.stderr}`
            }
          }
          return updated
        })
      }
    } catch (err) {
      console.error('Failed to generate expected output:', err)
    } finally {
      setLoadingExpectedOutput(false)
    }
  }

  useEffect(() => {
    if (challenges.length > 0 && currentIndex < challenges.length) {
      setTimerExpired(false)
      const currentChallenge = challenges[currentIndex]
      fetchExpectedOutput(currentChallenge, currentIndex)
      setLastRun(null)
      setRunHistory([])
      setSnippetInput('')
      setSnippetHistory([])
      setSnippetHistoryIndex(-1)
    }
  }, [currentIndex, challenges])

  const handleEditorDidMount = (editor, monaco) => {
    monaco.editor.defineTheme('dc-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: 'FF60B5', fontStyle: 'bold' },
        { token: 'string', foreground: '03EF62' },
        { token: 'comment', foreground: '03EF62', fontStyle: 'italic' },
        { token: 'number', foreground: '60A5FA' },
        { token: 'type', foreground: '8BE9FD' },
        { token: 'class', foreground: '50FA7B' },
        { token: 'function', foreground: '50FA7B', fontStyle: 'bold' }
      ],
      colors: {
        'editor.background': '#15161e',
        'editor.lineHighlightBackground': '#1f2029',
        'editorLineNumber.foreground': '#6272A4',
        'editorLineNumber.activeForeground': '#FF79C6'
      }
    })
    monaco.editor.setTheme('dc-dark')

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      handleRunRef.current()
    })
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Enter, () => {
      handleSubmitRef.current()
    })
  }

  useEffect(() => {
    fetchChallenges()
  }, [courseSlug])

  const fetchChallenges = async () => {
    try {
      setLoading(true)
      const reattemptFlag = localStorage.getItem(`dataset_reattempt_${courseSlug}`) === 'true';
      
      const [courseRes, challengesRes] = await Promise.all([
        fetch(`/api/courses/${courseSlug}`),
        fetch(`/api/content/challenges/${courseSlug}${reattemptFlag ? '?reattempt=true' : ''}`)
      ])

      if (!courseRes.ok || !challengesRes.ok) {
        if (challengesRes.status === 404) {
          setErrorMsg("No datasets available for this course yet. Add CSV files to: content/tracks/[track]/[course]/datasets/")
        } else {
          setErrorMsg("Failed to load challenges.")
        }
        return
      }

      const courseData = await courseRes.json()
      if (courseData && courseData.reviewed !== 'Yes') {
        navigate('/courses')
        return
      }
      const challengesData = await challengesRes.json()

      setCourse(courseData)

      const trackSlug = courseData.track?.slug || courseData.track_slug;
      const sessionLimit = getSessionLimit('dataset', courseSlug, trackSlug, challengesData.length);
      const selectedChallenges = challengesData.slice(0, sessionLimit);

      if (selectedChallenges.length > 0) {
        setChallenges(selectedChallenges)
        setCode(getUserCodePortion(selectedChallenges[0].starter_code))
        setSolutionUnlocked(false)
        setActiveFile('script')
      } else {
        setErrorMsg("No datasets available for this course yet.")
      }
    } catch (err) {
      console.error('Error fetching challenges:', err)
      setErrorMsg("Failed to load challenges.")
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteQuestion = async (questionId) => {
    if (!window.confirm("Are you sure you want to delete this challenge? It will not be shown again.")) return;
    try {
      const res = await fetch('/api/progress/delete-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseSlug,
          exerciseType: 'challenge',
          questionId
        })
      });
      if (res.ok) {
        const updated = challenges.filter(c => c.id !== questionId);
        setChallenges(updated);
        if (updated.length === 0) {
          navigate(`/courses/${courseSlug}?refresh=1`);
        } else if (currentIndex >= updated.length) {
          setCurrentIndex(updated.length - 1);
          setCode(getUserCodePortion(updated[updated.length - 1].starter_code));
          setResult(null);
          setLastRun(null);
          setRunHistory([]);
        } else {
          setCode(getUserCodePortion(updated[currentIndex].starter_code));
          setResult(null);
          setLastRun(null);
          setRunHistory([]);
        }
      }
    } catch (err) {
      console.error("Failed to delete challenge:", err);
    }
  };

  async function handleRun() {
    if (isRunning || isSubmitting) return
    setIsRunning(true)
    const challenge = challenges[currentIndex]
    const userCode = activeFile === 'solution' ? (challenge?.solution_code || challenge?.expected_output_code || '') : code

    try {
      const res = await fetch('/api/content/run-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          solution_code: userCode,
          courseSlug,
          challenge_id: challenge.id,
          run_only: true
        })
      })
      const data = await res.json()

      const runResult = {
        stdout: data.stdout || '',
        stderr: data.stderr || '',
        executionTime: data.executionTime || 0,
        variables: data.variables || {},
        code: userCode
      }

      setLastRun(runResult)
      setRunHistory(prev => {
        const entry = {
          ...runResult,
          timestamp: Date.now(),
          codePreview: userCode.length > 80 ? userCode.slice(0, 80) + '...' : userCode
        }
        return [entry, ...prev].slice(0, 5)
      })
      if (data.stderr) {
        datasetChallengeFeedback.runError()
      } else {
        datasetChallengeFeedback.runSuccess()
      }
    } catch (err) {
      setLastRun({
        stdout: '',
        stderr: 'Connection failed or server error.',
        executionTime: 0,
        variables: {},
        code: userCode
      })
    } finally {
      setIsRunning(false)
    }
  }

  async function handleSubmit() {
    if (isRunning || isSubmitting) return
    setIsSubmitting(true)
    const challenge = challenges[currentIndex]
    const submitCode = activeFile === 'solution' ? (challenge?.solution_code || challenge?.expected_output_code || '') : code

    try {
      const res = await fetch('/api/content/submit-challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: submitCode,
          courseSlug,
          challengeId: challenge.id,
          datasetFile: challenge.dataset_file,
          expectedOutputCode: challenge.solution_code || challenge.expected_output_code
        })
      })
      const data = await res.json()
      
      if (res.ok) {
        setResult(data)
        if (data.passed) {
          datasetChallengeFeedback.submitPass()
        } else {
          datasetChallengeFeedback.submitFail()
        }
        setSessionScore(prev => ({
          correct: prev.correct + (data.passed ? 1 : 0),
          total: prev.total + 1
        }))

        // Record attempt to progress API
        const conceptId = challenge.concepts_tested && challenge.concepts_tested[0] 
          ? challenge.concepts_tested[0] 
          : null

        try {
          await fetch('/api/progress/attempt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              exercise_type: 'dataset',
              course_id: course?.id,
              question_id: challenge.id,
              concept_id: conceptId,
              score: data.passed ? 1.0 : 0.0,
              was_correct: data.passed ? 1 : 0,
              time_taken_secs: 0
            })
          })
        } catch (attemptErr) {
          console.error("Error saving dataset attempt:", attemptErr)
        }
      } else {
        datasetChallengeFeedback.submitFail()
        setResult({ passed: false, feedback: data.error, error: true })
      }
    } catch (err) {
      datasetChallengeFeedback.submitFail()
      setResult({ passed: false, feedback: 'Connection failed or server error.', error: true })
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleSkip() {
    if (isRunning || isSubmitting) return
    const challenge = challenges[currentIndex]
    if (!challenge) return

    handleNext()
  }

  const toggleConsole = () => setConsoleVisible(v => !v)

  const handleShowSolution = () => {
    if (solutionUnlocked) {
      setActiveFile('solution')
    } else {
      setShowSolutionModal(true)
    }
  }

  const handleNext = () => {
    if (currentIndex < challenges.length - 1) {
      setCurrentIndex(prev => prev + 1)
      setCode(getUserCodePortion(challenges[currentIndex + 1].starter_code))
      setResult(null)
      setLastRun(null)
      setRunHistory([])
      setHintsShown([false, false])
      setSolutionUnlocked(false)
      setActiveFile('script')
    } else {
      setCurrentIndex(challenges.length)
      triggerSuccessFeedback()
    }
  }

  const handleReset = () => {
    setCode(getUserCodePortion(challenges[currentIndex].starter_code))
    setLastRun(null)
    setRunHistory([])
    setResult(null)
    setActiveFile('script')
  }

  async function handleSnippetRun(snippet) {
    if (isRunning || isSubmitting) return
    const challenge = challenges[currentIndex]
    try {
      const res = await fetch('/api/content/run-snippet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          snippet: snippet.trim(),
          courseSlug,
          challengeId: challenge?.id
        })
      })
      const data = await res.json()
      const result = {
        snippet: snippet.trim(),
        stdout: data.stdout || '',
        stderr: data.stderr || '',
        executionTime: data.executionTime || 0
      }
      setSnippetHistory(prev => [...prev, result])
    } catch (err) {
      setSnippetHistory(prev => [...prev, { snippet: snippet.trim(), stdout: '', stderr: 'Connection failed.', executionTime: 0 }])
    }
  }

  function handleSnippetKeyDown(e) {
    if (e.key === 'Enter') {
      const snippet = snippetInput.trim()
      if (!snippet || isRunning || isSubmitting) return
      handleSnippetRun(snippet)
      setSnippetInput('')
      setSnippetHistoryIndex(-1)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (snippetHistory.length === 0) return
      const newIndex = snippetHistoryIndex === -1
        ? snippetHistory.length - 1
        : Math.max(0, snippetHistoryIndex - 1)
      setSnippetHistoryIndex(newIndex)
      setSnippetInput(snippetHistory[newIndex].snippet)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (snippetHistoryIndex === -1) return
      const newIndex = snippetHistoryIndex + 1
      if (newIndex >= snippetHistory.length) {
        setSnippetHistoryIndex(-1)
        setSnippetInput('')
      } else {
        setSnippetHistoryIndex(newIndex)
        setSnippetInput(snippetHistory[newIndex].snippet)
      }
    }
  }


  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 100, background: 'var(--bg-primary)' }}>
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[var(--accent-green)] border-t-transparent"></div>
      </div>
    )
  }

  if (errorMsg || challenges.length === 0) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-center p-8" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 100, background: 'var(--bg-primary)' }}>
        <TerminalIcon size={48} className="text-[var(--text-muted)] mb-4" />
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">Dataset Challenge Unavailable</h2>
        <p className="mt-2 text-[var(--text-muted)] max-w-lg">{errorMsg || "No datasets available."}</p>
        <Link
          to={`/courses/${courseSlug}?refresh=1`}
          className="mt-6 flex items-center gap-2 rounded-lg bg-[var(--bg-card)] px-6 py-2 border border-[var(--border)]"
        >
          <ChevronLeft size={20} />
          Back to Course
        </Link>
      </div>
    )
  }

  const handleReattemptAll = () => {
    localStorage.setItem(`dataset_reattempt_${courseSlug}`, 'true');
    setCurrentIndex(0);
    setResult(null);
    setLastRun(null);
    setRunHistory([]);
    setHintsShown([false, false]);
    setSessionScore({ correct: 0, total: 0 });
    setSolutionUnlocked(false);
    setActiveFile('script');
    fetchChallenges();
  };

  // Summary screen
  if (currentIndex >= challenges.length) {
    const percentage = sessionScore.total > 0 ? Math.round((sessionScore.correct / sessionScore.total) * 100) : 0
    // Clear reattempt flag since the current run is finished
    localStorage.removeItem(`dataset_reattempt_${courseSlug}`);

    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[var(--bg-exercise)] p-6 text-center overflow-y-auto">
        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-[var(--accent-green)] text-black">
          <Award size={64} strokeWidth={2} />
        </div>
        
        <h1 className="text-4xl font-extrabold text-[var(--text-primary)]">Session Complete!</h1>
        <p className="mt-4 text-lg text-[var(--text-muted)] max-w-md mx-auto">Outstanding! You've conquered all challenges! 🏆</p>
        
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-[600px]">
          <div className="rounded-2xl bg-[var(--bg-card)] p-6 border border-[var(--border)]">
            <div className="text-xs uppercase tracking-wider text-[var(--text-muted)] mb-1 font-bold">Passed</div>
            <div className="text-3xl font-extrabold">{sessionScore.correct} / {sessionScore.total}</div>
          </div>
          <div className="rounded-2xl bg-[var(--bg-card)] p-6 border border-[var(--border)]">
            <div className="text-xs uppercase tracking-wider text-[var(--text-muted)] mb-1 font-bold">Accuracy</div>
            <div className="text-3xl font-extrabold">{percentage}%</div>
          </div>
          <div className="rounded-2xl bg-[var(--accent-green)] p-6 text-black flex flex-col justify-center items-center">
            <div className="text-xs uppercase tracking-wider opacity-75 mb-1 font-bold">XP Earned</div>
            <div className="text-3xl font-extrabold">+50 XP</div>
          </div>
        </div>
        
        <div className="mt-12 flex flex-wrap justify-center gap-4">
          <button 
            onClick={handleReattemptAll}
            className="rounded-xl bg-[var(--bg-card)] px-10 py-4 font-bold text-[var(--text-primary)] border border-[var(--border)] hover:bg-[var(--bg-primary)] transition-colors shadow-sm"
          >
            Re-attempt All
          </button>
          <button 
            onClick={() => navigate(`/courses/${courseSlug}?refresh=1`)}
            className="rounded-xl bg-[var(--accent-green)] px-10 py-4 font-bold text-black hover:bg-[var(--accent-green-bright)] transition-colors shadow-md shadow-[rgba(3,239,98,0.2)]"
          >
            Return to Course
          </button>
        </div>
      </div>
    )
  }

  const challenge = challenges[currentIndex]

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)] overflow-hidden">
      {timerExpired && timerEnabled && (
        <div style={{ background: 'color-mix(in srgb, var(--accent-red) 8%, transparent)', borderBottom: '1px solid color-mix(in srgb, var(--accent-red) 25%, transparent)', padding: '8px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <span className="text-sm text-[var(--text-primary)]">⏱ Time's up for this challenge. You can keep working, or move to the next one.</span>
          <button
            type="button"
            onClick={() => setTimerExpired(false)}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors bg-transparent border-none cursor-pointer shrink-0"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Progress Bar & Stats */}
      <div className="w-full bg-[var(--bg-primary)] px-6 py-2 flex items-center justify-between text-xs font-bold text-[var(--text-muted)] select-none shrink-0 border-b border-[var(--border)]/20">
        <span>Dataset Challenge Progress</span>
        <span>Challenge {currentIndex + 1} / {challenges.length} ({Math.round(((currentIndex + 1) / challenges.length) * 100)}%)</span>
      </div>
      <div className="w-full h-1 bg-[var(--bg-card)] shrink-0">
        <div 
          className="h-full bg-[var(--accent-green)] transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / challenges.length) * 100}%` }}
        />
      </div>

      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] bg-[var(--bg-primary)] shrink-0">
        <button 
          onClick={() => navigate(`/courses/${courseSlug}?refresh=1`)} 
          className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1 text-sm font-semibold bg-transparent border-none cursor-pointer"
        >
          <ChevronLeft size={16} /> Quit
        </button>
        
        <div className="text-center">
          <span className="text-xs uppercase tracking-widest text-[var(--text-muted)] font-semibold">Dataset Challenge • {courseSlug}</span>
          <div className="font-bold text-sm flex items-center justify-center gap-2">
            Challenge {currentIndex + 1} of {challenges.length}
            {timerEnabled && (
              <ExerciseTimer
                durationSeconds={timerDuration}
                isRunning={!timerExpired}
                onExpire={() => setTimerExpired(true)}
                resetKey={currentIndex}
              />
            )}
          </div>
        </div>
        
        <div className="w-20"></div> {/* Spacer */}
      </header>

      {/* ─── MOBILE LAYOUT (< 1024px) ─── */}
      {!isDesktop && (<>
      <div className="lg:hidden flex items-center border-b border-[var(--border)] bg-[var(--bg-card)] shrink-0">
        {['problem', 'code', 'console'].map(tab => (
          <button
            key={tab}
            onClick={() => setMobileTab(tab)}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer bg-transparent border-none ${
              mobileTab === tab
                ? 'text-[var(--accent-green)] border-b-2 border-[var(--accent-green)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            {tab === 'problem' ? 'Problem' : tab === 'code' ? 'Code' : 'Console'}
          </button>
        ))}
      </div>

      {/* ─── MOBILE CONTENT (< 1024px) ─── */}
      {/* Problem Tab */}
      {mobileTab === 'problem' && (
        <div className="lg:hidden flex-1 overflow-y-auto p-4 pb-24">
          <div className="flex items-center gap-2 mb-3">
            <span className={`px-2 py-0.5 text-[10px] font-extrabold uppercase rounded shadow-sm ${
              String(challenge.difficulty).toLowerCase() === 'easy' || challenge.difficulty === 1 ? 'bg-emerald-600 text-white' :
              String(challenge.difficulty).toLowerCase() === 'medium' || challenge.difficulty === 2 ? 'bg-amber-500 text-black' :
              'bg-rose-600 text-white'
            }`}>
              {typeof challenge.difficulty === 'number'
                ? (challenge.difficulty === 1 ? 'EASY' : challenge.difficulty === 2 ? 'MEDIUM' : 'HARD')
                : String(challenge.difficulty).toUpperCase()
              }
            </span>
            <span className="bg-[var(--bg-card)] px-2 py-0.5 rounded border border-[var(--border)] text-[10px] text-[var(--text-primary)] font-mono">
              📊 {challenge.dataset_file}
            </span>
          </div>
          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-3">{challenge.title}</h2>
          <div className="text-sm text-[var(--text-primary)] leading-relaxed mb-4">
            {challenge.context || challenge.description}
          </div>
          <div className="bg-yellow-500/10 border-l-4 border-yellow-500 p-3 rounded-r-lg mb-6">
            <h4 className="text-[11px] font-bold text-yellow-500 uppercase tracking-wider mb-1">Variable Names</h4>
            <p className="text-[11px] text-yellow-500/80">
              Ensure you use the exact variable names requested in the description so the tests can verify your code!
            </p>
          </div>
          <div className="space-y-2 mb-6">
            {(challenge.hints || []).map((hint, idx) => (
              <div key={idx} className="border border-[var(--border)] rounded-lg bg-[var(--bg-card)] overflow-hidden">
                <button
                  onClick={() => { const s = [...hintsShown]; s[idx] = true; setHintsShown(s) }}
                  className="w-full text-left p-2.5 flex justify-between items-center text-xs font-medium hover:bg-[var(--bg-primary)] transition-colors cursor-pointer bg-transparent border-none"
                >
                  <span className="text-[var(--text-primary)]">💡 Hint {idx + 1}</span>
                  {!hintsShown[idx] && <span className="text-xs text-[var(--text-muted)] border border-[var(--border)] px-1.5 py-0.5 rounded">Reveal</span>}
                </button>
                {hintsShown[idx] && (
                  <div className="p-2.5 border-t border-[var(--border)] text-xs text-[var(--text-muted)] bg-[var(--bg-primary)]">{hint}</div>
                )}
              </div>
            ))}
          </div>
          {/* Run/Submit buttons for mobile problem tab */}
          <div className="flex gap-2">
            <button onClick={handleRun} disabled={isRunning || isSubmitting}
              className="flex-1 py-2.5 rounded-lg bg-[var(--accent-green)] text-black text-sm font-bold disabled:opacity-50 cursor-pointer">
              {isRunning ? 'Running...' : '▶ Run'}
            </button>
            <button onClick={handleSubmit} disabled={isRunning || isSubmitting}
              className="flex-1 py-2.5 rounded-lg border border-[var(--accent-green)] text-[var(--accent-green)] text-sm font-bold disabled:opacity-50 cursor-pointer">
              {isSubmitting ? 'Checking...' : '✓ Submit'}
            </button>
          </div>
        </div>
      )}

      {/* Code Tab (mobile) */}
      {mobileTab === 'code' && (
        <div className="lg:hidden flex-1 flex flex-col overflow-hidden bg-[#1e1e1e]">
          <div className="flex items-center gap-1 px-2 py-1 bg-[var(--bg-card)] border-b border-[var(--border)] shrink-0">
            <button
              onClick={() => setActiveFile('script')}
              className={`px-2 py-1 text-[10px] font-mono cursor-pointer bg-transparent border-none transition-colors ${
                activeFile === 'script' ? 'text-[var(--text-primary)] border-b-2 border-[var(--accent-green)]' : 'text-[var(--text-muted)]'
              }`}
            >
              script.py
            </button>
            <button
              onClick={() => setActiveFile('expected_output')}
              className={`px-2 py-1 text-[10px] font-mono cursor-pointer bg-transparent border-none transition-colors ${
                activeFile === 'expected_output' ? 'text-[var(--text-primary)] border-b-2 border-[var(--accent-green)]' : 'text-[var(--text-muted)]'
              }`}
            >
              expected_output.txt
            </button>
            <div className="ml-auto flex gap-1">
              <button onClick={handleRun} disabled={isRunning || isSubmitting}
                className="px-2.5 py-1 bg-[var(--accent-green)] text-black rounded text-[10px] font-bold disabled:opacity-50 cursor-pointer">Run</button>
              <button onClick={handleSubmit} disabled={isRunning || isSubmitting}
                className="px-2.5 py-1 border border-[var(--accent-green)] text-[var(--accent-green)] rounded text-[10px] font-bold disabled:opacity-50 cursor-pointer">Submit</button>
              <button onClick={handleReset} disabled={isRunning || isSubmitting}
                className="px-2 py-1 border border-[var(--border)] text-[var(--text-muted)] rounded text-[10px] cursor-pointer disabled:opacity-40 bg-transparent"><RotateCcw size={12} /></button>
            </div>
          </div>
          <div className="grow relative">
            <div className="absolute inset-0 flex flex-col">
              {activeFile === 'script' && (
                <>
                  <div className="bg-[var(--bg-primary)]/60 border-b border-[var(--border)]/30 px-3 py-1 text-[10px] font-mono text-[var(--accent-green)] select-none whitespace-pre-wrap shrink-0 opacity-80">
                    {generatePreLoadedComments(challenge)}
                  </div>
                  <div className="grow">
                    <Editor
                      key="script-mobile"
                      height="100%" width="100%" language="python" theme="dc-dark"
                      value={code} onChange={(v) => setCode(v)} onMount={handleEditorDidMount}
                      options={{ minimap: { enabled: false }, fontSize: 13, fontFamily: "'Courier New', Courier, monospace", lineHeight: 1.5, padding: { top: 6 }, scrollBeyondLastLine: false, wordWrap: 'on', readOnly: false }}
                    />
                  </div>
                </>
              )}
              {activeFile === 'expected_output' && (
                <Editor
                  key="expected-output-mobile" height="100%" width="100%" language="text" theme="dc-dark"
                  value={challenge?.expected_output || (loadingExpectedOutput ? 'Loading expected output...' : 'No expected output available.')}
                  onMount={handleEditorDidMount}
                  options={{ minimap: { enabled: false }, fontSize: 13, fontFamily: "'Courier New', Courier, monospace", lineHeight: 1.5, padding: { top: 12 }, scrollBeyondLastLine: false, wordWrap: 'on', readOnly: true }}
                />
              )}
              {activeFile === 'solution' && (
                <Editor
                  key="solution-mobile" height="100%" width="100%" language="python" theme="dc-dark"
                  value={challenge?.solution_code || challenge?.expected_output_code || ''} onMount={handleEditorDidMount}
                  options={{ minimap: { enabled: false }, fontSize: 13, fontFamily: "'Courier New', Courier, monospace", lineHeight: 1.5, padding: { top: 12 }, scrollBeyondLastLine: false, wordWrap: 'on', readOnly: true }}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Console Tab (mobile) — slim version */}
      {mobileTab === 'console' && (
        <div className="lg:hidden flex-1 flex flex-col bg-black overflow-hidden">
          <div className="bg-[#1a1b23] px-3 border-b border-[var(--border)] flex items-center text-[10px] font-mono shrink-0 border-t-2 border-[var(--accent-green)] select-none">
            <div className="flex gap-1">
              {['console', 'variables', 'history'].map(tab => (
                <button key={tab} onClick={() => setConsoleTab(tab)}
                  className={`px-2 py-2 font-bold transition-all border-b-2 bg-transparent cursor-pointer ${
                    consoleTab === tab ? 'border-[var(--accent-green)] text-[var(--accent-green)]' : 'border-transparent text-[var(--text-muted)]'
                  }`}>
                  {tab === 'console' ? 'Console' : tab === 'variables' ? 'Vars' : 'History'}
                </button>
              ))}
            </div>
          </div>
          {/* Console Tab */}
          {consoleTab === 'console' && (
            <div className="grow flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-3 font-mono text-sm text-left">
                {lastRun ? (
                  <div>
                    {lastRun.stderr && <div className="text-[var(--accent-red)] whitespace-pre-wrap mb-1 text-xs">{lastRun.stderr}</div>}
                    <div className="text-gray-300 whitespace-pre-wrap text-sm">{lastRun.stdout || '(no output)'}</div>
                    {lastRun.executionTime > 0 && <div className="text-zinc-600 text-[10px] mt-2">Executed in {lastRun.executionTime}ms</div>}
                  </div>
                ) : (
                  <div className="text-zinc-600 italic text-xs">Run your code to see output here.</div>
                )}
                {snippetHistory.length > 0 && (
                  <div className="border-t border-[var(--border)]/50 mt-3 pt-2 space-y-2">
                    {snippetHistory.map((entry, idx) => (
                      <div key={idx}>
                        <div className="text-[var(--accent-green)] font-bold text-xs">&gt;&gt;&gt; {entry.snippet}</div>
                        {entry.stderr && <div className="text-[var(--accent-red)] whitespace-pre-wrap ml-3 mt-0.5 text-xs">{entry.stderr}</div>}
                        {entry.stdout && <div className="text-gray-300 whitespace-pre-wrap ml-3 mt-0.5 text-xs">{entry.stdout}</div>}
                      </div>
                    ))}
                  </div>
                )}
                <div ref={terminalEndRef} />
              </div>
              <div className="flex items-center gap-1 px-3 py-1.5 border-t border-[var(--border)] bg-black/90 shrink-0">
                <span className="text-[var(--accent-green)] font-bold font-mono text-xs">&gt;&gt;&gt;</span>
                <input ref={snippetInputRef} type="text" value={snippetInput}
                  onChange={(e) => setSnippetInput(e.target.value)} onKeyDown={handleSnippetKeyDown}
                  placeholder="Run a Python line..." className="flex-1 bg-transparent border-none outline-none text-gray-200 font-mono text-xs placeholder-zinc-600" />
              </div>
            </div>
          )}
          {/* Variables Tab */}
          {consoleTab === 'variables' && (
            <div className="grow overflow-y-auto p-3 font-mono text-xs text-left">
              {!lastRun || Object.keys(lastRun.variables).length === 0 ? (
                <div className="text-zinc-500 italic flex flex-col items-center justify-center h-full gap-1 text-[10px]">
                  <Database size={18} className="opacity-40" />
                  <span>No variables defined yet.</span>
                </div>
              ) : (
                <div className="border border-[var(--border)] rounded overflow-hidden bg-[var(--bg-primary)]">
                  <table className="w-full text-left border-collapse text-[10px]">
                    <thead><tr className="bg-zinc-900 border-b border-[var(--border)] text-zinc-500"><th className="p-2 font-bold">Name</th><th className="p-2 font-bold">Type</th><th className="p-2 font-bold">Preview</th></tr></thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {Object.entries(lastRun.variables).map(([name, info]) => (
                        <tr key={name} className="hover:bg-zinc-800/25"><td className="p-2 text-[var(--accent-green)] font-bold">{name}</td><td className="p-2 text-[var(--accent-blue)]">{info.type}{info.shape ? ` (${info.shape})` : ''}</td><td className="p-2 text-zinc-300 max-w-[120px] truncate">{info.preview}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          {/* History Tab */}
          {consoleTab === 'history' && (
            <div className="grow overflow-y-auto p-3 font-mono text-left">
              {runHistory.length === 0 ? (
                <div className="text-zinc-500 italic flex flex-col items-center justify-center h-full gap-1 text-[10px]">
                  <History size={18} className="opacity-40" />
                  <span>No runs yet.</span>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider select-none">Last 5 Runs</div>
                  {runHistory.map((entry, idx) => (
                    <button key={idx} onClick={() => setLastRun(entry)}
                      className="w-full text-left p-2 rounded border border-[var(--border)] bg-zinc-950/40 hover:border-zinc-500 text-[10px] text-zinc-300 font-mono transition-all flex items-start gap-1.5 cursor-pointer">
                      <span className={`shrink-0 ${entry.stderr ? 'text-red-500' : 'text-green-500'}`}>{entry.stderr ? <XCircle size={10} /> : <CheckCircle2 size={10} />}</span>
                      <span className="grow truncate">{entry.codePreview}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
      </>)}
      
      {/* ─── DESKTOP LAYOUT (>= 1024px) ─── */}
      {isDesktop && (
      <div ref={containerRef} className="hidden lg:flex flex-1 overflow-hidden">
        {/* LEFT PANEL */}
        <div className="h-full border-r border-[var(--border)] relative flex flex-col bg-[var(--bg-primary)]" style={{ width: `${leftWidth}%` }}>
          <div className="flex-1 overflow-y-auto p-6 pb-24">
            <div className="flex items-center gap-3 mb-4">
              <span className={`px-2.5 py-1 text-xs font-extrabold uppercase rounded shadow-sm ${
                String(challenge.difficulty).toLowerCase() === 'easy' || challenge.difficulty === 1 ? 'bg-emerald-600 text-white' :
                String(challenge.difficulty).toLowerCase() === 'medium' || challenge.difficulty === 2 ? 'bg-amber-500 text-black' :
                'bg-rose-600 text-white'
              }`}>
                {typeof challenge.difficulty === 'number'
                  ? (challenge.difficulty === 1 ? 'EASY' : challenge.difficulty === 2 ? 'MEDIUM' : 'HARD')
                  : String(challenge.difficulty).toUpperCase()
                }
              </span>
              <span className="bg-[var(--bg-card)] px-3 py-1 rounded-md border border-[var(--border)] text-xs text-[var(--text-primary)] font-mono flex items-center gap-2">
                 📊 {challenge.dataset_file}
              </span>
            </div>

          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">{challenge.title}</h2>
          
          <div className="prose prose-invert max-w-none text-[var(--text-primary)] leading-relaxed mb-6">
            {challenge.context || challenge.description}
          </div>

          <div className="bg-yellow-500/10 border-l-4 border-yellow-500 p-4 rounded-r-lg mb-8">
            <h4 className="text-sm font-bold text-yellow-500 uppercase tracking-wider mb-2">Variable Names</h4>
            <p className="text-sm text-yellow-500/80">
              Ensure you use the exact variable names requested in the description so the tests can verify your code!
            </p>
          </div>

          <div className="space-y-3 mb-8">
            {(challenge.hints || []).map((hint, idx) => (
              <div key={idx} className="border border-[var(--border)] rounded-lg bg-[var(--bg-card)] overflow-hidden">
                <button 
                  onClick={() => {
                    const newShown = [...hintsShown]
                    newShown[idx] = true
                    setHintsShown(newShown)
                  }}
                  className="w-full text-left p-3 flex justify-between items-center text-sm font-medium hover:bg-[var(--bg-primary)] transition-colors"
                >
                  <span className="text-[var(--text-primary)]">💡 Hint {idx + 1}</span>
                  {!hintsShown[idx] && <span className="text-xs text-[var(--text-muted)] border border-[var(--border)] px-2 py-0.5 rounded">Reveal</span>}
                </button>
                {hintsShown[idx] && (
                  <div className="p-3 border-t border-[var(--border)] text-sm text-[var(--text-muted)] bg-[var(--bg-primary)]">
                    {hint}
                  </div>
                )}
              </div>
            ))}
          </div>
          </div>
          {/* Delete Challenge button in bottom-left */}
          <div className="absolute bottom-4 left-6 z-40 flex gap-2">
            <button
              type="button"
              onClick={() => setEditingQuestion(challenge)}
              className="bg-[rgba(96,165,250,0.1)] hover:bg-[rgba(96,165,250,0.2)] border border-[rgba(96,165,250,0.3)] text-[var(--accent-blue)] font-bold py-2.5 px-4 rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-blue-950/20"
            >
              <Edit2 size={14} /> Edit
            </button>
            <button
              type="button"
              onClick={() => handleDeleteQuestion(challenge?.id)}
              className="bg-[rgba(239,68,68,0.1)] hover:bg-[rgba(239,68,68,0.2)] border border-[rgba(239,68,68,0.3)] text-[var(--accent-red)] font-bold py-2.5 px-4 rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-red-950/20"
            >
              <Trash2 size={14} /> Delete
            </button>
          </div>
        </div>

      {/* DIVIDER — Draggable splitter */}
      <div
        className="w-[4px] cursor-col-resize bg-[var(--border)] flex-shrink-0 hover:bg-[var(--accent-green)] active:bg-[var(--accent-green)] transition-colors duration-150"
        onMouseDown={onDividerMouseDown}
      />

      {/* RIGHT PANEL */}
      <div ref={rightPanelRef} className="h-full flex flex-col bg-[#1e1e1e]" style={{ width: `${100 - leftWidth - 0.3}%` }}>
        {/* Editor Section */}
        <div className="flex flex-col min-h-[200px] flex-1 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-1.5 bg-[var(--bg-card)] border-b border-[var(--border)] shrink-0 gap-3">
            <div className="flex items-center gap-2">
              <button 
                onClick={handleRun}
                disabled={isRunning || isSubmitting || activeFile === 'expected_output'}
                className="bg-[var(--accent-green)] hover:bg-[var(--accent-green)]/80 text-black px-4 py-1.5 rounded font-bold text-xs transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                {isRunning ? 'Running...' : '▶ Run Code'}
              </button>
              <button 
                onClick={handleSubmit}
                disabled={isRunning || isSubmitting || activeFile === 'expected_output'}
                className="border border-[var(--accent-green)] text-[var(--accent-green)] bg-transparent hover:bg-[var(--accent-green)]/10 px-4 py-1.5 rounded font-bold text-xs transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                {isSubmitting ? 'Checking...' : '✓ Submit'}
              </button>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                disabled={currentIndex === 0}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-30 bg-transparent border-none cursor-pointer font-mono text-xs flex items-center gap-1"
              >
                ⟨ Prev
              </button>
              <span className="text-[var(--text-muted)] text-xs font-mono select-none flex items-center gap-2">
                Challenge {currentIndex + 1} of {challenges.length}
                {timerEnabled && (
                  <ExerciseTimer
                    durationSeconds={timerDuration}
                    isRunning={!timerExpired}
                    onExpire={() => setTimerExpired(true)}
                    resetKey={currentIndex}
                  />
                )}
              </span>
              <button
                onClick={handleNext}
                disabled={currentIndex >= challenges.length - 1}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-30 bg-transparent border-none cursor-pointer font-mono text-xs flex items-center gap-1"
              >
                Next ⟩
              </button>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleReset}
                disabled={isRunning || isSubmitting || activeFile === 'solution' || activeFile === 'expected_output'}
                title="Reset to starter code"
                className="w-8 h-8 rounded-md bg-transparent border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)] hover:border-[var(--accent-green)] transition-all duration-150 cursor-pointer disabled:opacity-40 flex items-center justify-center"
              >
                <RotateCcw size={14} />
              </button>
              <button
                onClick={handleSkip}
                disabled={isRunning || isSubmitting}
                title="Skip this challenge"
                className="w-8 h-8 rounded-md bg-transparent border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)] hover:border-[var(--accent-green)] transition-all duration-150 cursor-pointer disabled:opacity-40 flex items-center justify-center"
              >
                <SkipForward size={14} />
              </button>
              <button
                onClick={() => setActiveFile(activeFile === 'expected_output' ? 'script' : 'expected_output')}
                disabled={isRunning || isSubmitting}
                title="View expected output"
                className={`w-8 h-8 rounded-md border transition-all duration-150 cursor-pointer disabled:opacity-40 flex items-center justify-center ${
                  activeFile === 'expected_output'
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-transparent border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)] hover:border-[var(--accent-green)]'
                }`}
              >
                <Eye size={14} />
              </button>
              <button
                onClick={handleShowSolution}
                disabled={isRunning || isSubmitting}
                title="Show solution"
                className="w-8 h-8 rounded-md bg-transparent border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)] hover:border-[var(--accent-green)] transition-all duration-150 cursor-pointer disabled:opacity-40 flex items-center justify-center"
              >
                <Lightbulb size={14} />
              </button>
              <button
                onClick={toggleConsole}
                title="Toggle console (Ctrl+J)"
                className="w-8 h-8 rounded-md bg-transparent border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)] hover:border-[var(--accent-green)] transition-all duration-150 cursor-pointer flex items-center justify-center"
              >
                <TerminalIcon size={14} />
              </button>
            </div>
          </div>
             <div className="flex items-center px-3 border-b border-[var(--border)] shrink-0" style={{ background: 'var(--bg-primary)', padding: '0 12px' }}>
               <button
                 type="button"
                 onClick={() => setActiveFile('script')}
                 className={`px-3 font-mono text-xs cursor-pointer bg-transparent border-none transition-colors ${
                   activeFile === 'script'
                     ? 'text-[var(--text-primary)] border-b-2 border-[var(--accent-green)]'
                     : 'text-[var(--text-muted)] border-b-2 border-transparent hover:text-[var(--text-primary)]'
                 }`}
                 style={{ padding: '4px 12px' }}
               >
                 script.py
               </button>
               <button
                 type="button"
                 onClick={() => setActiveFile('expected_output')}
                 className={`px-3 font-mono text-xs cursor-pointer bg-transparent border-none transition-colors ${
                   activeFile === 'expected_output'
                     ? 'text-[var(--text-primary)] border-b-2 border-[var(--accent-green)]'
                     : 'text-[var(--text-muted)] border-b-2 border-transparent hover:text-[var(--text-primary)]'
                 }`}
                 style={{ padding: '4px 12px' }}
               >
                 expected_output.txt
               </button>
             </div>
          <div className="grow relative">
            <div className="absolute inset-0 flex flex-col">
              {activeFile === 'script' && (
                <>
                  <div className="bg-[var(--bg-primary)]/60 border-b border-[var(--border)]/30 px-4 py-1.5 text-xs font-mono text-[var(--accent-green)] select-none whitespace-pre-wrap shrink-0 opacity-80">
                    {generatePreLoadedComments(challenge)}
                  </div>
                  <div className="grow">
                    <Editor
                      key="script"
                      height="100%"
                      width="100%"
                      language="python"
                      theme="dc-dark"
                      value={code}
                      onChange={(value) => setCode(value)}
                      onMount={handleEditorDidMount}
                      options={{
                        minimap: { enabled: false },
                        fontSize: 16,
                        fontFamily: "'Courier New', Courier, monospace",
                        lineHeight: 1.6,
                        padding: { top: 8 },
                        scrollBeyondLastLine: false,
                        wordWrap: 'on',
                        readOnly: false
                      }}
                    />
                  </div>
                </>
              )}
              {activeFile === 'expected_output' && (
                <Editor
                  key="expected_output"
                  height="100%"
                  width="100%"
                  language="text"
                  theme="dc-dark"
                  value={challenge?.expected_output || (loadingExpectedOutput ? 'Loading expected output...' : 'No expected output available.')}
                  onMount={handleEditorDidMount}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 16,
                    fontFamily: "'Courier New', Courier, monospace",
                    lineHeight: 1.6,
                    padding: { top: 16 },
                    scrollBeyondLastLine: false,
                    wordWrap: 'on',
                    readOnly: true
                  }}
                />
              )}
              {activeFile === 'solution' && (
                <Editor
                  key="solution"
                  height="100%"
                  width="100%"
                  language="python"
                  theme="dc-dark"
                  value={challenge?.solution_code || challenge?.expected_output_code || ''}
                  onMount={handleEditorDidMount}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 16,
                    fontFamily: "'Courier New', Courier, monospace",
                    lineHeight: 1.6,
                    padding: { top: 16 },
                    scrollBeyondLastLine: false,
                    wordWrap: 'on',
                    readOnly: true
                  }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Resizer */}
        {consoleVisible && (
        <div 
          className="h-1.5 bg-[var(--border)] hover:bg-[var(--accent-blue)] cursor-row-resize transition-colors select-none shrink-0"
          onMouseDown={handleMouseDown}
        />
        )}

        {/* Terminal Section */}
        {consoleVisible && (
        <div 
          className="flex flex-col bg-black overflow-hidden shrink-0 animate-in fade-in duration-300" 
          style={{ height: `${terminalHeight}px` }}
        >
          {/* Tabbed Header */}
          <div className="bg-[#1a1b23] px-4 border-b border-[var(--border)] flex items-center justify-between text-xs font-mono shrink-0 border-t-2 border-[var(--accent-green)] select-none">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConsoleTab('console')}
                className={`px-3 py-2.5 font-bold transition-all flex items-center gap-1.5 border-b-2 bg-transparent cursor-pointer ${
                  consoleTab === 'console'
                    ? 'border-[var(--accent-green)] text-[var(--accent-green)]'
                    : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                <TerminalIcon size={14} /> Console
              </button>
              
              <button
                type="button"
                onClick={() => setConsoleTab('variables')}
                className={`px-3 py-2.5 font-bold transition-all flex items-center gap-1.5 border-b-2 bg-transparent cursor-pointer ${
                  consoleTab === 'variables'
                    ? 'border-[var(--accent-green)] text-[var(--accent-green)]'
                    : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Database size={14} /> Variables
                {lastRun && Object.keys(lastRun.variables).length > 0 && (
                  <span className="bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded-full text-[9px] font-bold font-mono">
                    {Object.keys(lastRun.variables).length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setConsoleTab('history')}
                className={`px-3 py-2.5 font-bold transition-all flex items-center gap-1.5 border-b-2 bg-transparent cursor-pointer ${
                  consoleTab === 'history'
                    ? 'border-[var(--accent-green)] text-[var(--accent-green)]'
                    : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                <History size={14} /> History
                {runHistory.length > 0 && (
                  <span className="bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded-full text-[9px] font-bold font-mono">
                    {runHistory.length}
                  </span>
                )}
              </button>
             </div>
             <button
               onClick={toggleConsole}
               title="Toggle console (Ctrl+J)"
               className="w-7 h-7 rounded bg-transparent border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--accent-green)] cursor-pointer flex items-center justify-center transition-colors text-xs shrink-0"
             >
               <ChevronDown size={14} />
             </button>
           </div>

           {/* Console Tab */}
          {consoleTab === 'console' && (
            <div className="grow flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 font-mono text-base text-left">
                {lastRun ? (
                  <div>
                    {lastRun.stderr && (
                      <div className="text-[var(--accent-red)] whitespace-pre-wrap mb-2">{lastRun.stderr}</div>
                    )}
                    <div className="text-gray-300 whitespace-pre-wrap">{lastRun.stdout || '(no output)'}</div>
                    {lastRun.executionTime > 0 && (
                      <div className="text-[var(--text-muted)] text-xs mt-3">Executed in {lastRun.executionTime}ms</div>
                    )}
                  </div>
                ) : (
                  <div className="text-zinc-600 italic">Run your code to see output here.</div>
                )}
                {snippetHistory.length > 0 && (
                  <div className="border-t border-[var(--border)]/50 mt-4 pt-3 space-y-3">
                    {snippetHistory.map((entry, idx) => (
                      <div key={idx}>
                        <div className="text-[var(--accent-green)] font-bold text-sm">&gt;&gt;&gt; {entry.snippet}</div>
                        {entry.stderr && (
                          <div className="text-[var(--accent-red)] whitespace-pre-wrap ml-4 mt-1">{entry.stderr}</div>
                        )}
                        {entry.stdout && (
                          <div className="text-gray-300 whitespace-pre-wrap ml-4 mt-1">{entry.stdout}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <div ref={terminalEndRef} />
              </div>
              <div className="flex items-center gap-2 px-4 py-2 border-t border-[var(--border)] bg-black/90 shrink-0">
                <span className="text-[var(--accent-green)] font-bold font-mono text-sm">&gt;&gt;&gt;</span>
                <input
                  ref={snippetInputRef}
                  type="text"
                  value={snippetInput}
                  onChange={(e) => setSnippetInput(e.target.value)}
                  onKeyDown={handleSnippetKeyDown}
                  placeholder="Run a Python line..."
                  className="flex-1 bg-transparent border-none outline-none text-gray-200 font-mono text-base placeholder-zinc-600"
                />
              </div>
            </div>
          )}

          {/* Variables Tab */}
          {consoleTab === 'variables' && (
            <div className="grow overflow-y-auto p-5 font-mono text-left">
              {!lastRun || Object.keys(lastRun.variables).length === 0 ? (
                <div className="text-zinc-500 text-xs italic flex flex-col items-center justify-center h-full gap-2">
                  <Database size={24} className="opacity-40" />
                  <span>No variables defined yet.</span>
                </div>
              ) : (
                <div className="border border-[var(--border)] rounded-lg overflow-hidden bg-[var(--bg-primary)] text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-zinc-900 border-b border-[var(--border)] text-[var(--text-muted)]">
                        <th className="p-3 font-bold uppercase tracking-wider">Name</th>
                        <th className="p-3 font-bold uppercase tracking-wider">Type</th>
                        <th className="p-3 font-bold uppercase tracking-wider">Preview</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {Object.entries(lastRun.variables).map(([name, info]) => (
                        <tr key={name} className="hover:bg-zinc-800/25 transition-colors font-mono">
                          <td className="p-3 text-[var(--accent-green)] font-bold">{name}</td>
                          <td className="p-3 text-[var(--accent-blue)]">{info.type}{info.shape ? ` (${info.shape})` : ''}</td>
                          <td className="p-3 text-zinc-300 max-w-xs truncate" title={info.preview}>{info.preview}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* History Tab */}
          {consoleTab === 'history' && (
            <div className="grow overflow-y-auto p-5 font-mono text-left">
              {runHistory.length === 0 ? (
                <div className="text-zinc-500 text-xs italic flex flex-col items-center justify-center h-full gap-2">
                  <History size={24} className="opacity-40" />
                  <span>No runs yet. Click "Run Code" to execute your script.</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider mb-3 select-none">
                    Last 5 Runs
                  </div>
                  {runHistory.map((entry, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setLastRun(entry)}
                      className="w-full text-left p-2.5 rounded-lg border border-[var(--border)] bg-zinc-950/40 hover:border-zinc-500 text-xs text-zinc-300 font-mono transition-all hover:bg-zinc-900 flex items-start gap-2.5 group cursor-pointer"
                    >
                      <span className={`font-bold shrink-0 ${entry.stderr ? 'text-red-500' : 'text-green-500'}`}>
                        {entry.stderr ? <XCircle size={12} /> : <CheckCircle2 size={12} />}
                      </span>
                      <span className="text-zinc-600 font-bold shrink-0">
                        {new Date(entry.timestamp).toLocaleTimeString()}
                      </span>
                      <span className="grow whitespace-pre-wrap truncate">{entry.codePreview}</span>
                      <span className="text-[10px] text-[var(--accent-green)] opacity-0 group-hover:opacity-100 font-bold shrink-0">
                        View ↵
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        )}
      </div>
      </div>
      )}

      {/* Show Solution Warning Modal */}
      {showSolutionModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in-50 zoom-in-95 duration-200 text-left">
            <div className="p-6 border-b border-[var(--border)] flex justify-between items-center bg-amber-500/10">
              <div className="flex items-center gap-2 text-amber-500">
                <span className="text-xl">✨</span>
                <h3 className="font-bold text-lg text-[var(--text-primary)]">Reveal Solution</h3>
              </div>
              <button 
                onClick={() => setShowSolutionModal(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors bg-transparent border-none cursor-pointer"
              >
                <span className="text-lg font-bold">✕</span>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-[var(--text-primary)] leading-relaxed">
                You should try to solve the challenge using the hints before showing the solution. Are you sure you want to see the solution now?
              </p>
              
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSolutionModal(false)}
                  className="px-4 py-2 text-xs font-bold rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] hover:bg-zinc-800 text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowSolutionModal(false)
                    setSolutionUnlocked(true)
                    setActiveFile('solution')
                  }}
                  className="px-5 py-2.5 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-black transition-colors cursor-pointer"
                >
                  Yes, Show Solution
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Result Overlay (appears on Submit) */}
      {result && (
        <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center p-8 backdrop-blur-sm">
           <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-full">
             <div className={`p-6 border-b flex items-center justify-between shrink-0 ${result.passed ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                <div className="flex items-center gap-3">
                  {result.passed ? <CheckCircle2 className="text-green-500" size={32} /> : <XCircle className="text-red-500" size={32} />}
                  <h2 className="text-2xl font-bold text-[var(--text-primary)]">
                    {result.passed ? 'Correct! Excellent work.' : 'Not quite right.'}
                  </h2>
                </div>
                {result.passed ? (
                  <button onClick={handleNext} className="bg-green-500 hover:bg-green-400 text-black px-6 py-2 rounded-lg font-bold flex items-center gap-2">
                    Next Challenge <ArrowRight size={20} />
                  </button>
                ) : (
                  <button onClick={() => setResult(null)} className="bg-[var(--bg-primary)] border border-[var(--border)] hover:bg-[#333] text-white px-6 py-2 rounded-lg font-bold">
                    Try Again
                  </button>
                )}
             </div>
             
             <div className="p-6 text-[var(--text-primary)] overflow-y-auto grow">
                {result.error ? (
                  <>
                    <p className="mb-4 text-lg">Your code threw an error during execution:</p>
                    <pre className="bg-[#0d1117] p-4 rounded border border-red-500/30 text-red-400 font-mono text-sm overflow-x-auto whitespace-pre-wrap">
                      {result.feedback}
                    </pre>
                  </>
                ) : (
                  <p className="mb-6 text-lg">{result.feedback}</p>
                )}
                
                {!result.passed && !result.error && (
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-bold text-red-400 mb-2 uppercase tracking-wider text-sm">Your Output</h4>
                      <pre className="bg-[#0d1117] p-4 rounded border border-red-500/30 text-gray-300 font-mono text-sm overflow-x-auto">
                        {result.user_output || '(no output)'}
                      </pre>
                    </div>
                    <div>
                      <h4 className="font-bold text-green-400 mb-2 uppercase tracking-wider text-sm">Expected Output</h4>
                      <pre className="bg-[#0d1117] p-4 rounded border border-green-500/30 text-gray-300 font-mono text-sm overflow-x-auto">
                        {result.expected_output || '(no output)'}
                      </pre>
                    </div>
                  </div>
                )}
             </div>
           </div>
        </div>
      )}
      {/* QA Debug Panel */}
      {localStorage.getItem('devMode') === 'true' && (
        <div className="fixed bottom-4 left-4 z-50 rounded-xl border border-[var(--accent-yellow)] bg-black/90 p-4 text-xs font-mono text-[var(--accent-yellow)] shadow-2xl max-w-sm select-none">
          <div className="font-bold border-b border-[var(--accent-yellow)]/30 pb-1.5 mb-2 flex items-center justify-between">
            <span>🛠️ QA DEBUG PANEL</span>
            <span className="text-[10px] bg-[var(--accent-yellow)]/20 px-1.5 py-0.5 rounded">Active</span>
          </div>
          <div className="space-y-1">
            <div>Questions Attempted: {sessionScore.total}</div>
            <div>Questions Correct: {sessionScore.correct}</div>
            <div>Questions Incorrect: {sessionScore.total - sessionScore.correct}</div>
            <div>Questions Remaining: {challenges.length - currentIndex}</div>
            <div>Current Exercise Count: {challenges.length}</div>
            <div className="pt-1.5 border-t border-[var(--accent-yellow)]/10 text-[10px] text-zinc-500 overflow-x-auto max-w-xs whitespace-nowrap">
              Challenge ID: {challenge?.id} | Runs: {runHistory.length}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}