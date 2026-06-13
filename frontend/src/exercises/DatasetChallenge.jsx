import { useState, useEffect, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ChevronLeft, CheckCircle2, XCircle, Award, Terminal as TerminalIcon, RotateCcw, ArrowRight, Database, History, Eraser, SkipForward } from 'lucide-react'
import Editor from '@monaco-editor/react'

export default function DatasetChallenge() {
  const { courseSlug } = useParams()
  const navigate = useNavigate()
  const [challenges, setChallenges] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [code, setCode] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [terminalLines, setTerminalLines] = useState([])
  const [runCounter, setRunCounter] = useState(1)
  const [result, setResult] = useState(null)
  const [hintsShown, setHintsShown] = useState([false, false])
  const [sessionScore, setSessionScore] = useState({ correct: 0, total: 0 })
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState(null)
  const [course, setCourse] = useState(null)
  const [activeFile, setActiveFile] = useState('script') // 'script', 'expected_output', or 'solution'
  const [solutionUnlocked, setSolutionUnlocked] = useState(false)
  const [showSolutionModal, setShowSolutionModal] = useState(false)
  const [loadingExpectedOutput, setLoadingExpectedOutput] = useState(false)
  
  // Interactive Shell States
  const [shellCounter, setShellCounter] = useState(1)
  const [shellCommands, setShellCommands] = useState([])
  const [shellInputValue, setShellInputValue] = useState('')
  const [shellHistory, setShellHistory] = useState([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [isShellRunning, setIsShellRunning] = useState(false)
  const [shellVars, setShellVars] = useState({})
  const [shellTab, setShellTab] = useState('console')
  const [editorRunCode, setEditorRunCode] = useState('')
  const [sessionHistory, setSessionHistory] = useState([])

  const terminalEndRef = useRef(null)
  const shellInputRef = useRef(null)
  const codeRef = useRef(code)
  const handleRunRef = useRef(handleRun)
  const handleSubmitRef = useRef(handleSubmit)
  const activeFileRef = useRef(activeFile)

  // Resizable Terminal States & Logic
  const [terminalHeight, setTerminalHeight] = useState(250)
  const isResizingRef = useRef(false)
  const rightPanelRef = useRef(null)

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

  // Auto-scroll IPython shell to bottom & maintain input focus
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
    if (!isShellRunning && shellInputRef.current) {
      shellInputRef.current.focus()
    }
  }, [terminalLines, isShellRunning, currentIndex])

  const fetchInitialShellVars = async (challenge) => {
    if (!challenge) return;
    try {
      const res = await fetch('/api/content/run-shell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseSlug,
          datasetFile: challenge.dataset_file,
          history: [],
          command: '' // empty command to load variables silently
        })
      })
      const data = await res.json()
      if (data.success && data.vars) {
        setShellVars(data.vars)
      }
    } catch (err) {
      console.error('Failed to load initial shell variables:', err)
    }
  }

  const fetchExpectedOutput = async (challenge, index) => {
    if (!challenge) return
    if (challenge.expected_output) return // already has it

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
          code: expectedCode,
          courseSlug,
          datasetFile: challenge.dataset_file
        })
      })
      const data = await res.json()
      if (data.success) {
        setChallenges(prev => {
          const updated = [...prev]
          if (updated[index]) {
            updated[index] = {
              ...updated[index],
              expected_output: data.output
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
              expected_output: `Error generating expected output:\n${data.error}`
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
      const currentChallenge = challenges[currentIndex]
      fetchInitialShellVars(currentChallenge)
      fetchExpectedOutput(currentChallenge, currentIndex)
      setShellCommands([])
      setTerminalLines([])
      setShellCounter(1)
      setEditorRunCode('')
      setSessionHistory([])
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

      if (challengesData.length > 0) {
        setChallenges(challengesData)
        setCode(challengesData[0].starter_code)
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

  async function handleRun() {
    if (isRunning || isSubmitting) return
    setIsRunning(true)
    const challenge = challenges[currentIndex]
    const runCode = activeFile === 'solution' ? (challenge?.solution_code || challenge?.expected_output_code || '') : code

    setTerminalLines(prev => [
      ...prev,
      { type: 'input', text: runCode, counter: runCounter }
    ])

    try {
      const res = await fetch('/api/content/run-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: runCode,
          courseSlug,
          datasetFile: challenge.dataset_file
        })
      })
      const data = await res.json()
      
      setTerminalLines(prev => [
        ...prev,
        { type: data.success ? 'output' : 'error', text: data.success ? data.output : data.error }
      ])

      if (data.success) {
        setEditorRunCode(runCode)
        setShellCommands([])
        setSessionHistory(prev => [...prev, runCode])
        if (data.vars) {
          setShellVars(data.vars)
        }
      }
    } catch (err) {
      setTerminalLines(prev => [
        ...prev,
        { type: 'error', text: 'Connection failed or server error.' }
      ])
    } finally {
      setRunCounter(prev => prev + 1)
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
        setResult({ passed: false, feedback: data.error, error: true })
      }
    } catch (err) {
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

  const handleShowSolution = () => {
    setShowSolutionModal(true)
  }

  const handleNext = () => {
    if (currentIndex < challenges.length - 1) {
      setCurrentIndex(prev => prev + 1)
      setCode(challenges[currentIndex + 1].starter_code)
      setResult(null)
      setTerminalLines([])
      setRunCounter(1)
      setHintsShown([false, false])
      
      // Reset interactive shell
      setShellCounter(1)
      setShellCommands([])
      setShellInputValue('')
      setShellHistory([])
      setHistoryIndex(-1)
      setEditorRunCode('')
      setSessionHistory([])

      // Reset solution state
      setSolutionUnlocked(false)
      setActiveFile('script')
    } else {
      setCurrentIndex(challenges.length) // End state
    }
  }

  const handleReset = () => {
    setCode(challenges[currentIndex].starter_code)
    setTerminalLines([])
    setRunCounter(1)
    setResult(null)
    
    // Reset interactive shell
    setShellCounter(1)
    setShellCommands([])
    setShellInputValue('')
    setShellHistory([])
    setHistoryIndex(-1)
    setEditorRunCode('')
    setSessionHistory([])

    setActiveFile('script')
  }

  const handleShellSubmit = async () => {
    const cmd = shellInputValue.trim()
    if (!cmd || isShellRunning) return

    setShellInputValue('')
    setHistoryIndex(-1)

    setTerminalLines(prev => [
      ...prev,
      { type: 'input', text: cmd, counter: shellCounter }
    ])

    setShellHistory(prev => [cmd, ...prev])
    setIsShellRunning(true)

    try {
      const challenge = challenges[currentIndex]
      const res = await fetch('/api/content/run-shell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseSlug,
          datasetFile: challenge.dataset_file,
          history: editorRunCode ? [editorRunCode, ...shellCommands] : shellCommands,
          command: cmd
        })
      })
      const data = await res.json()

      if (data.success) {
        setTerminalLines(prev => [
          ...prev,
          { type: 'output', text: data.output }
        ])
        setShellCommands(prev => [...prev, cmd])
        setSessionHistory(prev => [...prev, cmd])
      } else {
        setTerminalLines(prev => [
          ...prev,
          { type: 'error', text: data.error }
        ])
      }
      if (data.vars) {
        setShellVars(data.vars)
      }
    } catch (err) {
      setTerminalLines(prev => [
        ...prev,
        { type: 'error', text: 'Connection failed or server error.' }
      ])
    } finally {
      setShellCounter(prev => prev + 1)
      setIsShellRunning(false)
    }
  }

  const handleShellKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleShellSubmit()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (shellHistory.length > 0 && historyIndex < shellHistory.length - 1) {
        const nextIndex = historyIndex + 1
        setHistoryIndex(nextIndex)
        setShellInputValue(shellHistory[nextIndex])
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (historyIndex > 0) {
        const nextIndex = historyIndex - 1
        setHistoryIndex(nextIndex)
        setShellInputValue(shellHistory[nextIndex])
      } else if (historyIndex === 0) {
        setHistoryIndex(-1)
        setShellInputValue('')
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
    setTerminalLines([]);
    setRunCounter(1);
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
          <div className="font-bold text-sm">Challenge {currentIndex + 1} of {challenges.length}</div>
        </div>
        
        <div className="w-20"></div> {/* Spacer */}
      </header>

      {/* Main Panel Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT PANEL */}
        <div className="w-[38%] h-full border-r border-[var(--border)] flex flex-col bg-[var(--bg-primary)] overflow-y-auto">
          <div className="p-6">
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
            {challenge.description}
          </div>

          <div className="bg-yellow-500/10 border-l-4 border-yellow-500 p-4 rounded-r-lg mb-8">
            <h4 className="text-sm font-bold text-yellow-500 uppercase tracking-wider mb-2">Variable Names</h4>
            <p className="text-sm text-yellow-500/80">
              Ensure you use the exact variable names requested in the description so the tests can verify your code!
            </p>
          </div>

          <div className="space-y-3 mb-8">
            {challenge.hints.map((hint, idx) => (
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
      </div>

      {/* RIGHT PANEL */}
      <div ref={rightPanelRef} className="w-[62%] h-full flex flex-col bg-[#1e1e1e]">
        {/* Editor Section */}
        <div className="flex flex-col min-h-[200px] flex-1 overflow-hidden">
          <div className="bg-[#1f2029] px-4 py-2 border-b border-[#3c3c3c] text-sm text-[#cccccc] font-mono flex items-center justify-between shrink-0 border-t-2 border-[var(--accent-blue)] border-box min-h-[48px]">
             <div className="flex items-center gap-2 flex-wrap">
               <button 
                 onClick={handleRun}
                 disabled={isRunning || isSubmitting || activeFile === 'expected_output'}
                 className="bg-[var(--accent-blue)] hover:bg-[var(--accent-blue)]/80 text-white px-4 py-1.5 rounded font-bold text-xs transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-lg shadow-[var(--accent-blue)]/20 cursor-pointer"
               >
                 {isRunning ? 'Running...' : '▶ Run Code'}
               </button>
               <button 
                 onClick={handleReset}
                 disabled={isRunning || isSubmitting || activeFile === 'solution' || activeFile === 'expected_output'}
                 className="bg-transparent border border-[var(--border)] hover:border-[var(--accent-red)] hover:text-[var(--accent-red)] hover:bg-[var(--accent-red)]/10 px-4 py-1.5 rounded font-bold text-xs transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
               >
                 <RotateCcw size={12} /> Reset
               </button>
               <button 
                 onClick={handleSubmit}
                 disabled={isRunning || isSubmitting || activeFile === 'expected_output'}
                 className="bg-[var(--accent-green)] hover:bg-[var(--accent-green)]/80 text-black px-4 py-1.5 rounded font-bold text-xs transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-lg shadow-[var(--accent-green)]/20 cursor-pointer"
               >
                 {isSubmitting ? 'Checking...' : '✓ Submit'}
               </button>
               <button 
                 onClick={handleSkip}
                 disabled={isRunning || isSubmitting}
                 className="bg-zinc-800 hover:bg-zinc-700 hover:text-white text-zinc-300 border border-[var(--border)] px-4 py-1.5 rounded font-bold text-xs transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
               >
                 <SkipForward size={12} /> Skip
               </button>
               <button 
                 onClick={() => setActiveFile(activeFile === 'expected_output' ? 'script' : 'expected_output')}
                 disabled={isRunning || isSubmitting}
                 className={`border px-4 py-1.5 rounded font-bold text-xs transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer ${
                   activeFile === 'expected_output'
                     ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/20'
                     : 'bg-transparent border-zinc-700 hover:border-zinc-500 text-zinc-300'
                 }`}
               >
                 👁 Expected Output
               </button>
               {!solutionUnlocked && (
                 <button 
                   onClick={handleShowSolution}
                   disabled={isRunning || isSubmitting}
                   className="bg-transparent border border-amber-500/40 hover:border-amber-400 hover:bg-amber-500/10 text-amber-400 hover:text-amber-300 px-4 py-1.5 rounded font-bold text-xs transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                 >
                   ✨ Show Solution
                 </button>
               )}
             </div>
             <div className="flex items-center gap-1.5 select-none font-mono text-xs">
               <button
                 type="button"
                 onClick={() => setActiveFile('script')}
                 className={`px-3 py-1 rounded transition-colors flex items-center gap-1.5 cursor-pointer font-bold ${
                   activeFile === 'script'
                     ? 'bg-zinc-800 text-white border border-zinc-700'
                     : 'text-zinc-400 hover:text-white'
                 }`}
               >
                 <span className="text-yellow-500">🐍</span> script.py
               </button>
               <button
                 type="button"
                 onClick={() => setActiveFile('expected_output')}
                 className={`px-3 py-1 rounded transition-colors flex items-center gap-1.5 cursor-pointer font-bold ${
                   activeFile === 'expected_output'
                     ? 'bg-zinc-800 text-[var(--accent-blue)] border border-zinc-700'
                     : 'text-zinc-400 hover:text-white'
                 }`}
               >
                 <span className="text-blue-400">👁</span> expected_output.txt
               </button>
               {solutionUnlocked && (
                 <button
                   type="button"
                   onClick={() => setActiveFile('solution')}
                   className={`px-3 py-1 rounded transition-colors flex items-center gap-1.5 cursor-pointer font-bold ${
                     activeFile === 'solution'
                       ? 'bg-zinc-800 text-[var(--accent-yellow)] border border-zinc-700'
                       : 'text-zinc-400 hover:text-white'
                   }`}
                 >
                   <span className="text-[var(--accent-yellow)]">✨</span> solution.py
                 </button>
               )}
             </div>
          </div>
          <div className="grow relative">
            <div className="absolute inset-0">
              {activeFile === 'script' && (
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
                    padding: { top: 16 },
                    scrollBeyondLastLine: false,
                    wordWrap: 'on',
                    readOnly: false
                  }}
                />
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
        <div 
          className="h-1.5 bg-[var(--border)] hover:bg-[var(--accent-blue)] cursor-row-resize transition-colors select-none shrink-0"
          onMouseDown={handleMouseDown}
        />

        {/* Terminal Section */}
        <div 
          className="flex flex-col bg-black overflow-hidden shrink-0 animate-in fade-in duration-300" 
          style={{ height: `${terminalHeight}px` }}
        >
          {/* Advanced Tabbed Header */}
          <div className="bg-[#1a1b23] px-4 border-b border-[var(--border)] flex items-center justify-between text-xs font-mono shrink-0 border-t-2 border-[var(--accent-green)] select-none">
            {/* Tabs */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShellTab('console')}
                className={`px-3 py-2.5 font-bold transition-all flex items-center gap-1.5 border-b-2 bg-transparent cursor-pointer ${
                  shellTab === 'console'
                    ? 'border-[var(--accent-green)] text-[var(--accent-green)]'
                    : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                <TerminalIcon size={14} /> Console
              </button>
              
              <button
                type="button"
                onClick={() => setShellTab('variables')}
                className={`px-3 py-2.5 font-bold transition-all flex items-center gap-1.5 border-b-2 bg-transparent cursor-pointer ${
                  shellTab === 'variables'
                    ? 'border-[var(--accent-green)] text-[var(--accent-green)]'
                    : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Database size={14} /> Variables
                {Object.keys(shellVars).length > 0 && (
                  <span className="bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded-full text-[9px] font-bold font-mono">
                    {Object.keys(shellVars).length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setShellTab('history')}
                className={`px-3 py-2.5 font-bold transition-all flex items-center gap-1.5 border-b-2 bg-transparent cursor-pointer ${
                  shellTab === 'history'
                    ? 'border-[var(--accent-green)] text-[var(--accent-green)]'
                    : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                <History size={14} /> History
                {shellCommands.length > 0 && (
                  <span className="bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded-full text-[9px] font-bold font-mono">
                    {shellCommands.length}
                  </span>
                )}
              </button>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-1.5 py-1">
              <button
                type="button"
                onClick={() => setTerminalLines([])}
                title="Clear Terminal Output"
                className="p-1.5 rounded bg-zinc-900/60 hover:bg-zinc-800 border border-[var(--border)]/40 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
              >
                <Eraser size={14} />
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setShellCommands([])
                  setTerminalLines([])
                  setShellCounter(1)
                  setShellVars({})
                  if (challenges.length > 0 && currentIndex < challenges.length) {
                    fetchInitialShellVars(challenges[currentIndex])
                  }
                }}
                title="Reset Python Environment"
                className="p-1.5 rounded bg-zinc-900/60 hover:bg-zinc-800 border border-[var(--border)]/40 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
              >
                <RotateCcw size={14} />
              </button>
            </div>
          </div>

          {/* Console Tab */}
          {shellTab === 'console' && (
            <div 
              onClick={() => {
                if (shellInputRef.current) {
                  shellInputRef.current.focus()
                }
              }}
              className="grow overflow-y-auto p-4 font-mono text-base cursor-text text-left"
            >
               <div className="text-gray-500 mb-2">Python 3.10.x (default, DC Mastery Hub)</div>
               {terminalLines.length === 0 && (
                 <div className="text-zinc-600 italic text-sm mb-2 select-none">(console cleared. type command to begin)</div>
               )}
               {terminalLines.map((line, i) => (
                 <div key={i} className="mb-2">
                   {line.type === 'input' && (
                     <div className="text-blue-400">
                       <span className="text-green-500 mr-2">In [{line.counter}]:</span>
                       <span className="text-gray-300">{line.text}</span>
                     </div>
                   )}
                   {line.type === 'output' && (
                     <div className="text-white mt-1 whitespace-pre-wrap">{line.text || '(no output)'}</div>
                   )}
                   {line.type === 'error' && (
                     <div className="text-red-400 mt-1 whitespace-pre-wrap">{line.text}</div>
                   )}
                 </div>
               ))}
               
               {isShellRunning ? (
                  <div className="text-blue-400 mt-2 flex items-center gap-2 animate-in fade-in">
                    <span className="text-green-500">In [{shellCounter}]:</span>
                    <span className="text-gray-500 animate-pulse text-base">Running command...</span>
                  </div>
               ) : (
                  <div className="text-blue-400 mt-2 flex items-center">
                    <span className="text-green-500 shrink-0">In [{shellCounter}]:</span>
                    <input
                      ref={shellInputRef}
                      type="text"
                      value={shellInputValue}
                      onChange={(e) => setShellInputValue(e.target.value)}
                      onKeyDown={handleShellKeyDown}
                      disabled={isRunning || isSubmitting}
                      className="grow bg-transparent text-gray-300 outline-none border-none font-mono ml-2 p-0 focus:ring-0 text-base"
                      placeholder="type python code here..."
                    />
                  </div>
               )}
               <div ref={terminalEndRef} />
            </div>
          )}

          {/* Variables Tab */}
          {shellTab === 'variables' && (
            <div className="grow overflow-y-auto p-5 font-mono text-left">
              {Object.keys(shellVars).length === 0 ? (
                <div className="text-zinc-500 text-xs italic flex flex-col items-center justify-center h-full gap-2">
                  <Database size={24} className="opacity-40" />
                  <span>No variables defined in this session yet.</span>
                </div>
              ) : (
                <div className="border border-[var(--border)] rounded-lg overflow-hidden bg-[var(--bg-primary)] text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-zinc-900 border-b border-[var(--border)] text-[var(--text-muted)]">
                        <th className="p-3 font-bold uppercase tracking-wider">Name</th>
                        <th className="p-3 font-bold uppercase tracking-wider">Type</th>
                        <th className="p-3 font-bold uppercase tracking-wider">Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {Object.entries(shellVars).map(([name, { type, value }]) => (
                        <tr key={name} className="hover:bg-zinc-800/25 transition-colors font-mono">
                          <td className="p-3 text-[var(--accent-green)] font-bold">{name}</td>
                          <td className="p-3 text-[var(--accent-blue)] font-bold">{type}</td>
                          <td className="p-3 text-zinc-300 max-w-xs truncate" title={value}>{value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* History Tab */}
          {shellTab === 'history' && (
            <div className="grow overflow-y-auto p-5 font-mono text-left">
              {sessionHistory.length === 0 ? (
                <div className="text-zinc-500 text-xs italic flex flex-col items-center justify-center h-full gap-2">
                  <History size={24} className="opacity-40" />
                  <span>No commands executed in this session yet.</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider mb-3 select-none">
                    Session Command History (Click to load into console)
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {sessionHistory.map((cmd, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setShellInputValue(cmd)
                          setShellTab('console')
                          setTimeout(() => {
                            if (shellInputRef.current) shellInputRef.current.focus()
                          }, 50)
                        }}
                        className="w-full text-left p-2.5 rounded-lg border border-[var(--border)] bg-zinc-950/40 hover:border-zinc-500 text-xs text-zinc-300 font-mono transition-all hover:bg-zinc-900 flex items-start gap-2.5 group cursor-pointer"
                      >
                        <span className="text-zinc-600 font-bold shrink-0">{idx + 1}</span>
                        <span className="grow whitespace-pre-wrap select-all">{cmd}</span>
                        <span className="text-[10px] text-[var(--accent-green)] opacity-0 group-hover:opacity-100 font-bold shrink-0">
                          Load ↵
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      </div>

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
              Challenge ID: {challenge?.id} | Run Counter: {runCounter}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}